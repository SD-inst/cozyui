import { useMemo } from 'react';
import { useApiURL } from './useApiURL';

export const useImageURL = (filename: string) => {
    const apiUrl = useApiURL();
    const imageURL = useMemo(() => {
        const params = new URLSearchParams();
        params.set('subfolder', '');
        params.set('type', 'input');
        params.set('filename', filename);
        return apiUrl + '/api/view?' + params.toString();
    }, [apiUrl, filename]);
    return imageURL;
};
