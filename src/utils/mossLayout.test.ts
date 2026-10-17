import { describe, expect, it } from 'vitest';
import { compileMossPrompt, extractMossPrompt } from './mossLayout';

const layoutDraft = {
    width: 1536,
    height: 1024,
    bbox_coord_space: 'abs',
    bbox_format: 'xyxy',
    summary: {
        meta: ['product campaign', 'studio photography'],
        canvas: 'single',
        caption:
            'A warm studio campaign for a handmade ceramic cup, with an ivory backdrop, soft side lighting and restrained dark-green typography. Keep the ceramic texture tactile and the composition calm.',
    },
    items: [
        {
            label: 'object',
            caption:
                'An ivory ceramic cup with a rounded handle, fine speckled glaze and a soft contact shadow, photographed at a three-quarter angle.',
            bbox: [176, 224, 800, 864],
        },
        {
            label: 'text',
            caption:
                'Large dark-green Chinese title in crisp, moderately heavy lettering, with generous spacing and no backing panel.',
            text: '把日常，过成诗。',
            bbox: [928, 272, 1408, 448],
        },
        {
            label: 'text',
            caption:
                'Smaller dark-green Chinese supporting copy, comfortably legible on two lines.',
            text: '一杯温暖\n一刻从容',
            bbox: [928, 512, 1376, 656],
        },
    ],
};

describe('compileMossPrompt layout', () => {
    it('converts absolute xyxy boxes to centered yxyx like the official compiler', () => {
        const { prompt, width, height } = compileMossPrompt(layoutDraft);
        expect(width).toBe(1536);
        expect(height).toBe(1024);
        const compiled = JSON.parse(prompt);
        expect(compiled.bbox_coord_space).toBe('abs_centralized');
        expect(compiled.bbox_format).toBe('yxyx');
        expect(compiled.items[0].bbox).toEqual([-288, -592, 352, 32]);
        expect(compiled.items[1].bbox).toEqual([-240, 160, -64, 640]);
        expect(compiled.items[2].bbox).toEqual([0, 160, 144, 608]);
        // Unicode stays literal, single physical line, compact separators.
        expect(prompt).not.toContain('\n');
        expect(prompt).toContain('把日常，过成诗。');
        expect(prompt).toBe(JSON.stringify(compiled));
    });

    it('floors left/top and ceils right/bottom for fractional edges', () => {
        const draft = {
            width: 1024,
            height: 1024,
            bbox_coord_space: 'abs',
            bbox_format: 'xyxy',
            summary: { caption: 'A test scene.' },
            items: [
                {
                    label: 'object',
                    caption: 'A test object.',
                    bbox: [100.2, 200.7, 300.9, 400.1],
                },
            ],
        };
        const compiled = JSON.parse(compileMossPrompt(draft).prompt);
        // y1 floor: 200-512; x1 floor: 100-512; y2 ceil: 401-512; x2 ceil: 301-512
        expect(compiled.items[0].bbox).toEqual([-312, -412, -111, -211]);
    });

    it('rejects dimensions that are not multiples of 16', () => {
        expect(() =>
            compileMossPrompt({ ...layoutDraft, width: 1530 }),
        ).toThrow(/multiple of 16/);
    });

    it('rejects out-of-bounds boxes instead of clipping them', () => {
        const bad = structuredClone(layoutDraft);
        bad.items[0].bbox = [176, 224, 800, 1100];
        expect(() => compileMossPrompt(bad)).toThrow(/exceeds the 1536x1024 canvas/);
    });

    it('rejects text items without literal text', () => {
        const bad = structuredClone(layoutDraft);
        delete (bad.items[1] as Record<string, unknown>).text;
        expect(() => compileMossPrompt(bad)).toThrow(/text items require literal text/);
    });

    it('rejects unknown fields', () => {
        const bad = structuredClone(layoutDraft);
        (bad.items[0] as Record<string, unknown>).children = [];
        expect(() => compileMossPrompt(bad)).toThrow(/unknown fields/);
    });
});

describe('compileMossPrompt caption', () => {
    it('returns the caption text as-is', () => {
        const { prompt, width } = compileMossPrompt({
            caption: 'A cat sitting on a windowsill in soft morning light.',
        });
        expect(prompt).toBe('A cat sitting on a windowsill in soft morning light.');
        expect(width).toBeUndefined();
    });

    it('rejects caption drafts with extra fields', () => {
        expect(() =>
            compileMossPrompt({ caption: 'A cat.', width: 1024 }),
        ).toThrow(/unknown fields/);
    });
});

describe('extractMossPrompt', () => {
    it('passes plain prose through untouched', () => {
        const res = extractMossPrompt('A cat on a windowsill, golden hour light.');
        expect(res).toEqual({ kind: 'raw' });
    });

    it('compiles a fenced json layout draft and reports canvas size', () => {
        const message = 'Here is the layout:\n\n```json\n' + JSON.stringify(layoutDraft) + '\n```';
        const res = extractMossPrompt(message);
        expect(res.kind).toBe('layout');
        if (res.kind === 'layout') {
            expect(res.width).toBe(1536);
            expect(res.height).toBe(1024);
            expect(JSON.parse(res.prompt).bbox_coord_space).toBe('abs_centralized');
        }
    });

    it('unwraps a fenced caption draft', () => {
        const message =
            '```json\n' + JSON.stringify({ caption: 'A rainy neon street.' }) + '\n```';
        const res = extractMossPrompt(message);
        expect(res).toEqual({ kind: 'caption', prompt: 'A rainy neon street.' });
    });

    it('handles bare JSON without a fence', () => {
        const res = extractMossPrompt(JSON.stringify({ caption: 'A fox in snow.' }));
        expect(res).toEqual({ kind: 'caption', prompt: 'A fox in snow.' });
    });

    it('reports invalid drafts as errors', () => {
        const res = extractMossPrompt('```json\n{"width": 1530, "summary": ' + '{"caption": "x"}, "items": [], "bbox_coord_space": "abs", "bbox_format": "xyxy", "height": 1024}\n```');
        expect(res.kind).toBe('error');
        if (res.kind === 'error') {
            expect(res.message).toMatch(/multiple of 16/);
        }
    });

    it('reports truncated drafts as errors', () => {
        const res = extractMossPrompt('```json\n{"width": 1024, "height": 1024, "bbox_coord_space": "abs", "bbox_format": "xyxy", "summary": {"caption": "broken');
        expect(res.kind).toBe('error');
    });

    it('ignores non-draft fenced JSON', () => {
        const res = extractMossPrompt('Config: ```json\n{"some": "setting"}\n``` done');
        expect(res).toEqual({ kind: 'raw' });
    });
});
