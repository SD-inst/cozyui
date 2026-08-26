import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, markEnum, TaskResult } from './db';

// The history `modelOptions` query lists the distinct models used in history.
// It must be an index-only operation (no full record / Blob scan) and return
// only unique values, because the history can hold thousands of records.
describe('distinct model query (index-only, unique values)', () => {
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

    it('returns only distinct model values', async () => {
        await db.taskResults.bulkAdd([
            record('flux.safetensors'),
            record('flux.safetensors'),
            record('wan.safetensors'),
            record('wan.safetensors'),
            record('wan.safetensors'),
            record(''), // no model (empty)
        ]);

        const keys = await db.taskResults
            .where('model')
            .between(undefined, undefined, true, true)
            .uniqueKeys();
        const models = (keys as string[]).filter((m) => !!m).sort();

        expect(models).toEqual(['flux.safetensors', 'wan.safetensors']);
    });
});
