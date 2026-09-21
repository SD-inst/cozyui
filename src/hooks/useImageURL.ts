import { useEffect, useMemo, useRef, useState } from 'react';
import { useApiURL } from './useApiURL';
import { db } from '../components/history/db';

const buildImageURL = (apiUrl: string, filename: string) => {
    const params = new URLSearchParams();
    params.set('subfolder', '');
    params.set('type', 'input');
    params.set('filename', filename);
    params.set('noCache', Math.floor(Math.random() * 1000000).toFixed(0));
    return apiUrl + '/api/view?' + params.toString();
};

export const useImageURL = (filename?: string) => {
    const apiUrl = useApiURL();
    return useMemo(() => {
        if (!filename) {
            return '';
        }
        return buildImageURL(apiUrl, filename);
    }, [apiUrl, filename]);
};

export const useImageURLs = (filenames: Array<string | undefined>) => {
    const apiUrl = useApiURL();
    return filenames.map((filename) =>
        filename ? buildImageURL(apiUrl, filename) : '',
    );
};

// Returns a cache keyed by mod id (stable) instead of a position-based array.
// A mod's thumbnail never changes, so the only thing that should re-fetch is a
// change to the SET of mods — not their order. The old code keyed on
// `modIds.join(',')` (order-sensitive), so every reorder re-ran the async
// IndexedDB refill and the thumbnails briefly showed the old order before
// settling. Keying on the sorted set + a mod-id cache removes that flash: a
// reorder leaves the cache untouched, so each item always reads its own
// thumbnail by id.
export const useModThumbURLs = (modIds: Array<string | undefined>) => {
    const [filesById, setFilesById] = useState<Record<string, Blob>>({});
    const [urls, setUrls] = useState<Record<string, string>>({});
    // Order-insensitive set of the active mod ids (the reorder trigger guard).
    const setKey = useMemo(
        () => modIds.filter(Boolean).sort().join(','),
        [modIds],
    );
    // Latest-ids ref so the effect can read the current ids without listing the
    // (unstable) array as a dependency; the reactive key is setKey.
    const idsRef = useRef(modIds);
    idsRef.current = modIds;

    useEffect(() => {
        let cancelled = false;
        const active = idsRef.current.filter((id): id is string => !!id);
        if (!active.length) {
            setFilesById({});
            return;
        }
        Promise.all(
            active.map(async (id) => {
                const file = await db.refModFiles
                    .where({ mod: id })
                    .and((f: any) => f.fileType === 'thumbnail')
                    .first();
                return [id, file?.file] as const;
            }),
        ).then((result) => {
            if (cancelled) return;
            const map: Record<string, Blob> = {};
            for (const [id, f] of result) {
                if (f) map[id] = f;
            }
            setFilesById(map);
        });
        return () => {
            cancelled = true;
        };
    }, [setKey]);

    useEffect(() => {
        const map: Record<string, string> = {};
        for (const [id, f] of Object.entries(filesById)) {
            map[id] = URL.createObjectURL(f);
        }
        setUrls(map);
        return () => {
            for (const u of Object.values(map)) {
                if (u) URL.revokeObjectURL(u);
            }
        };
    }, [filesById]);

    return urls;
};
