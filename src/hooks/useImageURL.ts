import { useMemo } from 'react';
import { useApiURL } from './useApiURL';

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
