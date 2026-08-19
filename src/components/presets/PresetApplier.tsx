import { Box, Button } from '@mui/material';
import { get } from 'lodash';
import { useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { actionEnum, setParams } from '../../redux/tab';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { useApiURL } from '../../hooks/useApiURL';
import { useTabName } from '../contexts/TabContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';
import { db, Preset } from '../history/db';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { fileOnServer, uploadFile } from '../../api/files';
import {
    getReceiverFields,
    MediaRef,
    walkMediaFields,
} from '../../utils/mediaFields';
import { useTranslate } from '../../i18n/I18nContext';
import { filterFormValues } from '../../utils/filterFormValues';
import { useFormContext } from 'react-hook-form';

// Object.keys(null) crashes in the restore path; strip null/undefined fields
const stripNulls = (obj: any): any => {
    for (const k of Object.keys(obj || {})) {
        if (obj[k] === null || obj[k] === undefined) {
            delete obj[k];
        }
    }
    return obj;
};

// Applies a preset to the current tab form once the form is initialized.
// Media arrays are appended (deduped by filename), dropping empty slots;
// LoRA arrays are merged by id; other fields overwrite.

// LoRA fields (LoraInput) hold arrays of { id, label, strength, merge };
// the id is the full model path and the merge key.
const isLoraEntry = (e: any): boolean =>
    !!e &&
    typeof e === 'object' &&
    !Array.isArray(e) &&
    typeof e.id === 'string' &&
    e.id.endsWith('.safetensors');

const isLoraArray = (v: any): boolean =>
    Array.isArray(v) && v.length > 0 && v.every(isLoraEntry);

// Keeps the existing order: a preset entry with a matching id replaces
// the existing entry in place, the remaining preset entries are appended.
const mergeLoras = (existing: any[], preset: any[]): any[] => {
    const presetById = new Map(preset.map((l) => [l.id, l]));
    const used = new Set<string>();
    const merged = existing.map((l) => {
        const p = presetById.get(l?.id);
        if (p) {
            used.add(l.id);
            return p;
        }
        return l;
    });
    preset.forEach((p) => {
        if (!used.has(p.id)) {
            merged.push(p);
        }
    });
    return merged;
};

const PresetApplier = ({ formInitialized }: { formInitialized: boolean }) => {
    const { action, tab, presetId } = useAppSelector((s) => s.tab.params);
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null),
    );
    const dispatch = useAppDispatch();
    const apiUrl = useApiURL();
    const { receivers } = useContext(WorkflowTabsContext);
    const { getValues } = useFormContext();
    const restoreValues = useRestoreValues();
    const tr = useTranslate();

    useEffect(() => {
        if (
            !formInitialized ||
            action !== actionEnum.APPLY_PRESET ||
            tab !== tab_name ||
            !presetId ||
            !apiUrl
        ) {
            return;
        }
        let cancelled = false;
        (async () => {
            const preset: Preset | undefined = await db.presets.get(presetId);
            if (!preset || cancelled) {
                dispatch(setParams({}));
                return;
            }
            const values = JSON.parse(preset.values);
            const files = await db.presetFiles
                .where({ preset: preset.id })
                .toArray();
            const filesMap = new Map(files.map((f) => [f.filename, f.file]));
            const snapshot = stripNulls(filterFormValues(getValues()));
            const refs = walkMediaFields(values);
            // resolve files: reuse if still on the server, re-upload the
            // local copy otherwise
            const resolved: { [old: string]: string } = {};
            const lost: MediaRef[] = [];
            for (const ref of refs) {
                const local = filesMap.get(ref.filename);
                if (await fileOnServer(ref.filename, apiUrl)) {
                    resolved[ref.filename] = ref.filename;
                    continue;
                }
                if (local) {
                    try {
                        resolved[ref.filename] = await uploadFile(local, apiUrl);
                        continue;
                    } catch {
                        // fall through to lost
                    }
                }
                lost.push(ref);
            }
            if (cancelled) {
                return;
            }
            if (lost.length) {
                toast.error(
                    tr('presets.file_lost', {
                        files: lost.map((r) => r.filename).join(', '),
                    }),
                );
            }
            const merged: any = {};
            // structurally known media fields (WFTab receivers) count as
            // media even when empty, so an old preset with "ref_videos": []
            // does not wipe the current field
            const mediaFields = new Set([
                ...refs.map((r) => r.field),
                ...getReceiverFields(receivers, tab_name),
            ]);
            for (const field of Object.keys(values)) {
                if (!mediaFields.has(field)) {
                    const v = values[field];
                    // an empty array would wipe the field; skip it
                    if (Array.isArray(v) && !v.length) {
                        continue;
                    }
                    if (isLoraArray(v)) {
                        merged[field] = mergeLoras(
                            getValues(field) || [],
                            v,
                        );
                        continue;
                    }
                    merged[field] = v;
                    continue;
                }
                if (typeof values[field] === 'string') {
                    const nw = resolved[values[field]];
                    if (nw) {
                        merged[field] = nw;
                    }
                    continue;
                }
                // array field: append, deduped by filename, capped
                const key = refs.find((r) => r.field === field)?.key ?? 'image';
                const allExisting: any[] = getValues(field) || [];
                const existingNames = new Set(
                    allExisting
                        .map((e) => (e ? e[key] : ''))
                        .filter(Boolean),
                );
                const seen = new Set();
                const incoming: any[] = [];
                for (const e of values[field] || []) {
                    const nw = resolved[e[key]];
                    if (!nw || existingNames.has(nw) || seen.has(nw)) {
                        continue;
                    }
                    seen.add(nw);
                    incoming.push({ ...e, [key]: nw });
                }
                // when the preset brings media into the field, empty slots
                // (entries without a file) are dropped so they don't eat the
                // slot cap and block the preset's files
                const existing = incoming.length
                    ? allExisting.filter((e) => e && e[key])
                    : allExisting;
                const max = api?.controls?.[field]?.max;
                const room =
                    typeof max === 'number'
                        ? Math.max(0, max - existing.length)
                        : Infinity;
                const toAppend =
                    room === Infinity
                        ? incoming
                        : incoming.slice(0, room);
                if (toAppend.length < incoming.length) {
                    toast(
                        tr('presets.overflow', {
                            n: incoming.length - toAppend.length,
                            field: field,
                        }),
                    );
                }
                merged[field] = [...existing, ...toAppend];
            }
            restoreValues('', stripNulls(merged));
            // rename the preset to the re-uploaded filenames so repeated
            // applies do not duplicate files on the server
            const renames: { [old: string]: string } = {};
            for (const [old, nw] of Object.entries(resolved)) {
                if (old !== nw) {
                    renames[old] = nw;
                }
            }
            if (Object.keys(renames).length) {
                const renameIn = (v: any): any => {
                    if (typeof v === 'string') {
                        return renames[v] ?? v;
                    }
                    if (Array.isArray(v)) {
                        return v.map(renameIn);
                    }
                    if (v && typeof v === 'object') {
                        return Object.fromEntries(
                            Object.entries(v).map(([k, val]) => [
                                k,
                                renameIn(val),
                            ]),
                        );
                    }
                    return v;
                };
                await db.transaction(
                    'rw',
                    db.presets,
                    db.presetFiles,
                    async () => {
                        await db.presets.put({
                            ...preset,
                            values: JSON.stringify(renameIn(values)),
                            timestamp: Date.now(),
                        });
                        const all = await db.presetFiles
                            .where({ preset: preset.id })
                            .toArray();
                        for (const f of all) {
                            if (renames[f.filename]) {
                                await db.presetFiles.delete(f.id);
                                await db.presetFiles.put({
                                    ...f,
                                    id: `${preset.id}/${renames[f.filename]}`,
                                    filename: renames[f.filename],
                                });
                            }
                        }
                    },
                );
            }
            dispatch(setParams({}));
            toast.success((t) => (
                <Box display='flex' alignItems='center' gap={1}>
                    <span>{tr('presets.applied')}</span>
                    <Button
                        size='small'
                        onClick={() => {
                            restoreValues('', snapshot);
                            toast.dismiss(t.id);
                        }}
                    >
                        {tr('presets.undo')}
                    </Button>
                </Box>
            ));
        })();
        return () => {
            cancelled = true;
        };
    }, [
        formInitialized,
        action,
        tab,
        tab_name,
        presetId,
        apiUrl,
        api,
        dispatch,
        getValues,
        restoreValues,
        tr,
        receivers,
    ]);

    return null;
};

export { PresetApplier };
