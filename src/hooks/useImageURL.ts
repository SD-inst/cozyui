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

export const useModThumbURLs = (modIds: Array<string | undefined>) => {
    const [urls, setUrls] = useState<string[]>(() => modIds.map(() => ''));
    const [files, setFiles] = useState<Array<Blob | undefined>>(() =>
        modIds.map(() => undefined),
    );
    const idsKey = modIds.join(',');
    // Latest-ids ref so the effect can read the current ids without listing
    // the (unstable) array as a dependency; the reactive key is idsKey.
    const idsRef = useRef(modIds);
    idsRef.current = modIds;

    useEffect(() => {
        let cancelled = false;
        if (!idsKey) {
            setFiles(idsRef.current.map(() => undefined));
            return;
        }
        Promise.all(
            idsRef.current.map(async (id) => {
                if (!id) return undefined;
                const file = await db.refModFiles
                    .where({ mod: id })
                    .and((f: any) => f.fileType === 'thumbnail')
                    .first();
                return file?.file;
            }),
        ).then((result) => {
            if (!cancelled) {
                setFiles(result);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [idsKey]);

    useEffect(() => {
        const newUrls = files.map((f) => (f ? URL.createObjectURL(f) : ''));
        setUrls(newUrls);
        return () => {
            newUrls.forEach((u) => {
                if (u) URL.revokeObjectURL(u);
            });
        };
    }, [files]);

    return urls;
};
