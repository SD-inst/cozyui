import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settings } from '../hooks/settings';
import { db } from '../components/history/db';
import {
    lookupUpload,
    registerUpload,
    renameUpload,
    touchUpload,
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

    it('refuses to store a copy holding no bytes', async () => {
        const stored = await registerUpload(
            '1700000009000_empty.png',
            new File([], 'empty.png'),
        );

        expect(stored).toBe(false);
        expect(await db.uploads.get('1700000009000_empty.png')).toBeUndefined();
    });

    it('drops an empty copy instead of handing it out for a restore', async () => {
        // What a backup of a name the server never had looks like: a 404 body
        // is empty, and the old guard stored it as if it were the file.
        await db.uploads.put({
            id: '1700000009100_empty.png',
            filename: '1700000009100_empty.png',
            file: new File([], 'empty.png'),
            size: 0,
            lastUsedAt: 1,
        });

        expect(await lookupUpload('1700000009100_empty.png')).toBeUndefined();
        expect(await db.uploads.get('1700000009100_empty.png')).toBeUndefined();
    });
});

describe('retention', () => {
    const DAY = 24 * 60 * 60 * 1000;

    // Pruning runs in the startup pass, whose promise is memoized per module
    // instance, so each case reloads the module the way a fresh load would.
    const freshStore = async () => {
        vi.resetModules();
        return import('./uploadStore');
    };

    const copy = async (name: string, ageDays: number) => {
        await db.uploads.put({
            id: name,
            filename: name,
            file: file(name),
            lastUsedAt: Date.now() - ageDays * DAY,
        });
    };

    let restoreStorage: (() => void) | undefined;

    beforeEach(async () => {
        await db.uploads.clear();
        await db.formState.clear();
        await db.settings.delete(settings.upload_retention_days);
    });

    afterEach(() => {
        restoreStorage?.();
        restoreStorage = undefined;
    });

    it('keeps an unreferenced copy inside the retention window', async () => {
        await copy('1730_cat.png', 3);

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await store.lookupUpload('1730_cat.png')).toBeDefined();
    });

    it('drops a copy once it is past the window and no form names it', async () => {
        await copy('1730_cat.png', 30);

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await db.uploads.get('1730_cat.png')).toBeUndefined();
    });

    it('never ages out a copy a saved form state names', async () => {
        // A tab nobody opened for a year never gets a chance to refresh its own
        // copies, so age alone must not take the bytes its form points at.
        await copy('1730_cat.png', 365);
        await db.formState.put({
            tab: 'R2V',
            state: JSON.stringify({ ref_images: [{ image: '1730_cat.png' }] }),
        });

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await store.lookupUpload('1730_cat.png')).toBeDefined();
    });

    it('keeps everything when the window is set to 0', async () => {
        await db.settings.put({
            name: settings.upload_retention_days,
            value: '0',
        });
        await copy('1730_cat.png', 365);

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await store.lookupUpload('1730_cat.png')).toBeDefined();
    });

    it('follows use, not only restores', async () => {
        // The preflight touches a copy whose file the server still holds; with
        // no such touch the copies of a form used daily age out under the
        // user's hands.
        await copy('1730_cat.png', 30);
        await touchUpload('1730_cat.png');

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await store.lookupUpload('1730_cat.png')).toBeDefined();
    });

    it('shrinks to the storage budget from the copy nothing names first', async () => {
        const now = Date.now();
        await db.uploads.put({
            id: 'orphan.png',
            filename: 'orphan.png',
            file: file('orphan.png'),
            lastUsedAt: now,
        });
        await db.uploads.put({
            id: 'used.png',
            filename: 'used.png',
            file: file('used.png'),
            lastUsedAt: now - DAY,
        });
        await db.formState.put({
            tab: 'R2V',
            state: JSON.stringify({ image: 'used.png' }),
        });

        // Over budget exactly once, so the sweep stops after one deletion. The
        // copy it must give up is the one no form names — even though the copy
        // a form names is the older of the two.
        let estimates = 0;
        const original = Object.getOwnPropertyDescriptor(navigator, 'storage');
        Object.defineProperty(navigator, 'storage', {
            configurable: true,
            value: {
                estimate: async () => ({
                    quota: 1000,
                    usage: ++estimates === 1 ? 900 : 100,
                }),
            },
        });
        restoreStorage = () => {
            if (original) {
                Object.defineProperty(navigator, 'storage', original);
            } else {
                delete (navigator as { storage?: unknown }).storage;
            }
        };

        const store = await freshStore();
        await store.ensureUploadStoreReady();

        expect(await db.uploads.get('orphan.png')).toBeUndefined();
        expect(await db.uploads.get('used.png')).toBeDefined();
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

    it('clears an empty positional backup instead of re-keying it', async () => {
        // The regression this guards: the old guard backed up every array leaf,
        // including a ref mod slot's `id`, by fetching it from `/api/view`. That
        // 404s with an empty body, and re-keying the result onto the mod id made
        // the id itself look like a file this client had uploaded.
        const modId = '8a57fb00-e5d3-464c-bf57-f19c3dd216db';
        await db.uploads.put({
            id: 'R2V/refmods.0.id',
            file: new File([], modId),
            // The empty bytes are what marks such a record in a browser; jsdom's
            // IndexedDB polyfill does not keep Blob contents, so the recorded
            // size carries the same information here.
            size: 0,
        });
        await db.formState.put({
            tab: 'R2V',
            state: JSON.stringify({ refmods: [{ id: modId }] }),
        });

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
