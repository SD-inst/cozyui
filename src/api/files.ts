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

export const uploadFile = async (
    file: File,
    apiUrl: string,
): Promise<string> => {
    const formData = new FormData();
    const name = new Date().getTime() + '_' + file.name;
    formData.append('image', new File([file], name, { type: file.type }));
    const r = await fetch(apiUrl + '/api/upload/image', {
        method: 'POST',
        body: formData,
        signal: timedSignal(),
    });
    const j = await r.json();
    if (!j.name) {
        throw new Error('Upload failed: no name in response');
    }
    return j.name;
};

export const fileOnServer = async (
    filename: string,
    apiUrl: string,
): Promise<boolean> => {
    try {
        const r = await fetch(viewUrl(apiUrl, filename), {
            method: 'HEAD',
            signal: timedSignal(),
        });
        return r.ok;
    } catch {
        return false;
    }
};

/**
 * Ensure `file` is available on the server and return the filename to use.
 * If `filename` is given and still exists on the server, it is reused;
 * otherwise `file` is (re-)uploaded and the new server name is returned.
 */
export const ensureFileOnServer = async (
    file: File,
    filename: string | undefined,
    apiUrl: string,
): Promise<string> => {
    if (filename && (await fileOnServer(filename, apiUrl))) {
        return filename;
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
