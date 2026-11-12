import { describe, expect, it } from 'vitest';
import { NodeRef, Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { applyH3IImages } from './H3IImagesHandler';

const control: controlType = {
    id: 'handle',
    field: 'image',
    image_node_id: '45',
    cond_node_id: '32',
};

const makeApi = (): Workflow => ({
    '32': {
        inputs: { prompt: ['43', 0], 'images.image_0': ['45', 0] },
        class_type: 'MiniMaxH3ImageConditioning',
    },
    '45': { inputs: { image: 'old.png' }, class_type: 'LoadImage' },
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

/** The id of the node feeding a conditioning slot. */
const slotSource = (api: Workflow, nodeId: string, field: string): string => (
    api[nodeId].inputs[field] as NodeRef
)[0];

describe('applyH3IImages', () => {
    it('edits the first image and gives the rest their own LoadImage', () => {
        const api = makeApi();
        applyH3IImages(
            api,
            [{ image: 'a.png' }, { image: 'b.png' }, { image: 'c.png' }],
            control,
        );

        expect(api['45'].inputs.image).toBe('a.png');

        const ref2 = slotSource(api, '32', 'images.image_1');
        const ref3 = slotSource(api, '32', 'images.image_2');
        expect(api[ref2].inputs.image).toBe('b.png');
        expect(api[ref3].inputs.image).toBe('c.png');
    });

    it('passes every picture unscaled', () => {
        const api = makeApi();
        applyH3IImages(api, [{ image: 'a.png' }, { image: 'b.png' }], control);

        const edited = api[slotSource(api, '32', 'images.image_0')];
        const ref = api[slotSource(api, '32', 'images.image_1')];
        expect(edited.class_type).toBe('LoadImage');
        expect(ref.class_type).toBe('LoadImage');
        // the resize chain is left to the conditioning size alone
        expect(api['50'].inputs.image).toEqual(['48', 0]);
    });

    it('renumbers contiguously when a row is skipped or empty', () => {
        const api = makeApi();
        applyH3IImages(
            api,
            [
                { image: 'a.png' },
                { image: 'gone.png', skip: true },
                { image: '' },
                { image: 'd.png' },
            ],
            control,
        );

        const ref = api[slotSource(api, '32', 'images.image_1')];
        expect(ref.inputs.image).toBe('d.png');
        expect(api['32'].inputs['images.image_2']).toBeUndefined();
    });

    it('drops the slots of a previous run that had more images', () => {
        const api = makeApi();
        api['32'].inputs['images.image_1'] = ['5', 0];
        api['32'].inputs['images.image_2'] = ['6', 0];

        applyH3IImages(api, [{ image: 'a.png' }, { image: 'b.png' }], control);

        expect(api['32'].inputs['images.image_0']).toEqual(['45', 0]);
        expect(api['32'].inputs['images.image_2']).toBeUndefined();
    });

    it('runs on the edited image alone', () => {
        const api = makeApi();
        applyH3IImages(api, [{ image: 'a.png' }], control);
        expect(api['45'].inputs.image).toBe('a.png');
        expect(api['32'].inputs['images.image_0']).toEqual(['45', 0]);
        expect(api['32'].inputs['images.image_1']).toBeUndefined();
    });

    it('clears the stale slots but keeps the file with no image at all', () => {
        const api = makeApi();
        api['32'].inputs['images.image_1'] = ['5', 0];

        applyH3IImages(api, [], control);

        expect(api['32'].inputs['images.image_1']).toBeUndefined();
        // the tab locks Generate with no image, so nothing is overwritten
        expect(api['45'].inputs.image).toBe('old.png');
    });
});
