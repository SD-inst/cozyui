// Local copies of the files this client has put into ComfyUI's `input` folder.
//
// The server's input folder is not durable (a container rebuild empties it),
// while the form state keeps naming those files for weeks. So every upload
// stores its bytes here under the name the server returned, and anything that
// later finds the name missing can restore it without asking the user to pick
// the file again.
//
// The store is keyed by the server filename — the only identity that survives
// reordering, slot changes and re-uploads. A re-upload renames the record
// (old name → new name) instead of leaving a stale entry behind.
import { uploadToInputDir } from '../api/files';
import { get } from 'lodash-es';
import { db } from '../components/history/db';

export type UploadMeta = {
    // Diagnostics only: which control the bytes came from.
    tab?: string;
    field?: string;
};

const now = (): number => Date.now();

const isQuotaError = (e: unknown): boolean => {
    const err = e as { name?: string; innerErr?: { name?: string } };
    return (
        err?.name === 'QuotaExceededError' ||
        err?.innerErr?.name === 'QuotaExceededError'
    );
};

// Oldest entry that is not protected, for eviction after a write was refused.
const nextEvictable = async (keep: Set<string>): Promise<string | undefined> => {
    const ids = await db.uploads.orderBy('lastUsedAt').primaryKeys();
    return ids.find((id) => !keep.has(id as string));
};

// Store (or refresh) the local copy of `name`. A full IndexedDB must not break
// generation: the worst case is a file we can no longer restore by ourselves.
export const registerUpload = async (
    name: string,
    file: File,
    meta: UploadMeta = {},
    keep: Set<string> = new Set(),
): Promise<boolean> => {
    const record = {
        id: name,
        filename: name,
        file,
        size: file.size,
        lastUsedAt: now(),
        tab: meta.tab,
        field: meta.field,
    };
    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            await db.uploads.put(record);
            return true;
        } catch (e) {
            if (!isQuotaError(e)) {
                throw e;
            }
            const victim = await nextEvictable(keep);
            if (!victim) {
                return false;
            }
            await db.uploads.delete(victim);
        }
    }
    return false;
};

// A missing copy only means the file cannot be restored by us; a storage that
// is unavailable (private mode, quota exhausted) must not break generation.
export const lookupUpload = async (name: string): Promise<File | undefined> => {
    try {
        const record = await db.uploads.get(name);
        if (record) {
            await db.uploads
                .update(name, { lastUsedAt: now() })
                .catch(() => undefined);
            return record.file;
        }
    } catch {
        return undefined;
    }
    return undefined;
};

// A re-upload gives the file a new server name; the local copy follows it, so
// the next generation finds it under the name the form now holds.
export const renameUpload = async (from: string, to: string): Promise<void> => {
    if (from === to) {
        return;
    }
    await db.transaction('rw', db.uploads, async () => {
        const record = await db.uploads.get(from);
        if (!record) {
            return;
        }
        await db.uploads.delete(from);
        await db.uploads.put({
            ...record,
            id: to,
            filename: to,
            lastUsedAt: now(),
        });
    });
};

export const forgetUpload = async (name: string): Promise<void> => {
    await db.uploads.delete(name);
};

// Upload a file and keep its bytes locally. Returns the server name and the
// renamed File that was sent. Registration is best-effort: an upload that
// succeeded on the server is a success even if we could not cache it.
export const uploadInputFile = async (
    file: File,
    apiUrl: string,
    meta: UploadMeta & { name?: string } = {},
): Promise<{ name: string; file: File }> => {
    const uploaded = await uploadToInputDir(
        file,
        apiUrl,
        meta.name ? { name: meta.name } : undefined,
    );
    await registerUpload(uploaded.name, file, meta).catch(() => false);
    return uploaded;
};

// One-time move off the pre-v13 key scheme, where a backup was keyed by form
// position (`<tab>/<field>` or `<tab>/<field>.<i>.<key>`) and its bytes kept
// the user's original filename. The server name each legacy entry belongs to is
// read back from that tab's persisted form values; an entry no form value
// references belongs to a file nothing asks for anymore, and goes away.
let migration: Promise<void> | null = null;

const migrateUploadBackups = async (): Promise<void> => {
    const legacy = await db.uploads.filter((r) => !r.filename).toArray();
    if (!legacy.length) {
        return;
    }
    const valuesByTab: Record<string, any> = {};
    for (const row of await db.formState.toArray()) {
        try {
            valuesByTab[row.tab] = JSON.parse(row.state);
        } catch {
            // A corrupt row only means its backups cannot be placed.
        }
    }
    for (const record of legacy) {
        const slash = record.id.indexOf('/');
        const tab = slash > 0 ? record.id.slice(0, slash) : '';
        const path = record.id.slice(slash + 1);
        const filename = path
            ? get(valuesByTab[tab], path)
            : undefined;
        if (typeof filename === 'string' && filename) {
            await db.uploads
                .put({
                    id: filename,
                    filename,
                    file: record.file,
                    size: record.file?.size,
                    lastUsedAt: now(),
                })
                .catch(() => undefined);
        }
        await db.uploads.delete(record.id);
    }
};

export const ensureUploadsMigrated = (): Promise<void> => {
    if (!migration) {
        migration = migrateUploadBackups().catch(() => undefined);
    }
    return migration;
};
