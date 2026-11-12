import { describe, expect, it } from 'vitest';
import { NodeRef, Workflow, isNodeRef } from '../../api/graph';
import { controlType } from '../../redux/config';
import { applyH3ICustomAspect } from './H3ICustomAspectHandler';

const control: controlType = {
    id: 'handle',
    field: 'value',
    cond_node_id: '32',
    megapixels_node_id: '56',
    align_node_id: '48',
    size_node_id: '50',
};

const makeApi = (): Workflow => ({
    '32': {
        inputs: {
            prompt: ['43', 0],
            width: ['50', 0],
            height: ['50', 1],
            'images.image_0': ['45', 0],
        },
        class_type: 'MiniMaxH3ImageConditioning',
    },
    '45': { inputs: { image: 'a.png' }, class_type: 'LoadImage' },
    '43': {
        inputs: { value: 'Prompt' },
        class_type: 'PrimitiveStringMultiline',
    },
    '48': {
        inputs: {
            resize_type: 'scale to multiple',
            'resize_type.multiple': 32,
            scale_method: 'area',
            input: ['56', 0],
        },
        class_type: 'ResizeImageMaskNode',
    },
    '50': { inputs: { image: ['48', 0] }, class_type: 'GetImageSize' },
    '56': {
        inputs: {
            resize_type: 'scale total pixels',
            'resize_type.megapixels': 4,
            scale_method: 'area',
            input: ['45', 0],
        },
        class_type: 'ResizeImageMaskNode',
    },
});

/** The id of the node feeding a conditioning input. */
const sourceOf = (api: Workflow, field: string): string => (
    api['32'].inputs[field] as NodeRef
)[0];

describe('applyH3ICustomAspect', () => {
    it('leaves the picture chain alone while the toggle is off', () => {
        const api = makeApi();
        applyH3ICustomAspect(api, { enabled: false }, control, 6);

        expect(api['32'].inputs.width).toEqual(['50', 0]);
        expect(api['50']).toBeDefined();
        expect(api['56']).toBeDefined();
    });

    it('replaces the measured size with a ResolutionSelector', () => {
        const api = makeApi();
        applyH3ICustomAspect(
            api,
            { enabled: true, aspect_ratio: '16:9 (Wide)' },
            control,
            6,
        );

        const width = sourceOf(api, 'width');
        expect(api[width].class_type).toBe('ResolutionSelector');
        expect(api[width].inputs.aspect_ratio).toBe('16:9 (Wide)');
        expect(api[width].inputs.megapixels).toBe(6);
        expect(api[width].inputs.multiple).toBe(32);
        expect(api['32'].inputs.height).toEqual([width, 1]);
        // the chain only existed to measure the canvas
        expect(api['56']).toBeUndefined();
        expect(api['48']).toBeUndefined();
        expect(api['50']).toBeUndefined();
    });

    it('takes the rounding multiple from the align node of the workflow', () => {
        const api = makeApi();
        api['48'].inputs['resize_type.multiple'] = 16;
        applyH3ICustomAspect(
            api,
            { enabled: true, aspect_ratio: '1:1 (Square)' },
            control,
            4,
        );

        expect(api[sourceOf(api, 'width')].inputs.multiple).toBe(16);
    });

    it('keeps the picture chain when the control names no size node', () => {
        const api = makeApi();
        applyH3ICustomAspect(
            api,
            { enabled: true, aspect_ratio: '1:1 (Square)' },
            { ...control, size_node_id: undefined },
            4,
        );

        expect(api['32'].inputs.width).toEqual(['50', 0]);
        expect(api['50']).toBeDefined();
    });

    it('never leaves a conditioning input pointing at a deleted node', () => {
        const api = makeApi();
        const canvas = { enabled: true, aspect_ratio: '3:2 (Landscape)' };
        applyH3ICustomAspect(api, canvas, control, 8);

        const dead = Object.entries(api).flatMap(([id, node]) =>
            Object.entries(node.inputs)
                .filter(([, v]) => isNodeRef(v) && !api[v[0]])
                .map(([field]) => `${id}.${field}`),
        );
        expect(dead).toEqual([]);
    });
});
