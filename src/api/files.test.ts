import { afterEach, describe, expect, it, vi } from 'vitest';
import { ensureFileOnServer } from './files';

const apiUrl = 'http://localhost:8188';
const file = new File(['x'], 'mod.safetensors', { type: 'application/octet-stream' });

// fetch mock that routes by request method, like the ComfyUI server:
// HEAD /api/view? -> whether the file exists; POST /api/upload/image -> name
const makeFetch = (exists: boolean) =>
    vi.fn((_url: string, init?: { method?: string }) => {
        if (init?.method === 'HEAD') {
            return Promise.resolve({ ok: exists });
        }
        return Promise.resolve({
            json: () => Promise.resolve({ name: 'uploaded.safetensors' }),
        });
    });

describe('ensureFileOnServer', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reuses the filename when the file is still on the server', async () => {
        const fetchMock = makeFetch(true);
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, 'existing.safetensors', apiUrl);

        expect(name).toBe('existing.safetensors');
        // only the HEAD check, no upload
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('uploads when the stored filename is no longer on the server', async () => {
        const fetchMock = makeFetch(false);
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, 'gone.safetensors', apiUrl);

        expect(name).toBe('uploaded.safetensors');
        // HEAD check (404) + upload POST
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('uploads when no filename is stored yet', async () => {
        const fetchMock = makeFetch(true);
        vi.stubGlobal('fetch', fetchMock);

        const name = await ensureFileOnServer(file, undefined, apiUrl);

        expect(name).toBe('uploaded.safetensors');
        // no HEAD check, straight to upload
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
