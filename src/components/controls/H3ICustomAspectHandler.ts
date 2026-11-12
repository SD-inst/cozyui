import { Workflow } from '../../api/graph';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';

/**
 * The value of the custom-aspect control: the toggle plus the canvas picked
 * when it is on.
 */
export type H3ICustomAspectValue = {
    enabled?: boolean;
    aspect_ratio?: string;
};

/**
 * The canvas the selector falls back to — the same default the aspect list of
 * the text-to-image tab starts on.
 */
export const defaultH3ICanvasAspect = '1:1 (Square)';

/**
 * Give the H3 Image edit run a canvas the user chose instead of the one the
 * edited picture implies.
 *
 * By default the conditioning takes its width and height from `GetImageSize` of
 * the scaled and aligned copy of the edited picture. With the toggle on, a
 * `ResolutionSelector` is inserted — the same node the text-to-image tab works
 * with — and its outputs take those two inputs, so the aspect list and the
 * megapixel slider describe the result directly. The picture chain then has no
 * consumer left: it existed only to measure the canvas, and the conditioning
 * reads the uploaded files unscaled, so it is dropped from the run.
 *
 * Config control fields: `cond_node_id`, and the three nodes of the edited
 * picture — `megapixels_node_id`, `align_node_id` and `size_node_id` (the
 * `ResizeImageMaskNode`s and the `GetImageSize`). The multiple the selector
 * rounds its sizes to is read from the align node, so that rounding stays the
 * workflow's choice.
 */
export const applyH3ICustomAspect = (
    api: Workflow,
    value: H3ICustomAspectValue | undefined,
    control: controlType,
    megapixels: number,
): void => {
    const condId = control.cond_node_id;
    const scaleId = control.megapixels_node_id;
    const alignId = control.align_node_id;
    const sizeId = control.size_node_id;
    if (!value?.enabled || !condId || !api[condId] || !sizeId) {
        return;
    }
    const id = getFreeNodeId(api) + '';
    api[id] = {
        inputs: {
            aspect_ratio: value.aspect_ratio ?? defaultH3ICanvasAspect,
            megapixels,
            multiple:
                (alignId && api[alignId]?.inputs['resize_type.multiple']) ?? 32,
        },
        class_type: 'ResolutionSelector',
        _meta: { title: 'Custom canvas' },
    };
    api[condId].inputs.width = [id, 0];
    api[condId].inputs.height = [id, 1];
    [scaleId, alignId, sizeId].forEach((node) => {
        if (node) {
            delete api[node];
        }
    });
};
