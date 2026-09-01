import { describe, expect, it } from 'vitest';
import { roomForNewSlots } from './arraySlots';

describe('roomForNewSlots', () => {
    it('adds all requested when max is unlimited (-1)', () => {
        expect(roomForNewSlots(2, -1, 5)).toBe(5);
    });
    it('caps the count at max', () => {
        expect(roomForNewSlots(7, 9, 5)).toBe(2);
    });
    it('returns 0 when already at max', () => {
        expect(roomForNewSlots(9, 9, 3)).toBe(0);
    });
    it('returns 0 when already over max', () => {
        expect(roomForNewSlots(10, 9, 3)).toBe(0);
    });
    it('returns all requested when room exceeds it', () => {
        expect(roomForNewSlots(0, 9, 3)).toBe(3);
    });
});
