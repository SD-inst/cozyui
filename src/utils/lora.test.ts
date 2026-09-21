import { describe, expect, it } from 'vitest';
import { reorderById } from './lora';

describe('reorderById', () => {
    const items = [
        { id: 'a.safetensors', label: 'a' },
        { id: 'b.safetensors', label: 'b' },
        { id: 'c.safetensors', label: 'c' },
    ];

    it('moves an item from the front to the end', () => {
        const result = reorderById(items, 'a.safetensors', 'c.safetensors');
        expect(result.map((i) => i.id)).toEqual([
            'b.safetensors',
            'c.safetensors',
            'a.safetensors',
        ]);
    });

    it('moves an item from the end to the front', () => {
        const result = reorderById(items, 'c.safetensors', 'a.safetensors');
        expect(result.map((i) => i.id)).toEqual([
            'c.safetensors',
            'a.safetensors',
            'b.safetensors',
        ]);
    });

    it('moves an item in the middle', () => {
        const result = reorderById(items, 'b.safetensors', 'c.safetensors');
        expect(result.map((i) => i.id)).toEqual([
            'a.safetensors',
            'c.safetensors',
            'b.safetensors',
        ]);
    });

    it('returns the same array reference when the id is not found', () => {
        expect(reorderById(items, 'x', 'c.safetensors')).toBe(items);
    });
});
