import { describe, expect, it, vi } from 'vitest';
import {
    collectGraphRefs,
    collectValueRefs,
    isFileCandidate,
    mapLimit,
    renameInGraph,
    renameInValues,
} from './filePreflight';

const noManifest = new Set<string>();

describe('isFileCandidate', () => {
    it('accepts names this client uploaded', () => {
        expect(isFileCandidate('1730000000000_cat.png', noManifest)).toBe(true);
        expect(isFileCandidate('1730000000000_clip.MP4', noManifest)).toBe(true);
        // A name without the upload prefix still counts once its bytes are
        // stored locally (a cross-tab send keeps the original name).
        expect(isFileCandidate('00042-2007314567.png', new Set(['00042-2007314567.png']))).toBe(true);
    });

    it('rejects model paths and anything the client never uploaded', () => {
        // Model/LoRA selectors name a subfolder of the models dir and cannot be
        // re-uploaded.
        expect(isFileCandidate('ltx2/ltx-2-19b-dev-fp8.safetensors', noManifest)).toBe(false);
        expect(isFileCandidate('wan_2_1_vae.safetensors', noManifest)).toBe(false);
        // A prompt, a placeholder or an output name is not an uploaded input.
        expect(isFileCandidate('a prompt about a cat.png', noManifest)).toBe(false);
        expect(isFileCandidate('image.jpg', noManifest)).toBe(false);
        expect(isFileCandidate('', noManifest)).toBe(false);
        expect(isFileCandidate(undefined, noManifest)).toBe(false);
        expect(isFileCandidate(42, noManifest)).toBe(false);
    });
});

describe('collectValueRefs', () => {
    it('reports the react-hook-form path of every leaf', () => {
        const refs = collectValueRefs(
            {
                prompt: 'a cat',
                image: '1700000001730_cat.png',
                ref_images: [
                    { image: '1700000001731_a.png' },
                    {},
                    { image: '1700000001732_c.png', strength: 0.5 },
                ],
                i2i: { enabled: true, image: '1700000001733_base.png', mask: new Uint8Array([1]) },
            },
            noManifest,
        );

        expect(refs.map((r) => [r.path, r.filename])).toEqual([
            ['image', '1700000001730_cat.png'],
            ['ref_images.0.image', '1700000001731_a.png'],
            ['ref_images.2.image', '1700000001732_c.png'],
            ['i2i.image', '1700000001733_base.png'],
        ]);
    });

    it('skips entries the generation handlers exclude', () => {
        const refs = collectValueRefs(
            {
                ref_images: [
                    { image: '1700000001730_kept.png' },
                    { image: '1700000001731_skipped.png', skip: true },
                    { image: '1700000001732_off.png', enabled: false },
                ],
            },
            noManifest,
        );

        expect(refs.map((r) => r.filename)).toEqual(['1700000001730_kept.png']);
    });

    it('walks a bare array of filenames', () => {
        const refs = collectValueRefs(
            { frames: ['1700000001730_a.png', '1700000001731_b.png'] },
            noManifest,
        );
        expect(refs.map((r) => r.path)).toEqual(['frames.0', 'frames.1']);
    });
});

describe('collectGraphRefs', () => {
    it('reads input-folder names out of the finished workflow', () => {
        const refs = collectGraphRefs(
            {
                '98': {
                    class_type: 'LoadImage',
                    inputs: { image: '1700000001730_cat.png' },
                },
                '99': {
                    class_type: 'VAEDecode',
                    inputs: { samples: ['12', 0], vae: ['7', 2] },
                },
                '101': {
                    class_type: 'SomeListNode',
                    inputs: { files: ['1700000001730_a.png', '1700000001731_b.png'] },
                },
            },
            noManifest,
        );

        expect(refs.map((r) => `${r.nodeId}.${r.field}=${r.filename}`)).toEqual([
            '98.image=1700000001730_cat.png',
            '101.files=1700000001730_a.png',
            '101.files=1700000001731_b.png',
        ]);
    });

    it('skips names already accounted for', () => {
        const refs = collectGraphRefs(
            {
                '1': { class_type: 'LoadImage', inputs: { image: '1700000001730_a.png' } },
                '2': { class_type: 'LoadImage', inputs: { image: '1700000001731_b.png' } },
            },
            noManifest,
            new Set(['1700000001730_a.png']),
        );

        expect(refs.map((r) => r.filename)).toEqual(['1700000001731_b.png']);
    });
});

describe('renameInValues', () => {
    it('rewrites every occurrence and reports the changed paths', () => {
        const values = {
            image: 'old.png',
            ref_images: [{ image: 'old.png' }, { image: 'other.png' }],
            i2i: { enabled: true, image: 'old.png' },
            seed: 12,
        };

        const result = renameInValues(values, { 'old.png': 'new.png' });

        expect(result.values).toEqual({
            image: 'new.png',
            ref_images: [{ image: 'new.png' }, { image: 'other.png' }],
            i2i: { enabled: true, image: 'new.png' },
            seed: 12,
        });
        expect(result.changed).toEqual([
            { path: 'image', filename: 'new.png' },
            { path: 'ref_images.0.image', filename: 'new.png' },
            { path: 'i2i.image', filename: 'new.png' },
        ]);
    });

    it('reports nothing when no name matches', () => {
        const result = renameInValues({ image: 'a.png' }, { 'gone.png': 'new.png' });
        expect(result.changed).toEqual([]);
        expect(result.values).toEqual({ image: 'a.png' });
    });
});

describe('renameInGraph', () => {
    it('rewrites names in place and leaves node links alone', () => {
        const api = {
            '98': { class_type: 'LoadImage', inputs: { image: 'old.png' } },
            '99': {
                class_type: 'VAEDecode',
                inputs: { samples: ['98', 0] as [string, number] },
            },
            '101': {
                class_type: 'ListNode',
                inputs: { files: ['old.png', 'keep.png'] },
            },
        };

        renameInGraph(api, { 'old.png': 'new.png' });

        expect(api['98'].inputs.image).toBe('new.png');
        expect(api['99'].inputs.samples).toEqual(['98', 0]);
        expect(api['101'].inputs.files).toEqual(['new.png', 'keep.png']);
    });
});

describe('mapLimit', () => {
    it('keeps the result order and never exceeds the limit', async () => {
        let inFlight = 0;
        let peak = 0;
        const items = [1, 2, 3, 4, 5, 6];

        const results = await mapLimit(items, 2, async (n) => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await Promise.resolve();
            inFlight--;
            return n * 2;
        });

        expect(results).toEqual([2, 4, 6, 8, 10, 12]);
        expect(peak).toBeLessThanOrEqual(2);
    });

    it('returns an empty result for no items', async () => {
        const fn = vi.fn();
        expect(await mapLimit([], 4, fn)).toEqual([]);
        expect(fn).not.toHaveBeenCalled();
    });
});
