import { db } from '../history/db';
import { genId } from '../../utils/id';
import {
    getReceiverFields,
    MediaKind,
    walkMediaFields,
} from '../../utils/mediaFields';

export type MediaRow = {
    id: string; // stable row id
    field: string; // top-level form field
    index?: number; // original entry index (informational)
    key: string; // media key inside the entry ('image'/'video'/'audio'); '' for single
    filename: string;
    kind: MediaKind;
    entry?: any; // full array entry object (non-media params live here)
    file?: File; // local copy
    error?: string; // message when the file could not be collected
    included: boolean;
};

export type ParamRow = {
    field: string;
    value: any;
    included: boolean;
};

export type PresetDraft = {
    presetId?: string; // set in edit mode
    name: string;
    tab: string;
    media: MediaRow[];
    params: ParamRow[];
};

// Builds the preset values object from the draft: params from rows,
// media rebuilt from included rows (array entries / single filenames).
export const buildPresetValues = (draft: PresetDraft): any => {
    const values: any = {};
    for (const p of draft.params) {
        if (p.included) {
            values[p.field] = p.value;
        }
    }
    const fields = [...new Set(draft.media.map((m) => m.field))];
    for (const field of fields) {
        const group = draft.media.filter((m) => m.field === field);
        const included = group.filter((m) => m.included);
        if (!included.length) {
            continue;
        }
        if (group.some((m) => m.index === undefined)) {
            // single string field: at most one row
            values[field] = included[0].filename;
        } else {
            values[field] = included.map((m) => ({
                ...m.entry,
                [m.key]: m.filename,
            }));
        }
    }
    return values;
};

export const savePresetDraft = async (draft: PresetDraft): Promise<string> => {
    const id = draft.presetId ?? genId();
    const values = buildPresetValues(draft);
    const files = draft.media.filter((m) => m.included && m.file);
    const keep = new Set(files.map((f) => f.filename));
    await db.transaction('rw', db.presets, db.presetFiles, async () => {
        await db.presets.put({
            id,
            name: draft.name,
            tab: draft.tab,
            values: JSON.stringify(values),
            timestamp: Date.now(),
        });
        const old = await db.presetFiles.where({ preset: id }).toArray();
        const stale = old.filter((f) => !keep.has(f.filename));
        if (stale.length) {
            await db.presetFiles.bulkDelete(stale.map((f) => f.id));
        }
        if (files.length) {
            await db.presetFiles.bulkPut(
                files.map((f) => ({
                    id: `${id}/${f.filename}`,
                    preset: id,
                    filename: f.filename,
                    file: f.file!,
                })),
            );
        }
    });
    return id;
};

export const draftFromPreset = async (
    preset: {
        id: string;
        name: string;
        tab: string;
        values: string;
    },
    receivers?: { [tab: string]: Array<{ name: string }> },
): Promise<PresetDraft> => {
    const values = JSON.parse(preset.values);
    const files = await db.presetFiles
        .where({ preset: preset.id })
        .toArray();
    const filesMap = new Map(files.map((f) => [f.filename, f]));
    const refs = walkMediaFields(values);
    const receiverFields = getReceiverFields(receivers, preset.tab);
    const media: MediaRow[] = refs.map((ref) => {
        const stored = filesMap.get(ref.filename);
        return {
            id: genId(),
            field: ref.field,
            index: ref.index,
            key: ref.key,
            filename: ref.filename,
            kind: ref.kind,
            entry:
                ref.index !== undefined
                    ? values[ref.field][ref.index]
                    : undefined,
            file: stored?.file,
            error: stored?.file ? undefined : 'no_local_copy',
            included: true,
        };
    });
    const mediaFields = new Set([
        ...refs.map((r) => r.field),
        ...Object.keys(values).filter((f) => receiverFields.has(f)),
    ]);
    const params: ParamRow[] = Object.keys(values)
        .filter((f) => !mediaFields.has(f))
        // empty arrays carry nothing
        .filter((f) => !Array.isArray(values[f]) || values[f].length > 0)
        .map((f) => ({ field: f, value: values[f], included: true }));
    return {
        presetId: preset.id,
        name: preset.name,
        tab: preset.tab,
        media,
        params,
    };
};

export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) {
        return bytes + ' B';
    }
    const units = ['KB', 'MB', 'GB'];
    let value = bytes;
    let unit = -1;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    return value.toFixed(value >= 10 || unit === 0 ? 0 : 1) + ' ' + units[unit];
};

// Default preset name: base name of the first media file
// (timestamp prefix and extension stripped)
export const defaultPresetName = (
    media: MediaRow[],
    fallback: string,
): string => {
    const first = media.find((m) => m.filename);
    if (!first) {
        return fallback;
    }
    const base = first.filename
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/^\d+[_-]?/, '');
    return base || fallback;
};
