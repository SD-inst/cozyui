import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../components/history/db';
import { createPreflightRun } from './filePreflightRun';

const apiUrl = 'http://localhost:8188';

// Each case uses its own filenames: the per-file restore budget lives for the
// whole module, and reusing a name would hit the cap.
const makeFetch = (
    existing: string[],
    missing: string[],
    unreachable: string[] = [],
    uploadedName = '1700000002000_uploaded.png',
) =>
    vi.fn((url: string, init?: { method?: string }) => {
        if (init?.method === 'HEAD') {
            const filename = new URL(url).searchParams.get('filename') ?? '';
            if (unreachable.includes(filename)) {
                return Promise.reject(new Error('offline'));
            }
            if (missing.includes(filename)) {
                return Promise.resolve({ ok: false, status: 404 });
            }
            if (existing.includes(filename)) {
                return Promise.resolve({ ok: true, status: 200 });
            }
            return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({
            json: () => Promise.resolve({ name: uploadedName }),
        });
    });

const formOf = (values: any) => {
    const setValues: Array<{ path: string; value: string }> = [];
    const setPath = (path: string, value: string) => {
        setValues.push({ path, value });
        const parts = path.split('.');
        let node: any = values;
        for (let i = 0; i < parts.length - 1; i++) {
            node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = value;
    };
    return {
        values,
        setValues,
        access: {
            getValues: () => values,
            setValue: (path: string, value: string) => setPath(path, value),
        },
    };
};

describe('createPreflightRun', () => {
    beforeEach(async () => {
        await db.uploads.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('re-uploads a missing file and rewrites the name everywhere', async () => {
        await db.uploads.put({
            id: '1700000001000_gone.png',
            filename: '1700000001000_gone.png',
            file: new File(['bytes'], 'cat.png'),
            lastUsedAt: 1,
        });
        const fetchMock = makeFetch(['1700000001001_here.png'], ['1700000001000_gone.png']);
        vi.stubGlobal('fetch', fetchMock);

        const form = formOf({
            image: '1700000001000_gone.png',
            model: 'ltx2/ltx-2-19b-dev-fp8.safetensors',
            ref_images: [{ image: '1700000001001_here.png' }],
        });
        const run = createPreflightRun(apiUrl);
        await run.values(form.access);

        expect(run.report.restored).toEqual([
            { from: '1700000001000_gone.png', to: '1700000002000_uploaded.png' },
        ]);
        expect(form.values.image).toBe('1700000002000_uploaded.png');
        expect(form.setValues).toEqual([
            { path: 'image', value: '1700000002000_uploaded.png' },
        ]);
        // The model selector was never probed: it is not an uploaded input.
        const probed = fetchMock.mock.calls
            .filter(([, init]: any) => init?.method === 'HEAD')
            .map(([url]: any) => new URL(url).searchParams.get('filename'));
        expect(probed).toEqual(['1700000001000_gone.png', '1700000001001_here.png']);

        // The second pass finds the restored name already confirmed and does no
        // extra requests.
        const before = fetchMock.mock.calls.length;
        await run.graph({
            api: {
                '98': {
                    class_type: 'LoadImage',
                    inputs: { image: '1700000002000_uploaded.png' },
                },
            },
            ...form.access,
        });
        expect(fetchMock.mock.calls.length).toBe(before);
        expect(run.report.lost).toEqual([]);
    });

    it('moves the stored copy onto the new server name', async () => {
        await db.uploads.put({
            id: '1700000001100_gone.png',
            filename: '1700000001100_gone.png',
            file: new File(['bytes'], 'cat.png'),
            lastUsedAt: 1,
        });
        vi.stubGlobal('fetch', makeFetch([], ['1700000001100_gone.png']));

        const form = formOf({ image: '1700000001100_gone.png' });
        const run = createPreflightRun(apiUrl);
        await run.values(form.access);

        expect(await db.uploads.get('1700000001100_gone.png')).toBeUndefined();
        expect(await db.uploads.get('1700000002000_uploaded.png')).toBeDefined();
    });

    it('reports a missing file it has no copy of', async () => {
        vi.stubGlobal('fetch', makeFetch([], ['1700000001200_gone.png']));

        const form = formOf({ image: '1700000001200_gone.png' });
        const run = createPreflightRun(apiUrl);
        await run.values(form.access);

        expect(run.report.lost).toEqual([
            { filename: '1700000001200_gone.png', where: 'image' },
        ]);
        expect(run.report.restored).toEqual([]);
        // Nothing was uploaded, and the field still names the old file.
        expect(form.values.image).toBe('1700000001200_gone.png');
    });

    it('treats an unreachable server as unknown and uploads nothing', async () => {
        await db.uploads.put({
            id: '1700000001300_maybe.png',
            filename: '1700000001300_maybe.png',
            file: new File(['bytes'], 'cat.png'),
            lastUsedAt: 1,
        });
        const fetchMock = makeFetch([], [], ['1700000001300_maybe.png']);
        vi.stubGlobal('fetch', fetchMock);

        const form = formOf({ image: '1700000001300_maybe.png' });
        const run = createPreflightRun(apiUrl);
        await run.values(form.access);

        expect(run.report.unreachable).toEqual([
            { filename: '1700000001300_maybe.png', where: 'image' },
        ]);
        expect(run.report.lost).toEqual([]);
        expect(fetchMock.mock.calls.filter(([, init]: any) => init?.method !== 'HEAD')).toHaveLength(0);
    });

    it('catches a stale name the handlers put into the graph', async () => {
        await db.uploads.put({
            id: '1700000001400_gone.png',
            filename: '1700000001400_gone.png',
            file: new File(['bytes'], 'cat.png'),
            lastUsedAt: 1,
        });
        vi.stubGlobal('fetch', makeFetch([], ['1700000001400_gone.png']));

        // The form holds the name in a nested object the value pass walks too,
        // so the graph pass only has to fix the node.
        const form = formOf({ i2i: { enabled: true, image: '1700000001400_gone.png' } });
        const run = createPreflightRun(apiUrl);
        await run.values(form.access);
        const api = {
            '98': {
                class_type: 'LoadImage',
                inputs: { image: '1700000001400_gone.png' },
            },
        };
        await run.graph({ api, ...form.access });

        expect(api['98'].inputs.image).toBe('1700000002000_uploaded.png');
        expect(form.values.i2i.image).toBe('1700000002000_uploaded.png');
    });
});
