// Shared logic for restoring a stored "snapshot" (values + media files) into
// a tab form. Used by both presets (merge on top of the current form) and
// sessions (reset the form first, which turns the merge into a replace).
// Kept free of React so it stays testable.
import { Table } from 'dexie';
import toast from 'react-hot-toast';
import { fileOnServer, ensureFileOnServer } from '../api/files';
import { saveUploadBackup } from '../hooks/useBackupUpload';
import { db } from '../components/history/db';
import { MediaRef, walkMediaFields } from './mediaFields';

// Object.keys(null) crashes in the restore path; strip null/undefined fields
export const stripNulls = (obj: any): any => {
    for (const k of Object.keys(obj || {})) {
        if (obj[k] === null || obj[k] === undefined) {
            delete obj[k];
        }
    }
    return obj;
};

// LoRA fields (LoraInput) hold arrays of { id, label, strength, merge };
// the id is the full model path and the merge key.
export const isLoraEntry = (e: any): boolean =>
    !!e &&
    typeof e === 'object' &&
    !Array.isArray(e) &&
    typeof e.id === 'string' &&
    e.id.endsWith('.safetensors');

export const isLoraArray = (v: any): boolean =>
    Array.isArray(v) && v.length > 0 && v.every(isLoraEntry);

// Keeps the existing order: an entry with a matching id replaces the existing
// entry in place, the remaining entries are appended.
export const mergeLoras = (existing: any[], incoming: any[]): any[] => {
    const incomingById = new Map(incoming.map((l) => [l.id, l]));
    const used = new Set<string>();
    const merged = existing.map((l) => {
        const p = incomingById.get(l?.id);
        if (p) {
            used.add(l.id);
            return p;
        }
        return l;
    });
    incoming.forEach((p) => {
        if (!used.has(p.id)) {
            merged.push(p);
        }
    });
    return merged;
};

// Resolve the stored record's media against the server: reuse a filename that
// is still on the server, otherwise re-upload the local backup.
export const resolveMedia = async (
    values: any,
    filesMap: Map<string, File>,
    apiUrl: string,
): Promise<{ resolved: { [old: string]: string }; lost: MediaRef[]; refs: MediaRef[] }> => {
    const refs = walkMediaFields(values);
    const resolved: { [old: string]: string } = {};
    const lost: MediaRef[] = [];
    for (const ref of refs) {
        const local = filesMap.get(ref.filename);
        if (!local) {
            // no local backup: the only source is the server
            if (await fileOnServer(ref.filename, apiUrl)) {
                resolved[ref.filename] = ref.filename;
            } else {
                lost.push(ref);
            }
            continue;
        }
        try {
            resolved[ref.filename] = await ensureFileOnServer(local, ref.filename, apiUrl);
        } catch {
            lost.push(ref);
        }
    }
    return { resolved, lost, refs };
};

// Build the form values to restore: non-media fields overwrite (empty arrays
// skipped), LoRA arrays merged by id, media fields rebuilt from resolved names
// (append/dedupe for arrays). After a form reset (session restore) getValues
// is empty, so this degenerates to a plain replace.
export const buildMerged = (
    values: any,
    refs: MediaRef[],
    getValues: (name?: any) => any,
    resolved: { [old: string]: string },
    mediaFields: Set<string>,
    api: any,
    tr: (key: string, i18nOptions?: any) => string,
    prefix: string,
): any => {
    const merged: any = {};
    for (const field of Object.keys(values)) {
        if (!mediaFields.has(field)) {
            const v = values[field];
            // an empty array would wipe the field; skip it
            if (Array.isArray(v) && !v.length) {
                continue;
            }
            if (isLoraArray(v)) {
                merged[field] = mergeLoras(getValues(field) || [], v);
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
        if (!Array.isArray(values[field])) {
            // Compound media field (e.g. I2IToggle's 'i2i' object): its filename
            // is nested, so no top-level ref is produced and there is nothing to
            // resolve — carry the stored value through.
            merged[field] = values[field];
            continue;
        }
        // array field: append, deduped by filename, capped
        const key = refs.find((r) => r.field === field)?.key ?? 'image';
        const allExisting: any[] = getValues(field) || [];
        const existingNames = new Set(
            allExisting.map((e) => (e ? e[key] : '')).filter(Boolean),
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
        // when the record brings media into the field, empty slots (entries
        // without a file) are dropped so they don't eat the slot cap
        const existing = incoming.length
            ? allExisting.filter((e) => e && e[key])
            : allExisting;
        const max = api?.controls?.[field]?.max;
        const room =
            typeof max === 'number'
                ? Math.max(0, max - existing.length)
                : Infinity;
        const toAppend =
            room === Infinity ? incoming : incoming.slice(0, room);
        if (toAppend.length < incoming.length) {
            toast(
                tr(`${prefix}.overflow`, {
                    n: incoming.length - toAppend.length,
                    field: field,
                }),
            );
        }
        merged[field] = [...existing, ...toAppend];
    }
    return merged;
};

// Refresh the per-field upload backups so FileUpload auto-recovery restores
// the record's files at their final positions. Keys: `field` for a
// single-file field and `field.<index>.<key>` for an array entry.
export const refreshUploadBackups = async (
    merged: any,
    refs: MediaRef[],
    resolved: { [old: string]: string },
    filesMap: Map<string, File>,
    mediaFields: Set<string>,
    tabName: string,
): Promise<void> => {
    const newNameToFile = new Map<string, File>();
    for (const ref of refs) {
        const nw = resolved[ref.filename];
        const local = filesMap.get(ref.filename);
        if (nw && local) {
            newNameToFile.set(nw, local);
        }
    }
    for (const field of Object.keys(merged)) {
        const v = merged[field];
        if (typeof v === 'string') {
            const f = newNameToFile.get(v);
            if (f) {
                await saveUploadBackup(f, field, tabName);
            }
            continue;
        }
        if (Array.isArray(v) && mediaFields.has(field)) {
            const key = refs.find((r) => r.field === field)?.key ?? 'image';
            for (let i = 0; i < v.length; i++) {
                const e = v[i];
                if (!e) {
                    continue;
                }
                const f = newNameToFile.get(e[key]);
                if (f) {
                    await saveUploadBackup(
                        f,
                        `${field}.${i}.${key}`,
                        tabName,
                    );
                }
            }
        }
    }
};

export type SnapshotStore = {
    record: Table<any, string>;
    files: Table<any, string>;
    fk: string; // foreign-key field name in the files table ('preset' | 'session')
};

// Rename the stored record to the re-uploaded filenames so repeated applies
// do not duplicate files on the server. Updates the record's values and the
// files table (id + filename).
export const renameStoredRecord = async (
    store: SnapshotStore,
    recordId: string,
    values: any,
    resolved: { [old: string]: string },
    updateTimestamp: boolean,
): Promise<void> => {
    const renames: { [old: string]: string } = {};
    for (const [old, nw] of Object.entries(resolved)) {
        if (old !== nw) {
            renames[old] = nw;
        }
    }
    if (!Object.keys(renames).length) {
        return;
    }
    const renameIn = (v: any): any => {
        if (typeof v === 'string') {
            return renames[v] ?? v;
        }
        if (Array.isArray(v)) {
            return v.map(renameIn);
        }
        if (v && typeof v === 'object') {
            return Object.fromEntries(
                Object.entries(v).map(([k, val]) => [k, renameIn(val)]),
            );
        }
        return v;
    };
    await db.transaction('rw', store.record, store.files, async () => {
        const rec = await store.record.get(recordId);
        if (rec) {
            await store.record.put({
                ...rec,
                values: JSON.stringify(renameIn(values)),
                ...(updateTimestamp ? { timestamp: Date.now() } : {}),
            });
        }
        const all = await store.files
            .where({ [store.fk]: recordId })
            .toArray();
        for (const f of all) {
            if (renames[f.filename]) {
                await store.files.delete(f.id);
                await store.files.put({
                    ...f,
                    id: `${recordId}/${renames[f.filename]}`,
                    filename: renames[f.filename],
                });
            }
        }
    });
};
