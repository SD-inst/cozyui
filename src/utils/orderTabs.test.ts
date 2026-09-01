import { describe, expect, it } from 'vitest';
import { arrayMove, mergeOrder, reorderItems } from './orderTabs';

describe('arrayMove', () => {
    it('moves an item forward', () => {
        expect(arrayMove(['A', 'B', 'C'], 0, 2)).toEqual(['B', 'C', 'A']);
    });
    it('moves an item backward', () => {
        expect(arrayMove(['A', 'B', 'C'], 2, 0)).toEqual(['C', 'A', 'B']);
    });
    it('does not mutate the original array', () => {
        const original = ['A', 'B', 'C'];
        arrayMove(original, 0, 2);
        expect(original).toEqual(['A', 'B', 'C']);
    });
});

describe('mergeOrder', () => {
    const allGroups = ['T2V', 'T2I'];
    const allTabs = { T2V: ['A', 'B'], T2I: ['C'] };

    it('returns default order when no saved order', () => {
        const result = mergeOrder(undefined, allGroups, allTabs);
        expect(result.groups).toEqual(['T2V', 'T2I']);
        expect(result.tabs.T2V).toEqual(['A', 'B']);
        expect(result.tabs.T2I).toEqual(['C']);
    });

    it('returns default order when saved is empty', () => {
        const result = mergeOrder({ groups: [], tabs: {} }, allGroups, allTabs);
        expect(result.groups).toEqual(['T2V', 'T2I']);
    });

    it('keeps saved order for existing items', () => {
        const saved = {
            groups: ['T2I', 'T2V'],
            tabs: { T2I: ['C'], T2V: ['B', 'A'] },
        };
        const result = mergeOrder(saved, allGroups, allTabs);
        expect(result.groups).toEqual(['T2I', 'T2V']);
        expect(result.tabs.T2V).toEqual(['B', 'A']);
    });

    it('appends new groups and tabs to the end', () => {
        const newGroups = ['T2V', 'T2I', 'NEW'];
        const newTabs = { T2V: ['A', 'B'], T2I: ['C'], NEW: ['D', 'E'] };
        const saved = {
            groups: ['T2V', 'T2I'],
            tabs: { T2V: ['A', 'B'], T2I: ['C'] },
        };
        const result = mergeOrder(saved, newGroups, newTabs);
        expect(result.groups).toEqual(['T2V', 'T2I', 'NEW']);
        expect(result.tabs.NEW).toEqual(['D', 'E']);
    });

    it('appends a newly added tab to the end of its group', () => {
        const newTabs = { T2V: ['A', 'B', 'NEW_TAB'], T2I: ['C'] };
        const saved = {
            groups: ['T2V', 'T2I'],
            tabs: { T2V: ['A', 'B'], T2I: ['C'] },
        };
        const result = mergeOrder(saved, allGroups, newTabs);
        expect(result.tabs.T2V).toEqual(['A', 'B', 'NEW_TAB']);
    });

    it('drops removed groups and tabs from the saved order', () => {
        const saved = {
            groups: ['T2V', 'T2I', 'OLD'],
            tabs: { T2V: ['A', 'OLD_TAB'], T2I: ['C'], OLD: ['X'] },
        };
        const result = mergeOrder(saved, allGroups, allTabs);
        expect(result.groups).toEqual(['T2V', 'T2I']);
        // 'A' kept from saved, 'B' (current) appended, 'OLD_TAB' dropped
        expect(result.tabs.T2V).toEqual(['A', 'B']);
        expect(result.tabs.T2V).not.toContain('OLD_TAB');
    });

    it('preserves hidden tabs position (all tabs, not just visible)', () => {
        // allTabs includes a hidden tab 'H' — it should keep its saved position
        const allTabsWithHidden = { T2V: ['H', 'A', 'B'], T2I: ['C'] };
        const saved = {
            groups: ['T2V', 'T2I'],
            tabs: { T2V: ['H', 'A', 'B'], T2I: ['C'] },
        };
        const result = mergeOrder(saved, allGroups, allTabsWithHidden);
        expect(result.tabs.T2V).toEqual(['H', 'A', 'B']);
    });
});

describe('reorderItems', () => {
    it('moves item to the target position', () => {
        expect(reorderItems(['A', 'B', 'C'], 'A', 'C')).toEqual([
            'B',
            'C',
            'A',
        ]);
    });
    it('returns original array when activeId not found', () => {
        const original = ['A', 'B', 'C'];
        expect(reorderItems(original, 'Z', 'C')).toBe(original);
    });
    it('returns original array when overId not found', () => {
        const original = ['A', 'B', 'C'];
        expect(reorderItems(original, 'A', 'Z')).toBe(original);
    });
    it('returns original array when from equals to', () => {
        const original = ['A', 'B', 'C'];
        expect(reorderItems(original, 'A', 'A')).toBe(original);
    });
});
