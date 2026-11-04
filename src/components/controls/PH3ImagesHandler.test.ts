import { describe, expect, it } from 'vitest';
import { NodeRef, Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import {
    applyPH3Images,
    upsamplerPictures,
} from './PH3ImagesHandler';

const control: controlType = {
    id: 'handle',
    field: 'image',
    image_node_id: '4',
    cond_node_id: '30',
    batch_node_id: '24',
    size_node_id: '22',
    format_node_id: '20',
    format_field: 'values.b',
};

const makeApi = (): Workflow => ({
    '4': { inputs: { image: 'old.png' }, class_type: 'LoadImage' },
    '20': {
        inputs: { f_string: '{b} {a}', 'values.b': '' },
        class_type: 'StringFormat',
    },
    '21': { inputs: { image: ['4', 0] }, class_type: 'ImageScaleToTotalPixels' },
    '22': { inputs: { image: ['21', 0] }, class_type: 'GetImageSize' },
    '24': { inputs: { 'images.image0': ['21', 0] }, class_type: 'BatchImagesNode' },
    '30': {
        inputs: { prompt: ['26', 0], 'images.image_1': ['31', 0] },
        class_type: 'PH3ImageConditioning',
    },
    '31': { inputs: { image: ['4', 0] }, class_type: 'ImageScaleToTotalPixels' },
});

const loadedBy = (api: Workflow, nodeId: string, field: string) => {
    const ref = api[nodeId].inputs[field] as NodeRef;
    return api[ref[0]];
};

describe('upsamplerPictures', () => {
    it('numbers the pictures contiguously from one', () => {
        expect(upsamplerPictures(3)).toBe(
            '<Picture 1>: <|vision_start|><|image_pad|><|vision_end|>' +
                '<Picture 2>: <|vision_start|><|image_pad|><|vision_end|>' +
                '<Picture 3>: <|vision_start|><|image_pad|><|vision_end|>',
        );
    });
});

describe('applyPH3Images', () => {
    it('edits the first image and wires the rest into both consumers', () => {
        const api = makeApi();
        applyPH3Images(
            api,
            [{ image: 'a.png' }, { image: 'b.png' }, { image: 'c.png' }],
            control,
        );

        expect(api['4'].inputs.image).toBe('a.png');
        expect(loadedBy(api, '30', 'images.image_2').inputs.image).toBe('b.png');
        expect(loadedBy(api, '30', 'images.image_3').inputs.image).toBe('c.png');

        const pad1 = api['24'].inputs['images.image1'] as NodeRef;
        const pad2 = api['24'].inputs['images.image2'] as NodeRef;
        expect(api[pad1[0]].class_type).toBe('ResizeAndPadImage');
        // the batch needs identical sizes: pad to the edited image's size
        expect(api[pad1[0]].inputs.image).toEqual([
            (api['30'].inputs['images.image_2'] as NodeRef)[0],
            0,
        ]);
        expect(api[pad1[0]].inputs.target_width).toEqual(['22', 0]);
        expect(api[pad1[0]].inputs.target_height).toEqual(['22', 1]);
        expect(api[pad2[0]].inputs.image).toEqual([
            (api['30'].inputs['images.image_3'] as NodeRef)[0],
            0,
        ]);
    });

    it('lists one picture line per image the upsampler is shown', () => {
        const api = makeApi();
        applyPH3Images(
            api,
            [{ image: 'a.png' }, { image: 'b.png' }, { image: 'c.png' }],
            control,
        );
        expect(api['20'].inputs['values.b']).toBe(upsamplerPictures(3));
    });

    it('renumbers contiguously when a row is skipped or empty', () => {
        const api = makeApi();
        applyPH3Images(
            api,
            [
                { image: 'a.png' },
                { image: 'gone.png', skip: true },
                { image: '' },
                { image: 'd.png' },
            ],
            control,
        );
        expect(loadedBy(api, '30', 'images.image_2').inputs.image).toBe('d.png');
        expect(api['30'].inputs['images.image_3']).toBeUndefined();
        expect(api['24'].inputs['images.image1']).toBeDefined();
        expect(api['24'].inputs['images.image2']).toBeUndefined();
        expect(api['20'].inputs['values.b']).toBe(upsamplerPictures(2));
    });

    it('drops the slots of a previous run that had more images', () => {
        const api = makeApi();
        api['30'].inputs['images.image_2'] = ['5', 0];
        api['30'].inputs['images.image_3'] = ['6', 0];
        api['24'].inputs['images.image1'] = ['7', 0];
        api['24'].inputs['images.image2'] = ['8', 0];

        applyPH3Images(api, [{ image: 'a.png' }, { image: 'b.png' }], control);

        expect(api['30'].inputs['images.image_1']).toEqual(['31', 0]);
        expect(api['24'].inputs['images.image0']).toEqual(['21', 0]);
        expect(loadedBy(api, '30', 'images.image_2').inputs.image).toBe('b.png');
        expect(api['30'].inputs['images.image_3']).toBeUndefined();
        expect(api['24'].inputs['images.image2']).toBeUndefined();
    });

    it('runs on the edited image alone', () => {
        const api = makeApi();
        applyPH3Images(api, [{ image: 'a.png' }], control);
        expect(api['4'].inputs.image).toBe('a.png');
        expect(api['30'].inputs['images.image_1']).toEqual(['31', 0]);
        expect(api['24'].inputs['images.image0']).toEqual(['21', 0]);
        expect(api['20'].inputs['values.b']).toBe(upsamplerPictures(1));
    });
});
