import { describe, expect, it } from 'vitest';
import { formatDuration } from './useTaskDuration';

describe('formatDuration', () => {
    it('formats minutes and seconds with zero padding', () => {
        expect(formatDuration(0)).toBe('00:00');
        expect(formatDuration(59)).toBe('00:59');
        expect(formatDuration(60)).toBe('01:00');
        expect(formatDuration(83)).toBe('01:23');
    });

    it('floors fractional seconds', () => {
        expect(formatDuration(83.7)).toBe('01:23');
        expect(formatDuration(0.9)).toBe('00:00');
    });

    it('handles durations over an hour', () => {
        expect(formatDuration(3661)).toBe('61:01');
    });
});
