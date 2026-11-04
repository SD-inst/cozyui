import { describe, it, expect } from 'vitest';
import {
    ASPECT_LABELS,
    aspectRatio,
    aspectString,
    closestAspect,
} from './aspect';

describe('aspectRatio', () => {
    it('returns w/h for known labels', () => {
        expect(aspectRatio('4:3 (Standard)')).toBe(4 / 3);
        expect(aspectRatio('1:1 (Square)')).toBe(1);
        expect(aspectRatio('21:9 (Ultrawide)')).toBe(21 / 9);
    });
    it('returns 1 for unknown labels', () => {
        expect(aspectRatio('nope')).toBe(1);
    });
});

describe('aspectString', () => {
    it('drops the human-readable suffix', () => {
        expect(aspectString('16:9 (Widescreen)')).toBe('16:9');
        expect(aspectString('1:1 (Square)')).toBe('1:1');
        expect(aspectString('2:3 (Portrait Photo)')).toBe('2:3');
    });
    it('keeps a bare ratio of an unknown label, empty otherwise', () => {
        expect(aspectString('5:4 (Custom)')).toBe('5:4');
        expect(aspectString('landscape')).toBe('');
        expect(aspectString('')).toBe('');
    });
});

describe('closestAspect', () => {
    it('picks the nearest ratio', () => {
        expect(closestAspect(1.3)).toBe('4:3 (Standard)');
        expect(closestAspect(1.78)).toBe('16:9 (Widescreen)');
        expect(closestAspect(1.0)).toBe('1:1 (Square)');
    });
});

describe('ASPECT_LABELS', () => {
    it('exposes the shared choice list', () => {
        expect(ASPECT_LABELS).toContain('16:9 (Widescreen)');
        expect(ASPECT_LABELS.length).toBe(8);
    });
});
