import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../components/history/db';
import { registerUpload } from './uploadStore';
import { mergeResolved, resolveHistoryValues } from './restoreHistory';

const apiUrl = 'http://localhost:8188';

const file = (name: string, body: string) =>
    new File([body], name, { type: 'image/png' });

// `existing` is what the server still holds; every other name 404s. Uploads
// get `uploadedName`, and `uploads` records how many were attempted.
const makeFetch = (existing: string[], uploadedName: string) => {
    const uploads: string[] = [];
    const mock = vi.fn(async (url: string, init?: { method?: string }) => {
        if (init?.method === 'HEAD') {
            const filename = new URL(url).searchParams.get('filename') ?? '';
            return existing.includes(filename)
                ? {
                      ok: true,
                      headers: { get: () => '5' },
                  }
                : { ok: false, status: 404 };
        }
        uploads.push(new URL(url).searchParams.get('name') ?? uploadedName);
        return { ok: true, json: async () => ({ name: uploadedName }) };
    });
    return { mock, uploads };
};

describe('resolveHistoryValues', () => {
    beforeEach(async () => {
        await db.uploads.clear();
        await db.uploadAliases.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('leaves a field alone when its file cannot be restored', async () => {
        const { mock, uploads } = makeFetch([], '1740_uploaded.png');
        vi.stubGlobal('fetch', mock);

        const { values, lost } = await resolveHistoryValues({
            values: { image: '1700_gone.png', steps: 30 },
            current: { image: '1730_live.png', steps: 12 },
            apiUrl,
        });

        // The dead name never reaches the form, and the working file it would
        // have displaced stays; the non-media field still comes from the entry.
        expect(values).toEqual({ steps: 30 });
        expect(lost).toEqual(['1700_gone.png']);
        expect(uploads).toEqual([]);
    });

    it('brings a file back from a local copy under a new name', async () => {
        await registerUpload('1700_gone.png', file('cat.png', 'cat-bytes'));
        const { mock, uploads } = makeFetch([], '1740_uploaded.png');
        vi.stubGlobal('fetch', mock);

        const { values, restored, lost } = await resolveHistoryValues({
            values: { image: '1700_gone.png' },
            current: {},
            apiUrl,
        });

        expect(values).toEqual({ image: '1740_uploaded.png' });
        expect(restored).toEqual([
            { from: '1700_gone.png', to: '1740_uploaded.png' },
        ]);
        expect(lost).toEqual([]);
        expect(uploads).toHaveLength(1);
    });

    it('reuses the identical file the form already holds', async () => {
        // The same photo re-uploaded: the bytes are one copy under two names,
        // and the form works with the newer one.
        await registerUpload('1700_old.png', file('cat.png', 'cat-bytes'));
        await registerUpload('1730_new.png', file('cat.png', 'cat-bytes'));
        const { mock, uploads } = makeFetch(['1730_new.png'], '1740_new.png');
        vi.stubGlobal('fetch', mock);

        const { values, reused, restored } = await resolveHistoryValues({
            values: { image: '1700_old.png' },
            current: { image: '1730_new.png' },
            apiUrl,
        });

        // Nothing is uploaded: the working file is the same content, so the
        // slot keeps it instead of gaining a duplicate.
        expect(values).toEqual({ image: '1730_new.png' });
        expect(reused).toEqual([{ from: '1700_old.png', to: '1730_new.png' }]);
        expect(restored).toEqual([]);
        expect(uploads).toEqual([]);
    });
});

describe('mergeResolved', () => {
    it('keeps the file a slot already has when the entry cannot provide one', async () => {
        const merged = mergeResolved(
            { ref_images: [{ image: '1700_gone.png', seed: 7 }, {}] },
            { ref_images: [{ image: '1730_live.png', seed: 1 }] },
            {},
        );

        // The first slot keeps the working file instead of the dead name; the
        // second held no media at all, so it stays as the entry had it.
        expect(merged.ref_images).toEqual([
            { image: '1730_live.png', seed: 1 },
            {},
        ]);
    });

    it('drops a slot whose file is gone and that has nothing to keep', async () => {
        const merged = mergeResolved(
            { ref_images: [{ image: '1700_gone.png' }] },
            { ref_images: [] },
            {},
        );

        expect(merged.ref_images).toEqual([]);
    });

    it('rewrites a slot to the name the file came back under', async () => {
        const merged = mergeResolved(
            { ref_images: [{ image: '1700_gone.png', seed: 7 }] },
            {},
            { '1700_gone.png': '1740_uploaded.png' },
        );

        expect(merged.ref_images).toEqual([
            { image: '1740_uploaded.png', seed: 7 },
        ]);
    });
});
