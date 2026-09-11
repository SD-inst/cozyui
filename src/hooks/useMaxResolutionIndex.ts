import { useEffect, useRef, useState } from 'react';
import { useApiURL } from './useApiURL';

const getImageDimensions = (
    url: string,
): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = url;
    });
};

export const useMaxResolutionIndex = (
    filenames: Array<string | undefined>,
): number | null => {
    const apiUrl = useApiURL();
    const [maxIndex, setMaxIndex] = useState<number | null>(null);
    const key = filenames.map((f) => f || '').join(',');
    const filenamesRef = useRef(filenames);
    filenamesRef.current = filenames;

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const files = filenamesRef.current;
            if (!files.length || !apiUrl) {
                setMaxIndex(null);
                return;
            }

            let maxArea = 0;
            let maxIdx: number | null = null;

            for (let i = 0; i < files.length; i++) {
                const filename = files[i];
                if (!filename) continue;

                try {
                    const url =
                        apiUrl +
                        '/api/view?subfolder=&type=input&filename=' +
                        encodeURIComponent(filename);
                    const { width, height } = await getImageDimensions(url);
                    const area = width * height;
                    if (area > maxArea) {
                        maxArea = area;
                        maxIdx = i;
                    }
                } catch {
                    // ignore
                }

                if (cancelled) return;
            }

            if (!cancelled) {
                setMaxIndex(maxIdx);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [key, apiUrl]);

    return maxIndex;
};
