import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../components/history/db';
import {
    dropCopiesLostByTab,
    lookupUpload,
    registerUpload,
    renameUpload,
} from './uploadStore';

const file = (name: string, body = 'bytes') =>
    new File([body], name, { type: 'image/png' });

describe('uploadStore', () => {
    beforeEach(async () => {
        await db.uploads.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('stores a file under the name the server returned', async () => {
        await registerUpload('1730_cat.png', file('cat.png'), {
            tab: 'Flux Kontext',
            field: 'image',
        });

        const record = await db.uploads.get('1730_cat.png');
        // The user's original filename is irrelevant to the lookup: the server
        // name is the identity everything else in the app holds.
        expect(record?.filename).toBe('1730_cat.png');
        expect(record?.size).toBe('bytes'.length);
        expect(await lookupUpload('1730_cat.png')).toBeDefined();

        expect(await lookupUpload('cat.png')).toBeUndefined();
    });

    it('follows a re-upload to the new server name', async () => {
        await registerUpload('old.png', file('old.png'));
        await renameUpload('old.png', 'new.png');

        expect(await lookupUpload('old.png')).toBeUndefined();
        expect(await lookupUpload('new.png')).toBeDefined();
    });

    it('keeps the record when renaming onto itself', async () => {
        await registerUpload('same.png', file('same.png'));
        await renameUpload('same.png', 'same.png');

        expect(await lookupUpload('same.png')).toBeDefined();
    });
});

describe('dropCopiesLostByTab', () => {
    beforeEach(async () => {
        await db.uploads.clear();
        await db.formState.clear();
    });

    const saved = (state: any) => JSON.stringify(state);

    it('drops the copy of a file the tab removed', async () => {
        await db.uploads.put({
            id: '1730_cat.png',
            filename: '1730_cat.png',
            file: file('cat.png'),
            lastUsedAt: 1,
        });
        // The row is written before the drop runs, as the save effect does.
        await db.formState.put({
            tab: 'R2V',
            state: saved({ ref_images: [{}, {}] }),
        });

        await dropCopiesLostByTab(
            saved({ ref_images: [{ image: '1730_cat.png' }, {}] }),
            saved({ ref_images: [{}, {}] }),
        );

        expect(await db.uploads.get('1730_cat.png')).toBeUndefined();
    });

    it('keeps a copy another tab still references', async () => {
        await db.uploads.put({
            id: '1730_cat.png',
            filename: '1730_cat.png',
            file: file('cat.png'),
            lastUsedAt: 1,
        });
        await db.formState.bulkPut([
            { tab: 'R2V', state: saved({ ref_images: [] }) },
            { tab: 'Upscale', state: saved({ image: '1730_cat.png' }) },
        ]);

        await dropCopiesLostByTab(
            saved({ ref_images: [{ image: '1730_cat.png' }] }),
            saved({ ref_images: [] }),
        );

        expect(await db.uploads.get('1730_cat.png')).toBeDefined();
    });

    it('keeps a copy a skipped entry still holds', async () => {
        await db.uploads.put({
            id: '1730_cat.png',
            filename: '1730_cat.png',
            file: file('cat.png'),
            lastUsedAt: 1,
        });
        const state = saved({
            ref_images: [{ image: '1730_cat.png', skip: true }],
        });
        await db.formState.put({ tab: 'R2V', state });

        await dropCopiesLostByTab(state, state);

        expect(await db.uploads.get('1730_cat.png')).toBeDefined();
    });

    it('ignores a wholesale empty state (initialization or reset)', async () => {
        await db.uploads.put({
            id: '1730_cat.png',
            filename: '1730_cat.png',
            file: file('cat.png'),
            lastUsedAt: 1,
        });
        await db.formState.put({ tab: 'R2V', state: saved({}) });

        await dropCopiesLostByTab(
            saved({ ref_images: [{ image: '1730_cat.png' }] }),
            '{}',
        );

        expect(await db.uploads.get('1730_cat.png')).toBeDefined();
    });
});

describe('ensureUploadStoreReady', () => {
    // The startup pass runs once per process; each case seeds its rows before
    // it, and the memoized promise is reset by reloading the module.
    const freshStore = async () => {
        vi.resetModules();
        return import('./uploadStore');
    };

    beforeEach(async () => {
        await db.uploads.clear();
        await db.formState.clear();
    });

    it('re-keys a positional backup onto the name its tab still holds', async () => {
        await db.uploads.put({ id: 'Flux Kontext/image', file: file('cat.png') });
        await db.uploads.put({
            id: 'R2V/ref_images.2.image',
            file: file('dog.png'),
        });
        await db.formState.bulkPut([
            { tab: 'Flux Kontext', state: JSON.stringify({ image: '1730_cat.png' }) },
            {
                tab: 'R2V',
                state: JSON.stringify({
                    ref_images: [{}, {}, { image: '1731_dog.png' }],
                }),
            },
        ]);

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await store.lookupUpload('1730_cat.png')).toBeDefined();
        expect(await store.lookupUpload('1731_dog.png')).toBeDefined();
        // The positional rows are gone, so nothing keeps two copies around.
        expect(await db.uploads.get('Flux Kontext/image')).toBeUndefined();
        expect(await db.uploads.get('R2V/ref_images.2.image')).toBeUndefined();
    });

    it('drops a backup no form value references anymore', async () => {
        await db.uploads.put({ id: 'Gone/tab.field', file: file('x.png') });

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await db.uploads.count()).toBe(0);
    });

    it('is a no-op once every record carries a filename', async () => {
        await db.uploads.put({
            id: 'kept.png',
            filename: 'kept.png',
            file: file('kept.png'),
        });

        const store = await freshStore();
        await store.ensureUploadStoreReady();
        await store.ensureUploadStoreReady();

        expect(await store.lookupUpload('kept.png')).toBeDefined();
    });
});
