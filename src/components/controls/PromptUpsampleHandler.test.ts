import { describe, expect, it } from 'vitest';
import { controlType } from '../../redux/config';
import { Workflow } from '../../api/graph';
import { applyPromptUpsample } from './PromptUpsampleHandler';

const control: controlType = {
    id: 'handle',
    field: 'switch',
    node_id: '21',
    format_node_id: '19',
    format_field: 'values.b',
    preview_node_id: '17',
    aspect_field: 'aspect_ratio',
};

const makeApi = (): Workflow => ({
    '17': {
        inputs: { source: ['21', 0] },
        class_type: 'PreviewAny',
    },
    '19': {
        inputs: { f_string: 'Aspect ratio: {b}\nRequest: {a}', 'values.b': '16:9' },
        class_type: 'StringFormat',
    },
    '21': {
        inputs: { switch: true, on_true: ['20', 0], on_false: ['18', 0] },
        class_type: 'ComfySwitchNode',
    },
});

describe('applyPromptUpsample', () => {
    it('drives the switch and passes the selected aspect as W:H text', () => {
        const api = makeApi();
        applyPromptUpsample(api, true, control, '16:9 (Widescreen)');
        expect(api['21'].inputs.switch).toBe(true);
        expect(api['19'].inputs['values.b']).toBe('16:9');
        expect(api['17']).toBeDefined();
    });

    it('keeps the switch node for the disabled case, drops the text preview', () => {
        const api = makeApi();
        applyPromptUpsample(api, false, control, '2:3 (Portrait Photo)');
        expect(api['21'].inputs.switch).toBe(false);
        expect(api['21'].inputs.on_false).toEqual(['18', 0]);
        expect(api['19'].inputs['values.b']).toBe('2:3');
        // The upsampler branch is lazy, so only the preview of the unused text
        // has to go: with it gone the panel stops echoing the user's own prompt.
        expect(api['17']).toBeUndefined();
    });

    it('an unknown aspect label yields an empty ratio, never a stale one', () => {
        const api = makeApi();
        applyPromptUpsample(api, true, control, undefined);
        expect(api['19'].inputs['values.b']).toBe('');
    });

    it('a tab without a Format Text node still toggles the switch', () => {
        const api = makeApi();
        delete api['19'];
        applyPromptUpsample(api, false, { ...control }, '1:1 (Square)');
        expect(api['21'].inputs.switch).toBe(false);
    });
});
