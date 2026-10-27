import { useCallback, useRef } from 'react';
import {
    ensureUploadsMigrated,
    lookupUpload,
} from '../utils/uploadStore';

// Recovery for a media element that stopped loading: the file its `src` points
// at is no longer on the server, so the locally stored copy is uploaded again
// and the field is handed the new name.
//
// `getFilename` names the file as the server knows it — the identity the local
// store is keyed by. `attempts` caps the recovery per file: the re-upload
// itself never fails (it succeeds and swaps the name), yet the media can still
// error out afterwards (e.g. a 416 from the server), and an uncapped
// onError → re-upload cycle would loop, creating a new duplicate file on the
// server on every turn.
export const useReuploadLost = <T,>(
    getFilename: (arg: T) => string | undefined,
    onLost: (filename: string) => void,
    onReupload: (file: File, filename: string, arg: T) => Promise<void>,
) => {
    const attempts = useRef<Record<string, number>>({});
    return useCallback(
        async (arg: T) => {
            const filename = getFilename(arg);
            if (!filename) {
                return;
            }
            await ensureUploadsMigrated();
            const file = await lookupUpload(filename);
            if (!file) {
                onLost(filename);
                return;
            }
            if ((attempts.current[filename] || 0) > 2) {
                return;
            }
            attempts.current[filename] = (attempts.current[filename] || 0) + 1;
            try {
                await onReupload(file, filename, arg);
            } catch {
                // Re-upload failed; the attempt cap above stops the loop.
            }
        },
        [getFilename, onLost, onReupload],
    );
};
