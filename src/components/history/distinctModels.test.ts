import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { distinctModels } from './filter';
import { db, markEnum, TaskResult } from './db';

// The history `modelOptions` filter lists the distinct models used so far. Two
// properties matter and nothing else guarantees them: the query must stay
// index-only (the history can hold thousands of records carrying Blobs), and it
// must not open its key cursor in the `nextunique` direction — WebKit throws
// `UnknownError: Unable to open cursor` for that on a database without rows and
// afterwards every operation on that database stops completing (Dexie.js #1030
// / #1052; it blanked the whole app for an iPhone user on a fresh install).
describe('distinctModels', () => {
    const record = (model: string): TaskResult =>
        ({
            timestamp: 1,
            duration: 1,
            url: 'x',
            node_id: '1',
            type: 'images',
            mark: markEnum.NONE,
            params: JSON.stringify({ tab: 't', values: { model } }),
        }) as TaskResult;

    beforeEach(async () => {
        await db.open();
        await db.taskResults.clear();
    });
    afterEach(async () => {
        await db.taskResults.clear();
    });

    it('returns the distinct models, sorted, without the empty ones', async () => {
        await db.taskResults.bulkAdd([
            record('flux.safetensors'),
            record('flux.safetensors'),
            record('wan.safetensors'),
            record('wan.safetensors'),
            record('wan.safetensors'),
            record(''), // no model (empty)
        ]);

        expect(await distinctModels()).toEqual([
            'flux.safetensors',
            'wan.safetensors',
        ]);
    });

    it('answers an empty history without failing', async () => {
        expect(await distinctModels()).toEqual([]);
    });

    it('walks the model index only, and never with a `nextunique` cursor', async () => {
        await db.taskResults.bulkAdd([
            record('flux.safetensors'),
            record('wan.safetensors'),
        ]);
        const cursorSource = IDBIndex.prototype as unknown as {
            openKeyCursor: (
                query?: IDBKeyRange | null,
                direction?: IDBCursorDirection,
            ) => IDBRequest;
            openCursor: (
                query?: IDBKeyRange | null,
                direction?: IDBCursorDirection,
            ) => IDBRequest;
        };
        const keyCursor = vi.spyOn(cursorSource, 'openKeyCursor');
        const valueCursor = vi.spyOn(cursorSource, 'openCursor');

        await distinctModels();

        expect(keyCursor.mock.calls.length).toBeGreaterThan(0);
        for (const call of keyCursor.mock.calls) {
            expect(call[1]).not.toBe('nextunique');
        }
        // Index keys only: no record, and therefore no Blob, is ever loaded.
        expect(valueCursor.mock.calls.length).toBe(0);

        keyCursor.mockRestore();
        valueCursor.mockRestore();
    });
});
