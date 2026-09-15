import { useEffect, useState } from 'react';
import { useApiURL } from './useApiURL';
import { ImageSize } from '../utils/refmodCrop';

// Resolves the natural pixel size of a reference from ComfyUI's input dir — an
// image (img.naturalWidth) or a video (video.videoWidth, via loadedmetadata).
// Returns null while loading or when there is no file. The dependencies are the
// filename + kind, so the size only re-fetches when either changes.
export const useRefSize = (
    filename?: string,
    kind?: 'image' | 'video',
): ImageSize | null => {
    const apiUrl = useApiURL();
    const [size, setSize] = useState<ImageSize | null>(null);

    useEffect(() => {
        let cancelled = false;
        setSize(null);
        if (!filename || !apiUrl) return;
        const url =
            apiUrl +
            '/api/view?subfolder=&type=input&filename=' +
            encodeURIComponent(filename);

        if (kind === 'video') {
            const video = document.createElement('video');
            video.muted = true;
            video.preload = 'metadata';
            const onMeta = () => {
                if (cancelled) return;
                if (video.videoWidth) {
                    setSize({
                        width: video.videoWidth,
                        height: video.videoHeight,
                    });
                }
            };
            video.addEventListener('loadedmetadata', onMeta, { once: true });
            video.addEventListener('error', () => {
                if (!cancelled) setSize(null);
            }, { once: true });
            video.src = url;
            return () => {
                cancelled = true;
            };
        }

        const img = new Image();
        img.onload = () => {
            if (!cancelled) {
                setSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
            }
        };
        img.onerror = () => {
            if (!cancelled) setSize(null);
        };
        img.src = url;
        return () => {
            cancelled = true;
        };
    }, [filename, kind, apiUrl]);

    return size;
};
