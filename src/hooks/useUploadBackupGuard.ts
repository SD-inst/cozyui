import { useEffect, useRef } from 'react';
import { db } from '../components/history/db';
import { useIsCurrentTab, useTabName } from '../components/contexts/TabContext';
import { makeOutputUrl } from '../api/utils';
import { useApiURL } from './useApiURL';

export type backupEntry = { key: string; filename: string };

/**
 * Maps a receiver `ArrayInput`'s current entries to the backup keys that must
 * exist for them: `<tab>/<field>.<i>.<keyField>` per occupied slot. Empty
 * slots and unknown entries are skipped.
 */
export const buildBackupKeys = (
    tab: string,
    field: string,
    entries: any[],
    keyField: string,
): backupEntry[] => {
    const prefix = `${tab}/${field}`;
    return (entries || [])
        .map((e, i) =>
            e?.[keyField]
                ? { key: `${prefix}.${i}.${keyField}`, filename: e[keyField] }
                : null,
        )
        .filter(Boolean) as backupEntry[];
};

/**
 * Compares previous and current live backup entries (matched by filename) and
 * returns the set of `{ from, to }` moves needed so each file's backup follows
 * it across reorders. Files present in both sets at the same key produce no
 * move; files absent from the previous set produce no move (they will be
 * populated by the caller).
 */
export const computeBackupMoves = (
    prev: backupEntry[],
    live: backupEntry[],
): { from: string; to: string }[] =>
    live
        .map((entry) => {
            const p = prev.find((e) => e.filename === entry.filename);
            return p && p.key !== entry.key ? { from: p.key, to: entry.key } : null;
        })
        .filter(Boolean) as { from: string; to: string }[];

/**
 * Keeps `db.uploads` in sync with a receiver `ArrayInput` so that files which
 * disappear from the server (periodic cleanup) can be restored by the receiver.
 *
 * Runs only for the active tab (backups are created lazily as a tab is used).
 *
 * - Populate: each occupied slot that has no backup yet is fetched from the
 *   server and stored under its resolved key. Manually uploaded files are
 *   skipped — FileUpload already backs them up.
 * - Reorder: when a file changes slot, its backup is moved to the new key so
 *   restoration always matches the current ordering.
 * - GC: backups for files no longer in the field are removed, as is the stray
 *   top-level key `<tab>/<field>` that a cross-tab send leaves behind.
 */
export const useUploadBackupGuard = (
    field: string,
    entries: any[],
    keyField: string,
) => {
    const tab = useTabName();
    const apiUrl = useApiURL();
    const isCurrentTab = useIsCurrentTab();
    const prevEntries = useRef<backupEntry[]>([]);

    useEffect(() => {
        if (!isCurrentTab || !apiUrl || !keyField) {
            return;
        }
        const prev = prevEntries.current;
        const live = buildBackupKeys(tab, field, entries, keyField);
        const liveKeys = new Set(live.map((l) => l.key));
        const liveFilenames = new Set(live.map((l) => l.filename));

        const moves = computeBackupMoves(prev, live);
        const orphans = new Set(
            [
                ...prev
                    .filter((p) => !liveFilenames.has(p.filename))
                    .map((p) => p.key),
                `${tab}/${field}`,
            ],
        );

        (async () => {
            // Move backups that followed a reordered file to its new key. Read
            // all sources first so overlapping moves (a swap) do not clobber
            // each other.
            const moved: Record<string, File> = {};
            for (const m of moves) {
                const existing = await db.uploads.get(m.from);
                if (existing) {
                    moved[m.from] = existing.file;
                }
            }
            const toKeys = new Set(moves.map((m) => m.to));
            for (const m of moves) {
                if (moved[m.from]) {
                    await db.uploads.put({ id: m.to, file: moved[m.from] });
                }
            }
            for (const m of moves) {
                if (!toKeys.has(m.from)) {
                    await db.uploads.delete(m.from);
                }
            }
            // GC: drop backups for files no longer in the field.
            for (const k of orphans) {
                if (liveKeys.has(k)) continue;
                await db.uploads.delete(k);
            }
            // Populate: fetch-if-missing for the rest.
            const toFetch = await Promise.all(
                live.map(async ({ key, filename }) => {
                    const existing = await db.uploads.get(key);
                    return existing ? null : { key, filename };
                }),
            );
            for (const it of toFetch.filter(Boolean)) {
                const { key, filename } = it as backupEntry;
                try {
                    const blob = await fetch(
                        makeOutputUrl(apiUrl, {
                            filename,
                            subfolder: '',
                            type: 'input',
                        }),
                    ).then((r) => r.blob());
                    await db.uploads.put({
                        id: key,
                        file: new File([blob], filename, { type: blob.type }),
                    });
                } catch {
                    // best-effort; retried on the next run while the slot is live
                }
            }
        })();

        prevEntries.current = live;
    }, [isCurrentTab, apiUrl, tab, field, keyField, entries]);
};
