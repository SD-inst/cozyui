import { Table } from 'dexie';
import { db } from '../../components/history/db';
import {
    Domain,
    Manifest,
    RawRecord,
    unhoistBlobs,
} from './format';

// Which tables each domain touches (used to validate an incoming archive and
// to scope the restore transaction).
export const DOMAIN_TABLES: Record<Domain, string[]> = {
    history: ['taskResults'],
    presets: ['presets', 'presetFiles'],
    sessions: ['sessions', 'sessionFiles'],
    refmods: ['refMods', 'refModFiles'],
};

const getTable = (name: string): Table<any, any> => {
    switch (name) {
        case 'taskResults':
            return db.taskResults;
        case 'presets':
            return db.presets;
        case 'presetFiles':
            return db.presetFiles;
        case 'sessions':
            return db.sessions;
        case 'sessionFiles':
            return db.sessionFiles;
        case 'refMods':
            return db.refMods;
        case 'refModFiles':
            return db.refModFiles;
        default:
            throw new Error(`Unknown table: ${name}`);
    }
};

// ---- Collect (gather records + their file children for a set of ids) ----
// Passing no ids means "all" for that domain.

export const collectHistory = async (ids?: number[]): Promise<RawRecord[]> => {
    const recs =
        ids === undefined
            ? await db.taskResults.toArray()
            : await db.taskResults.where('id').anyOf(ids).toArray();
    return recs.map((r) => ({ table: 'taskResults', key: r.id, value: r }));
};

export const collectPresets = async (ids?: string[]): Promise<RawRecord[]> => {
    const presets =
        ids === undefined
            ? await db.presets.toArray()
            : await db.presets.where('id').anyOf(ids).toArray();
    const presetIds = presets.map((p) => p.id);
    const files = presetIds.length
        ? await db.presetFiles.where('preset').anyOf(presetIds).toArray()
        : [];
    const out: RawRecord[] = presets.map((p) => ({
        table: 'presets',
        key: p.id,
        value: p,
    }));
    out.push(
        ...files.map((f) => ({ table: 'presetFiles', key: f.id, value: f })),
    );
    return out;
};

export const collectSessions = async (ids?: string[]): Promise<RawRecord[]> => {
    const sessions =
        ids === undefined
            ? await db.sessions.toArray()
            : await db.sessions.where('id').anyOf(ids).toArray();
    const sessionIds = sessions.map((s) => s.id);
    const files = sessionIds.length
        ? await db.sessionFiles.where('session').anyOf(sessionIds).toArray()
        : [];
    const out: RawRecord[] = sessions.map((s) => ({
        table: 'sessions',
        key: s.id,
        value: s,
    }));
    out.push(
        ...files.map((f) => ({
            table: 'sessionFiles',
            key: f.id,
            value: f,
        })),
    );
    return out;
};

export const collectRefMods = async (ids?: string[]): Promise<RawRecord[]> => {
    const mods =
        ids === undefined
            ? await db.refMods.toArray()
            : await db.refMods.where('id').anyOf(ids).toArray();
    const modIds = mods.map((m) => m.id);
    const files = modIds.length
        ? await db.refModFiles.where('mod').anyOf(modIds).toArray()
        : [];
    const out: RawRecord[] = mods.map((m) => ({
        table: 'refMods',
        key: m.id,
        value: m,
    }));
    out.push(
        ...files.map((f) => ({ table: 'refModFiles', key: f.id, value: f })),
    );
    return out;
};

// ---- Restore (write an incoming archive's records into the DB) ----
// History is additive (auto-id); the other domains are idempotent (same UUID).
export const restore = async (
    ser: {
        manifest: Manifest;
        records: RawRecord[];
        files: Map<string, { bytes: Uint8Array; filename: string; type: string }>;
    },
    onProgress?: (done: number, total: number) => void,
): Promise<number> => {
    const { manifest, records, files } = ser;
    const valid = new Set(DOMAIN_TABLES[manifest.domain] ?? []);
    for (const r of records) {
        if (!valid.has(r.table)) {
            throw new Error(`Unexpected table for domain ${manifest.domain}: ${r.table}`);
        }
    }
    const unhoisted = unhoistBlobs(records, files);
    const usedTables = [...new Set(unhoisted.map((r) => r.table))];
    let n = 0;
    await db.transaction(
        'rw',
        usedTables.map((t) => getTable(t)),
        async () => {
            for (const rec of unhoisted) {
                if (rec.table === 'taskResults') {
                    // Additive: drop the original auto-id so Dexie assigns a
                    // new one (re-import appends rather than clobbers).
                    const rest = { ...(rec.value as any) };
                    delete rest.id;
                    await db.taskResults.add(rest);
                } else {
                    await getTable(rec.table).put(rec.value);
                }
                n += 1;
                onProgress?.(n, unhoisted.length);
            }
        },
    );
    return n;
};
