import { cleanUploadName } from '../utils/uploadName';

export class FileMissingError extends Error {
    constructor(filename: string) {
        super(`File not found on server: ${filename}`);
    }
}

// A cold container can take ~1 minute to start up. Any network probe that may
// have to wait for it (the refmod HEAD check, the warm-up) gets a generous
// timeout: long enough to survive a cold start, short enough that a dead server
// can't freeze a generation in WAITING forever.
export const FETCH_TIMEOUT_MS = 90_000;

// An AbortSignal that aborts after `ms`, so a stalled request fails instead of
// hanging indefinitely.
export const timedSignal = (ms = FETCH_TIMEOUT_MS): AbortSignal => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    controller.signal.addEventListener('abort', () => clearTimeout(id));
    return controller.signal;
};

const viewUrl = (apiUrl: string, filename: string): string => {
    const params = new URLSearchParams();
    params.set('subfolder', '');
    params.set('type', 'input');
    params.set('filename', filename);
    return apiUrl + '/api/view?' + params.toString();
};

// Upload a file into ComfyUI's `input` folder. The client prefixes the name
// with a timestamp so a re-sent file never collides with an older one, and the
// server may prefix it again on a collision — so the name in the response is
// the only reliable identity for the file afterwards. The File that was
// actually sent (renamed) comes back too: callers hand it to `onUpload`
// callbacks that expect the uploaded name.
// `name` overrides the generated one (crop dialogs and masks pick their own).
export const uploadToInputDir = async (
    file: File,
    apiUrl: string,
    options?: { name?: string },
): Promise<{ name: string; file: File }> => {
    const sent = new File(
        [file],
        options?.name ??
            new Date().getTime() + '_' + cleanUploadName(file.name),
        { type: file.type },
    );
    const formData = new FormData();
    formData.append('image', sent);
    const r = await fetch(apiUrl + '/api/upload/image', {
        method: 'POST',
        body: formData,
        signal: timedSignal(),
    });
    const j = await r.json();
    if (!j.name) {
        throw new Error('Upload failed: no name in response');
    }
    return { name: j.name, file: sent };
};

export const uploadFile = async (
    file: File,
    apiUrl: string,
): Promise<string> => (await uploadToInputDir(file, apiUrl)).name;

// What a HEAD probe against `/api/view` can conclude. Only a real HTTP 404
// means the file is gone; a timeout, a refused connection or a non-404 failure
// is "unknown" — treating those as "missing" makes a wedged server look like a
// mass deletion and triggers a storm of re-uploads.
export type FilePresence = 'present' | 'missing' | 'unknown';

export const probeFile = async (
    filename: string,
    apiUrl: string,
): Promise<FilePresence> => {
    try {
        const r = await fetch(viewUrl(apiUrl, filename), {
            method: 'HEAD',
            // Bypass the HTTP cache: a cached 200 would make us believe a file
            // still exists right after the server deleted it.
            cache: 'no-store',
            signal: timedSignal(),
        });
        if (r.ok) {
            return 'present';
        }
        return r.status === 404 ? 'missing' : 'unknown';
    } catch {
        return 'unknown';
    }
};

export const fileOnServer = async (
    filename: string,
    apiUrl: string,
): Promise<boolean> => (await probeFile(filename, apiUrl)) === 'present';

/**
 * Ensure `file` is available on the server and return the filename to use.
 * If `filename` is given and still exists on the server, it is reused;
 * otherwise `file` is (re-)uploaded and the new server name is returned.
 * When the server cannot be reached at all, the stored name is kept as is:
 * re-uploading a copy we cannot confirm to be lost only piles duplicates onto
 * whatever is still on the server.
 */
export const ensureFileOnServer = async (
    file: File,
    filename: string | undefined,
    apiUrl: string,
): Promise<string> => {
    if (filename) {
        const presence = await probeFile(filename, apiUrl);
        if (presence === 'present') {
            return filename;
        }
        if (presence === 'unknown') {
            return filename;
        }
    }
    return uploadFile(file, apiUrl);
};

export const getFileFromServer = async (
    filename: string,
    apiUrl: string,
): Promise<File> => {
    const r = await fetch(viewUrl(apiUrl, filename), { signal: timedSignal() });
    if (r.status === 404) {
        throw new FileMissingError(filename);
    }
    if (!r.ok) {
        throw new Error(`Failed to fetch file ${filename}: HTTP ${r.status}`);
    }
    const blob = await r.blob();
    return new File([blob], filename, { type: blob.type });
};
