import { describe, it, expect } from 'vitest';
import { activeEntries, roomForNewSlots } from './arraySlots';

type Item = { image: string; skip?: boolean };

describe('activeEntries', () => {
    it('keeps entries without a skip flag', () => {
        const items: Item[] = [{ image: 'a' }, { image: 'b', skip: undefined }];
        expect(activeEntries(items)).toHaveLength(2);
    });

    it('treats skip=false as active', () => {
        const items: Item[] = [{ image: 'a', skip: false }];
        expect(activeEntries(items)).toHaveLength(1);
    });

    it('drops entries marked skip=true, preserving order', () => {
        const items: Item[] = [
            { image: 'a' },
            { image: 'b', skip: true },
            { image: 'c' },
            { image: 'd', skip: true },
        ];
        expect(activeEntries(items).map((e) => e.image)).toEqual(['a', 'c']);
    });

    it('handles null/undefined input', () => {
        expect(activeEntries(null)).toEqual([]);
        expect(activeEntries(undefined)).toEqual([]);
    });
});

describe('roomForNewSlots', () => {
    it('is unlimited when max is -1', () => {
        expect(roomForNewSlots(2, -1, 5)).toBe(5);
    });
    it('caps at the max', () => {
        expect(roomForNewSlots(4, 5, 10)).toBe(1);
    });
    it('never goes negative', () => {
        expect(roomForNewSlots(5, 5, 3)).toBe(0);
    });
});
