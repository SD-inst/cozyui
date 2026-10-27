import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureFileOnServer, probeFile } from './files';

const apiUrl = 'http://localhost:8188';
const file = new File(['x'], 'mod.safetensors', { type: 'application/octet-stream' });

// fetch mock that routes by request method, like the ComfyUI server:
// HEAD /api/view? -> whether the file exists; POST /api/upload/image -> name
const makeFetch = (head: () => unknown) =>
    vi.fn((_url: string, init?: { method?: string; cache?: string }) => {
        if (init?.method === 'HEAD') {
            const r = head();
            return r instanceof Error
                ? Promise.reject(r)
                : Promise.resolve(r);
        }
        return Promise.resolve({
            json: () => Promise.resolve({ name: 'uploaded.safetensors' }),
        });
    });

const http = (status: number) => ({ ok: status === 200, status });

describe('probeFile', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reads a 200 as present and a 404 as missing', async () => {
        vi.stubGlobal('fetch', makeFetch(() => http(200)));
        expect(await probeFile('a.png', apiUrl)).toBe('present');

        vi.stubGlobal('fetch', makeFetch(() => http(404)));
        expect(await probeFile('a.png', apiUrl)).toBe('missing');
    });

    it('reads a dead server as unknown, never as missing', async () => {
        vi.stubGlobal('fetch', makeFetch(() => new Error('offline')));
        expect(await probeFile('a.png', apiUrl)).toBe('unknown');

        // A 5xx is the server failing, not the file being absent.
        vi.stubGlobal('fetch', makeFetch(() => http(502)));
        expect(await probeFile('a.png', apiUrl)).toBe('unknown');
    });
});

describe('ensureFileOnServer', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reuses the filename when the file is still on the server', async () => {
        const fetchMock = makeFetch(() => http(200));
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, 'existing.safetensors', apiUrl);

        expect(name).toBe('existing.safetensors');
        // only the HEAD check, no upload
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('HEAD existence check bypasses the HTTP cache', async () => {
        const fetchMock = makeFetch(() => http(404));
        vi.stubGlobal('fetch', fetchMock);

        await ensureFileOnServer(file, 'gone.safetensors', apiUrl);

        // The HEAD request (first call) must not be served from, nor update,
        // the browser cache — otherwise a stale 200 outlives server deletion.
        const [, headInit] = fetchMock.mock.calls[0] as [string, { cache?: string }];
        expect(headInit.cache).toBe('no-store');
    });

    it('uploads when the stored filename is no longer on the server', async () => {
        const fetchMock = makeFetch(() => http(404));
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, 'gone.safetensors', apiUrl);

        expect(name).toBe('uploaded.safetensors');
        // HEAD check (404) + upload POST
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('keeps the stored name while the server is unreachable', async () => {
        const fetchMock = makeFetch(() => new Error('offline'));
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, 'maybe.there.png', apiUrl);

        // No upload: an unreachable server must not look like a deleted file.
        expect(name).toBe('maybe.there.png');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('uploads when no filename is stored yet', async () => {
        const fetchMock = makeFetch(() => http(200));
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, undefined, apiUrl);

        expect(name).toBe('uploaded.safetensors');
        // no HEAD check, straight to upload
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
