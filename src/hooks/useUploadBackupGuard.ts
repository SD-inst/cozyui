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
 * Keeps `db.uploads` in sync with a receiver `ArrayInput` so that files which
 * disappear from the server (periodic cleanup) can be restored by the receiver.
 *
 * Runs only for the active tab (backups are created lazily as a tab is used).
 *
 * - Populate: each occupied slot that has no backup yet is fetched from the
 *   server and stored under its resolved key. Manually uploaded files are
 *   skipped — FileUpload already backs them up.
 * - GC: backups for slots that no longer hold a file are removed, as is the
 *   stray top-level key `<tab>/<field>` that a cross-tab send leaves behind.
 */
export const useUploadBackupGuard = (
    field: string,
    entries: any[],
    keyField: string,
) => {
    const tab = useTabName();
    const apiUrl = useApiURL();
    const isCurrentTab = useIsCurrentTab();
    const prevKeys = useRef<string[]>([]);

    useEffect(() => {
        if (!isCurrentTab || !apiUrl || !keyField) {
            return;
        }
        const prev = prevKeys.current;
        const live = buildBackupKeys(tab, field, entries, keyField);
        const liveKeys = new Set(live.map((l) => l.key));
        const dropped = prev.filter((k) => !liveKeys.has(k));
        const orphans = new Set([...dropped, `${tab}/${field}`]);

        (async () => {
            for (const k of orphans) {
                if (liveKeys.has(k)) continue;
                await db.uploads.delete(k);
            }
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

        prevKeys.current = live.map((l) => l.key);
    }, [isCurrentTab, apiUrl, tab, field, keyField, entries]);
};
