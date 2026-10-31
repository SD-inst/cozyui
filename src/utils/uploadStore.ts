// Local copies of the files this client has put into ComfyUI's `input` folder.
//
// The server's input folder is not durable (a container rebuild empties it),
// while the form state keeps naming those files for weeks. So every upload
// stores its bytes here under the name the server returned, and anything that
// later finds the name missing can restore it without asking the user to pick
// the file again.
//
// The store is keyed by the server filename — the only identity that survives
// reordering, slot changes and re-uploads. A re-upload mints a new name and
// leaves the bytes where they are: the new name becomes an alias of the same
// content, so a name that has long left the server — the one a history entry
// holds — still resolves to bytes that never moved.
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
import { sha256Hex } from './contentHash';
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

// Every name this client has uploaded, mapped to the content it stands for.
const aliasHash = async (name: string): Promise<string | undefined> =>
    (await db.uploadAliases.get(name).catch(() => undefined))?.hash;

// The content a name stands for, as far as the alias table knows it. A name
// registered before content identity existed has no alias, and reading its
// record to find out would pull the Blob into memory — the caller that needs
// the answer that badly already holds the bytes.
export const nameHash = async (name: string): Promise<string | undefined> =>
    aliasHash(name);

const addAlias = async (name: string, hash: string): Promise<void> => {
    await db.uploadAliases.put({ name, hash }).catch(() => undefined);
};

// Which stored copy holds these bytes — without reading them. A check that
// loaded the Blob to answer "do we have it" would cost the memory the store
// exists to save.
const canonicalOfHash = async (hash: string): Promise<string | undefined> =>
    ((await db.uploads.where('hash').equals(hash).primaryKeys()) as string[])[0];

// A copy and every name pointing at it go together: an alias whose bytes are
// gone would promise a restore that cannot happen.
const deleteCopy = async (id: string): Promise<void> => {
    const hash = await aliasHash(id);
    await db.uploads.delete(id);
    if (hash) {
        await db.uploadAliases
            .where('hash')
            .equals(hash)
            .delete()
            .catch(() => undefined);
    }
};

// Give a stored copy its content hash and register the names that stand for
// it. Records written before content identity existed have none, and without
// one a re-upload cannot alias them — so the names they were known by would
// stop resolving.
const hashInto = async (
    id: string,
    file: File,
    extraNames: string[] = [],
): Promise<void> => {
    const hash = await sha256Hex(file).catch(() => undefined);
    if (!hash) {
        return;
    }
    await db.uploads.update(id, { hash }).catch(() => undefined);
    for (const name of [id, ...extraNames]) {
        await addAlias(name, hash);
    }
};

// On a lookup this runs off the caller's path: hashing the whole store at
// startup would read every Blob on page load.
const fillHash = (id: string, file: File): void => {
    void hashInto(id, file).catch(() => undefined);
};

// Names a saved form state holds, resolved to the copies they stand for. A
// form may name any alias of a content rather than the canonical name its
// bytes were first stored under, so the alias table has to take part.
const referencedUploads = async (texts: string[]): Promise<Set<string>> => {
    // A key cursor over the whole table: `primaryKeys()` is a Collection
    // method, and the copies themselves must not be read to answer this.
    const ids = (await db.uploads.toCollection().primaryKeys()) as string[];
    const referenced = new Set<string>();
    for (const id of ids) {
        if (texts.some((text) => text.includes(id))) {
            referenced.add(id);
        }
    }
    const aliases = await db.uploadAliases.toArray().catch(() => []);
    if (!aliases.length) {
        return referenced;
    }
    // The canonical name of a copy is itself an alias row, so the copy can be
    // reached from its hash without loading a single Blob.
    const owned = new Set(ids);
    const canonical = new Map<string, string>();
    for (const alias of aliases) {
        if (owned.has(alias.name)) {
            canonical.set(alias.hash, alias.name);
        }
    }
    for (const alias of aliases) {
        const id = canonical.get(alias.hash);
        if (!id || referenced.has(id)) {
            continue;
        }
        if (texts.some((text) => text.includes(alias.name))) {
            referenced.add(id);
        }
    }
    return referenced;
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
    const raw = String(row.value ?? '').trim();
    const days = Number(raw);
    // Only a number the field can mean decides anything: `0` is the documented
    // "never age out", while a negative or a blank box — reachable through a
    // settings import as much as a stray keystroke — falls back to the default
    // instead of silently switching age out off.
    return raw !== '' && Number.isFinite(days) && days >= 0
        ? days
        : DEFAULT_RETENTION_DAYS;
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
    const referenced = await referencedUploads(await formStateTexts());
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
        ...all.filter((id) => expired.has(id) && !referenced.has(id)),
        ...all.filter((id) => !expired.has(id) && !referenced.has(id)),
        ...all.filter((id) => expired.has(id) && referenced.has(id)),
        ...all.filter((id) => !expired.has(id) && referenced.has(id)),
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
    const hash = await sha256Hex(file).catch(() => undefined);
    // The same bytes under a new name are not a new copy. Every upload mints a
    // fresh server name, and with the input folder emptied on a schedule the
    // same file is re-uploaded over and over — the name becomes an alias of the
    // copy that is already here instead of a second Blob.
    if (hash) {
        const canonical = await canonicalOfHash(hash);
        if (canonical) {
            await addAlias(name, hash);
            await db.uploads
                .update(canonical, { lastUsedAt: now() })
                .catch(() => undefined);
            return true;
        }
    }
    const record = {
        id: name,
        filename: name,
        file,
        size: file.size,
        hash,
        lastUsedAt: now(),
        tab: meta.tab,
        field: meta.field,
    };
    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            await db.uploads.put(record);
            if (hash) {
                await addAlias(name, hash);
            }
            return true;
        } catch (e) {
            if (!isQuotaError(e)) {
                throw e;
            }
            const victim = await nextEvictable();
            if (!victim) {
                return false;
            }
            await deleteCopy(victim);
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
                await deleteCopy(name).catch(() => undefined);
                return undefined;
            }
            await db.uploads
                .update(name, { lastUsedAt: now() })
                .catch(() => undefined);
            if (!record.hash && record.file) {
                fillHash(record.id, record.file);
            }
            return record.file;
        }
        // Not stored under this name — but the bytes may never have moved. A
        // re-upload leaves them where they are and mints an alias, and that is
        // what lets the dead name a history entry holds resolve.
        const hash = await aliasHash(name);
        if (!hash) {
            return undefined;
        }
        const canonical = await canonicalOfHash(hash);
        if (!canonical) {
            // A pointer to bytes that are gone; drop it rather than chase it
            // again on the next lookup.
            await db.uploadAliases
                .where('name')
                .equals(name)
                .delete()
                .catch(() => undefined);
            return undefined;
        }
        const copy = await db.uploads.get(canonical);
        if (!copy || isEmptyCopy(copy)) {
            await deleteCopy(canonical).catch(() => undefined);
            return undefined;
        }
        await db.uploads
            .update(canonical, { lastUsedAt: now() })
            .catch(() => undefined);
        return copy.file;
    } catch {
        return undefined;
    }
};

// The server still holding a file says nothing about the local copy being
// useless — it is what makes the next wipe survivable. Nothing else refreshes
// the clock on a copy that never has to be restored, so a form used every day
// for a month would otherwise watch its copies age out under it.
export const touchUpload = async (name: string): Promise<void> => {
    await db.uploads.update(name, { lastUsedAt: now() }).catch(() => undefined);
};

// A re-upload gives the file a new server name. The bytes stay under the name
// they were first registered with and the new name becomes an alias of them:
// the next generation finds the copy either way, a history entry's old name
// still resolves, and the store rewrites a row instead of the whole Blob every
// time the server empties its folder.
export const renameUpload = async (from: string, to: string): Promise<void> => {
    if (from === to) {
        return;
    }
    const hash = await aliasHash(from);
    if (hash) {
        await addAlias(to, hash);
        const canonical = await canonicalOfHash(hash);
        if (canonical) {
            await db.uploads
                .update(canonical, { lastUsedAt: now() })
                .catch(() => undefined);
        }
        return;
    }
    // A record predating content identity has no hash to alias onto, so its
    // bytes still have to be carried over by hand.
    let carried: File | undefined;
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
        carried = record.file;
    });
    if (carried) {
        // Awaited, unlike the lazy fill on a lookup: this is the one path where
        // a name would otherwise stop resolving, and the caller — a restore or
        // a preflight rename — is relying on the alias it leaves behind.
        await hashInto(to, carried, [from]);
    }
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
//
// Finding those rows means reading every record, so the pass marks itself done
// and never runs again: nothing writes a key without `filename` anymore, and no
// import path touches this table, so a shape that cannot come back is not worth
// a full scan of the store on every page load. The marker lives in `settings`
// under a `schema.` name, which the settings export skips — a marker from one
// database must not talk another one out of its own migration.
const MIGRATED_KEY = 'schema.uploads_positional_migrated';

const migrateUploadBackups = async (
    valuesByTab: Record<string, any>,
): Promise<void> => {
    const done = await db.settings
        .where({ name: MIGRATED_KEY })
        .first()
        .catch(() => undefined);
    if (done) {
        return;
    }
    const legacy = await db.uploads.filter((r) => !r.filename).toArray();
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
                    // The recorded size is the one the empty sweep can reach;
                    // the bytes only add information when they can speak.
                    size: record.file?.size ?? record.size,
                    lastUsedAt: now(),
                })
                .catch(() => undefined);
        }
        await db.uploads.delete(record.id);
    }
    await db.settings
        .put({ name: MIGRATED_KEY, value: '1' })
        .catch(() => undefined);
};

// Two things take copies away: age, and the cache having to shrink. Age only
// touches a copy no saved form state names — a file still sitting in a form is
// the one thing a restore must never find missing, whatever its timestamp says,
// because a tab the user has not opened in a month never gets a chance to
// refresh its own copies.
const pruneUploads = async (): Promise<void> => {
    const cutoff = await ageCutoff();
    if (cutoff > 0) {
        const referenced = await referencedUploads(await formStateTexts());
        const expired = (await db.uploads
            .where('lastUsedAt')
            .below(cutoff)
            .primaryKeys()) as string[];
        for (const id of expired) {
            if (!referenced.has(id)) {
                await deleteCopy(id);
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
        await deleteCopy(id);
        const after = await navigator.storage.estimate();
        if (!after.usage || !after.quota) {
            break;
        }
        if (after.usage <= after.quota * SOFT_QUOTA_RATIO) {
            break;
        }
    }
};

// Copies holding no bytes are worse than no copy: restoring one puts a 0-byte
// input on the server, which the workflow accepts and then fails over in some
// later node whose error names neither the file nor the control. They come from
// backups fetched for names the server never had — a 404 body is empty. The
// sweep runs on the `size` index: the alternative is pulling every stored video
// into memory at page load, a stall on a phone before the controls appear.
const purgeEmptyCopies = async (): Promise<void> => {
    const empty = (await db.uploads
        .where('size')
        .equals(0)
        .primaryKeys()) as string[];
    for (const id of empty) {
        await deleteCopy(id);
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
            // Migration first: it stamps a `size` onto every legacy row, which
            // is what lets the empty sweep reach them through the index.
            await migrateUploadBackups(valuesByTab);
            await purgeEmptyCopies();
            await pruneUploads();
            await requestPersistence();
        })().catch(() => undefined);
    }
    return startup;
};
