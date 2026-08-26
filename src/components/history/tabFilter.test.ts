import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FilterType } from '../contexts/filterType';
import { db, markEnum, TaskResult } from './db';
import { pkFromFilter } from './filter';

// History records are indexed by `tab` (backfilled from params on create),
// so the tab / group filters must stay index-backed.
describe('history tab index and tab/group filters', () => {
    const record = (tab: string): TaskResult =>
        ({
            timestamp: 1,
            duration: 1,
            url: 'x',
            node_id: '1',
            type: 'images',
            mark: markEnum.NONE,
            params: JSON.stringify({ tab, values: {} }),
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
});
