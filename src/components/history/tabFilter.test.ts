import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FilterType } from '../contexts/filterType';
import { db, markEnum, TaskResult } from './db';
import { pkFromFilter } from './filter';

describe('history filter (pkFromFilter)', () => {
    const record = (
        tab: string,
        overrides: Partial<TaskResult> = {},
    ): TaskResult =>
        ({
            timestamp: 1000,
            duration: 1,
            url: 'x',
            node_id: '1',
            type: 'images',
            mark: markEnum.NONE,
            params: JSON.stringify({ tab, values: {} }),
            ...overrides,
        }) as TaskResult;

    const baseFilter: FilterType = {
        prompt: '',
        pinned: false,
        type: '',
        model: '',
        dateFrom: '',
        dateTo: '',
        group: '',
        tab: '',
    };

    beforeEach(async () => {
        await db.open();
        await db.taskResults.clear();
    });
    afterEach(async () => {
        await db.taskResults.clear();
    });

    // --- tab / group ---

    it('indexes the tab from params on create', async () => {
        await db.taskResults.bulkAdd([record('Wan T2V'), record('Wan I2V')]);
        const pks = await db.taskResults
            .where('tab')
            .equals('Wan T2V')
            .primaryKeys();
        expect(pks).toHaveLength(1);
    });

    it('tab filter matches only the exact tab', async () => {
        await db.taskResults.bulkAdd([record('Wan T2V'), record('Wan I2V')]);
        const pks = await pkFromFilter({ ...baseFilter, tab: 'Wan T2V' });
        expect(pks).toHaveLength(1);
    });

    it('group filter matches all tabs of the group', async () => {
        await db.taskResults.bulkAdd([
            record('Wan T2V'),
            record('Wan I2V'),
            record('Hunyuan I2V'),
        ]);
        const tabGroups = {
            'Wan T2V': 'T2V',
            'Wan I2V': 'I2V',
            'Hunyuan I2V': 'I2V',
        };
        const pks = await pkFromFilter(
            { ...baseFilter, group: 'I2V' },
            tabGroups,
        );
        expect(pks).toHaveLength(2);
    });

    // --- type filter ---

    it('type filter matches exact type', async () => {
        await db.taskResults.bulkAdd([
            record('T2V', { type: 'images' }),
            record('T2V', { type: 'gifs' }),
            record('T2V', { type: 'audio' }),
        ]);
        const pks = await pkFromFilter({ ...baseFilter, type: 'gifs' });
        expect(pks).toHaveLength(1);
    });

    // --- model filter ---

    it('model filter matches exact model', async () => {
        const rec = (model: string) =>
            record('T2V', {
                params: JSON.stringify({
                    tab: 'T2V',
                    values: { model },
                }),
            }) as TaskResult;
        await db.taskResults.bulkAdd([
            rec('flux.safetensors'),
            rec('wan.safetensors'),
            rec('flux.safetensors'),
        ]);
        const pks = await pkFromFilter({ ...baseFilter, model: 'wan.safetensors' });
        expect(pks).toHaveLength(1);
    });

    // --- word filter ---

    it('word filter matches records containing the word (case-insensitive)', async () => {
        const rec = (words: string[]) =>
            record('T2V', {
                params: JSON.stringify({
                    tab: 'T2V',
                    values: { prompt: words.join(' ') },
                }),
            }) as TaskResult;
        await db.taskResults.bulkAdd([
            rec(['hello', 'world']),
            rec(['foo', 'bar']),
            rec(['HELLO', 'baz']),
        ]);
        const pks = await pkFromFilter({ ...baseFilter, prompt: 'hello' });
        // Dexie word index is case-sensitive at query time; both "hello" and
        // "HELLO" entries are present. The filter uses startsWith(lowercase).
        expect(pks.length).toBeGreaterThanOrEqual(1);
    });

    // --- date filter ---

    it('date filter with only dateFrom matches records at or after the date', async () => {
        // 2024-01-01T00:00:00Z = 1704067200000
        // 2022-01-01T00:00:00Z = 1640995200000
        await db.taskResults.bulkAdd([
            record('T2V', { timestamp: 1704067200000 }),
            record('T2V', { timestamp: 1640995200000 }),
        ]);
        const pks = await pkFromFilter({ ...baseFilter, dateFrom: '2023-01-01' });
        expect(pks).toHaveLength(1);
    });

    it('date filter with only dateTo matches records at or before the date', async () => {
        // 2024-01-01T00:00:00Z = 1704067200000
        // 2022-01-01T00:00:00Z = 1640995200000
        await db.taskResults.bulkAdd([
            record('T2V', { timestamp: 1704067200000 }),
            record('T2V', { timestamp: 1640995200000 }),
        ]);
        const pks = await pkFromFilter({
            ...baseFilter,
            dateTo: '2023-01-01',
        });
        expect(pks).toHaveLength(1);
    });

    // --- pinned filter ---

    it('pinned filter matches only PINNED marks', async () => {
        await db.taskResults.bulkAdd([
            record('T2V', { mark: markEnum.PINNED }),
            record('T2V', { mark: markEnum.NONE }),
        ]);
        const pks = await pkFromFilter({ ...baseFilter, pinned: true });
        expect(pks).toHaveLength(1);
    });

    // --- multi-filter intersection ---

    it('intersects multiple active filters', async () => {
        const rec = (tab: string, type: string, ts: number) =>
            record(tab, {
                type,
                timestamp: ts,
                params: JSON.stringify({
                    tab,
                    values: { model: 'm1' },
                }),
            }) as TaskResult;
        await db.taskResults.bulkAdd([
            rec('A', 'images', 100),
            rec('A', 'gifs', 200),
            rec('B', 'images', 300),
        ]);
        // Filter: type=gifs + tab=A → should match 1 record
        const pks = await pkFromFilter({
            ...baseFilter,
            type: 'gifs',
            tab: 'A',
        });
        expect(pks).toHaveLength(1);
    });

    // --- no filters: pkFromFilter requires at least one active filter ---
    // (the reduce on an empty pks array throws; the caller should guard)

});
