import { describe, it, expect, vi } from 'vitest';
import { buildMerged, mergeLoras, stripNulls } from './applySnapshot';
import { walkMediaFields } from './mediaFields';

// buildMerged only calls toast on overflow; mock it to keep the test silent.
vi.mock('react-hot-toast', () => ({ toast: vi.fn() }));

const tr = (key: string) => key;

describe('stripNulls', () => {
    it('removes null/undefined fields', () => {
        const obj = { a: 1, b: null, c: undefined, d: 2 };
        expect(stripNulls(obj)).toEqual({ a: 1, d: 2 });
    });
});

describe('mergeLoras', () => {
    it('replaces matching ids in place and appends the rest', () => {
        const existing = [{ id: 'a.safetensors', strength: 0.5 }];
        const preset = [
            { id: 'a.safetensors', strength: 1 },
            { id: 'b.safetensors', strength: 2 },
        ];
        expect(mergeLoras(existing, preset)).toEqual([
            { id: 'a.safetensors', strength: 1 },
            { id: 'b.safetensors', strength: 2 },
        ]);
    });
});

describe('buildMerged', () => {
    it('replaces the whole form when the existing form is empty (session)', () => {
        const values = {
            model: 'x.safetensors',
            ref_images: [{ image: 'a.png' }, { image: 'b.png' }],
        };
        const refs = walkMediaFields(values);
        const mediaFields = new Set(refs.map((r) => r.field));
        const merged = buildMerged(
            values,
            refs,
            () => undefined, // empty existing form (after reset)
            { 'a.png': 'a.png', 'b.png': 'b.png' },
            mediaFields,
            {},
            tr,
            'sessions',
        );
        expect(merged).toEqual({
            model: 'x.safetensors',
            ref_images: [{ image: 'a.png' }, { image: 'b.png' }],
        });
    });

    it('carries a compound object media field (i2i) through without crashing', () => {
        // Krea2: i2i is a receiver field, so it is a known media field even
        // though its stored value is a compound object, not a string/array.
        const values = {
            prompt: '123',
            i2i: { enabled: false },
            model: 'x.safetensors',
        };
        const refs = walkMediaFields(values); // no ref for nested i2i
        const mediaFields = new Set([...refs.map((r) => r.field), 'i2i']);
        const merged = buildMerged(
            values,
            refs,
            () => undefined,
            {},
            mediaFields,
            {},
            tr,
            'sessions',
        );
        expect(merged).toEqual({
            prompt: '123',
            i2i: { enabled: false },
            model: 'x.safetensors',
        });
    });

    it('appends media and merges loras on top of the current form (preset)', () => {
        const values = {
            ref_images: [{ image: 'a.png' }, { image: 'existing.png' }],
            lora: [
                { id: 'existing.safetensors', strength: 1 },
                { id: 'new.safetensors', strength: 2 },
            ],
        };
        const refs = walkMediaFields(values);
        const mediaFields = new Set(refs.map((r) => r.field));
        const getValues = (name?: string) => {
            if (name === 'ref_images') {
                return [{ image: 'existing.png' }];
            }
            if (name === 'lora') {
                return [{ id: 'existing.safetensors', strength: 0.5 }];
            }
            return undefined;
        };
        const merged = buildMerged(
            values,
            refs,
            getValues,
            {
                'a.png': 'a.png',
                'existing.png': 'existing.png',
            },
            mediaFields,
            {},
            tr,
            'presets',
        );
        // ref_images: existing.png already present, only a.png appended
        expect(merged.ref_images).toEqual([
            { image: 'existing.png' },
            { image: 'a.png' },
        ]);
        // loras: existing replaced (strength 1), new appended
        expect(merged.lora).toEqual([
            { id: 'existing.safetensors', strength: 1 },
            { id: 'new.safetensors', strength: 2 },
        ]);
    });
});
