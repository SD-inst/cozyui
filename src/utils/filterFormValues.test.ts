import { describe, expect, it } from 'vitest';
import { filterFormValues } from './filterFormValues';

describe('filterFormValues', () => {
    it('removes mask fields', () => {
        const out = filterFormValues({
            mask: new Uint8Array([1, 2, 3]),
            prompt: 'test',
        });
        expect(out).toEqual({ prompt: 'test' });
    });

    it('drops arrays with more than 1000 elements', () => {
        const big = Array.from({ length: 1001 }, (_, i) => i);
        const out = filterFormValues({ big, small: [1, 2, 3] });
        expect(out.big).toBeUndefined();
        expect(out.small).toEqual([1, 2, 3]);
    });

    it('recurses into nested objects', () => {
        const out = filterFormValues({ a: { mask: 'x', b: { c: 1 } } });
        expect(out.a).toEqual({ b: { c: 1 } });
    });

    it('removes TypedArray views from arrays but keeps objects', () => {
        const out = filterFormValues({
            refs: [new Uint8Array([1]), { filename: 'a.mp4' }],
        });
        expect(out.refs).toEqual([{ filename: 'a.mp4' }]);
    });

    it('passes primitives and null through unchanged', () => {
        expect(filterFormValues(42)).toBe(42);
        expect(filterFormValues('x')).toBe('x');
        expect(filterFormValues(null)).toBe(null);
    });
});
