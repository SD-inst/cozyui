import { describe, expect, it } from 'vitest';
import { refModThumbStyle } from './useRefMods';

describe('refModThumbStyle', () => {
    it('always renders a cover crop', () => {
        const style = refModThumbStyle(50, 50);
        expect(style.objectFit).toBe('cover');
        expect(style.width).toBe('100%');
        expect(style.height).toBe('100%');
    });

    it('maps offsets to object-position percentages', () => {
        expect(refModThumbStyle(50, 50).objectPosition).toBe('50% 50%');
        expect(refModThumbStyle(0, 0).objectPosition).toBe('0% 0%');
        expect(refModThumbStyle(100, 100).objectPosition).toBe('100% 100%');
    });

    it('maps 0/100 to the crop edges', () => {
        // horizontal: 0 = left, 100 = right
        expect(refModThumbStyle(0, 50).objectPosition).toBe('0% 50%');
        expect(refModThumbStyle(100, 50).objectPosition).toBe('100% 50%');
        // vertical: 0 = top, 100 = bottom
        expect(refModThumbStyle(50, 0).objectPosition).toBe('50% 0%');
        expect(refModThumbStyle(50, 100).objectPosition).toBe('50% 100%');
    });
});
