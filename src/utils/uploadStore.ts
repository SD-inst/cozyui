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
//
// What decides whether bytes are still here is age and volume, never the form:
// a copy is dropped once it is older than the retention window and no saved
// form state names it, or when the cache has to shrink to stay inside its
// share of the storage quota. Nothing is deleted the moment a form stops
// naming a file — a history entry, an Undo, or a tab the user has not opened
// in a week can all ask for that name again, and the store cannot tell those
// apart from a deliberate removal.
import { uploadToInputDir } from '../api/files';
import { get } from 'lodash-es';
import { settings } from '../hooks/settings';
import { db } from '../components/history/db';

// Above this share of the browser's storage quota, the oldest copies go away.
// The browser's own quota error is the hard limit (see `registerUpload`); this
// only keeps the cache from growing into it.
const SOFT_QUOTA_RATIO = 0.4;

// How long a copy nothing references is kept, in days. The server wipes its
// `input` folder on a schedule, so for a history entry from last week these
// bytes are the only surviving copy of the file it names.
const DEFAULT_RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type UploadMeta = {
    // Diagnostics only: which control the bytes came from.
    tab?: string;
    field?: string;
};

const now = (): number => Date.now();

// A copy holding no bytes is worse than no copy: restoring it puts a 0-byte file
// on the server, which the workflow accepts and then fails over in some later
// node whose error names neither the file nor the control. The size is checked
// both as recorded when the copy was written and on the bytes themselves — the
// positional guard this cleans up wrote neither field, while a browser's
// IndexedDB keeps the bytes faithful.
const isEmptyCopy = (record: { size?: number; file?: Blob }): boolean =>
    record.size === 0 || record.file?.size === 0;

const isQuotaError = (e: unknown): boolean => {
    const err = e as { name?: string; innerErr?: { name?: string } };
    return (
        err?.name === 'QuotaExceededError' ||
        err?.innerErr?.name === 'QuotaExceededError'
    );
};

// The retention window is a user setting, read where the decision is made: a
// change then applies to the next pass without any wiring, and 0 (or anything
// negative) means "never age out" — only the byte budget decides.
const retentionDays = async (): Promise<number> => {
    const row = await db.settings
        .where({ name: settings.upload_retention_days })
        .first()
        .catch(() => undefined);
    if (row === undefined) {
        return DEFAULT_RETENTION_DAYS;
    }
    const days = Number(row.value);
    return Number.isFinite(days) ? Math.max(0, days) : DEFAULT_RETENTION_DAYS;
};

// 0 when age must not evict anything.
const ageCutoff = async (): Promise<number> => {
    const days = await retentionDays();
    return days > 0 ? Date.now() - days * DAY_MS : 0;
};

// The saved form states, as the JSON they are stored in. Naming a file is a
// substring test over these: it cannot miss a name buried in a nested array
// entry or sitting in a `skip`ped slot, and it costs one read of a row per tab.
const formStateTexts = async (): Promise<string[]> => {
    try {
        return (await db.formState.toArray()).map((row) => row.state);
    } catch {
        // A form-state read that fails only means nothing looks referenced;
        // `evictOrder` then falls back to age, which is the safer guess.
        return [];
    }
};

// Copies in the order they may go: expired and unreferenced first, then any
// unreferenced copy, and only when nothing else is left, the copies a saved
// form still names — oldest of those first. A copy a form names is the last
// thing to lose its bytes: the server wipes its input folder, so without the
// copy that generation is not merely slower, it is impossible.
const evictOrder = async (): Promise<string[]> => {
    const texts = await formStateTexts();
    const referenced = (id: string): boolean =>
        texts.some((text) => text.includes(id));
    const cutoff = await ageCutoff();
    // Rows written before `lastUsedAt` existed are absent from that index, so
    // they are never "expired"; the migration pass is what clears those.
    const expired = new Set<string>(
        cutoff > 0
            ? ((await db.uploads
                  .where('lastUsedAt')
                  .below(cutoff)
                  .primaryKeys()) as string[])
            : [],
    );
    const all = (await db.uploads
        .orderBy('lastUsedAt')
        .primaryKeys()) as string[];
    return [
        ...all.filter((id) => expired.has(id) && !referenced(id)),
        ...all.filter((id) => !expired.has(id) && !referenced(id)),
        ...all.filter((id) => expired.has(id) && referenced(id)),
        ...all.filter((id) => !expired.has(id) && referenced(id)),
    ];
};

// Next copy to sacrifice after a write was refused.
const nextEvictable = async (): Promise<string | undefined> =>
    (await evictOrder())[0];

// Store (or refresh) the local copy of `name`. A full IndexedDB must not break
// generation: the worst case is a file we can no longer restore by ourselves.
// An empty file is never stored: restoring it would put a 0-byte input on the
// server, which the workflow accepts and then fails over in some later node.
export const registerUpload = async (
    name: string,
    file: File,
    meta: UploadMeta = {},
): Promise<boolean> => {
    if (file.size === 0) {
        return false;
    }
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
            const victim = await nextEvictable();
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
            // An empty copy is how a legacy backup of a name the server never
            // had looks (a 404 body is empty). Restoring it would put a 0-byte
            // file on the server, so the copy goes and the caller treats the
            // file as one we cannot bring back.
            if (isEmptyCopy(record)) {
                await db.uploads.delete(name).catch(() => undefined);
                return undefined;
            }
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

// The server still holding a file says nothing about the local copy being
// useless — it is what makes the next wipe survivable. Nothing else refreshes
// the clock on a copy that never has to be restored, so a form used every day
// for a month would otherwise watch its copies age out under it.
export const touchUpload = async (name: string): Promise<void> => {
    await db.uploads.update(name, { lastUsedAt: now() }).catch(() => undefined);
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
const migrateUploadBackups = async (
    valuesByTab: Record<string, any>,
): Promise<void> => {
    const legacy = await db.uploads.filter((r) => !r.filename).toArray();
    if (!legacy.length) {
        return;
    }
    for (const record of legacy) {
        const slash = record.id.indexOf('/');
        const tab = slash > 0 ? record.id.slice(0, slash) : '';
        const path = record.id.slice(slash + 1);
        const filename = path ? get(valuesByTab[tab], path) : undefined;
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

// Two things take copies away: age, and the cache having to shrink. Age only
// touches a copy no saved form state names — a file still sitting in a form is
// the one thing a restore must never find missing, whatever its timestamp says,
// because a tab the user has not opened in a month never gets a chance to
// refresh its own copies.
const pruneUploads = async (): Promise<void> => {
    const cutoff = await ageCutoff();
    if (cutoff > 0) {
        const texts = await formStateTexts();
        const expired = (await db.uploads
            .where('lastUsedAt')
            .below(cutoff)
            .primaryKeys()) as string[];
        for (const id of expired) {
            if (!texts.some((text) => text.includes(id))) {
                await db.uploads.delete(id);
            }
        }
    }
    await evictToBudget();
};

// Losing a copy costs a re-pick, and the browser's quota is the hard limit
// anyway — this only keeps the cache from growing into it.
const evictToBudget = async (): Promise<void> => {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate?.quota || !estimate.usage) {
        return;
    }
    if (estimate.usage <= estimate.quota * SOFT_QUOTA_RATIO) {
        return;
    }
    for (const id of await evictOrder()) {
        await db.uploads.delete(id);
        const after = await navigator.storage.estimate();
        if (!after.usage || !after.quota) {
            break;
        }
        if (after.usage <= after.quota * SOFT_QUOTA_RATIO) {
            break;
        }
    }
};

// Copies holding no bytes are worse than no copy: they make a restore "succeed"
// with a 0-byte file on the server. The old positional guard stored exactly
// that whenever it fetched a name the server did not have (a 404 body is empty),
// so the pass runs at startup to clear whatever it left behind.
const purgeEmptyCopies = async (): Promise<void> => {
    const empty = (
        await db.uploads.filter((r) => isEmptyCopy(r)).primaryKeys()
    ) as string[];
    for (const id of empty) {
        await db.uploads.delete(id);
    }
};

// The copies are what makes a cleared input folder survivable, so the browser
// must not evict them on its own under disk pressure.
const requestPersistence = async (): Promise<void> => {
    try {
        await navigator.storage?.persist?.();
    } catch {
        // A rejected request only means the cache stays evictable.
    }
};

let startup: Promise<void> | null = null;

// Migration, garbage collection and the persistence request run once per page
// load, before anything reads the store.
export const ensureUploadStoreReady = (): Promise<void> => {
    if (!startup) {
        startup = (async () => {
            const rows = await db.formState.toArray();
            const valuesByTab: Record<string, any> = {};
            for (const row of rows) {
                try {
                    valuesByTab[row.tab] = JSON.parse(row.state);
                } catch {
                    // A corrupt row only means its backups cannot be placed.
                }
            }
            await purgeEmptyCopies();
            await migrateUploadBackups(valuesByTab);
            await pruneUploads();
            await requestPersistence();
        })().catch(() => undefined);
    }
    return startup;
};
