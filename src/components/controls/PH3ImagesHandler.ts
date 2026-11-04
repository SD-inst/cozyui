import { Workflow } from '../../api/graph';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { activeEntries } from '../../utils/arraySlots';

/**
 * One row of the P-H3 image array.
 */
export type PH3ImageEntry = {
    image?: string;
    skip?: boolean;
};

/**
 * A row that actually carries a file, i.e. one that reaches the graph.
 */
type PH3ActiveImage = { image: string; skip?: boolean };

/**
 * The `<Picture N>` token line the P-H3 image prompt upsampler is trained on.
 * The model is shown the images as a batch and reads them in this order, so
 * the lines have to be contiguous and in the same order as the batch slots.
 */
export const upsamplerPictures = (count: number): string =>
    Array.from(
        { length: count },
        (_, i) =>
            `<Picture ${i + 1}>: <|vision_start|><|image_pad|><|vision_end|>`,
    ).join('');

/**
 * Drop the reference slots a previous run left behind, keeping only the
 * primary image. `BatchImagesNode` numbers its slots from 0 (`images.image0`),
 * `PH3ImageConditioning` from 1 (`images.image_1`), so the two nodes are
 * cleared with their own pattern.
 */
const clearSlots = (
    api: Workflow,
    id: string,
    pattern: RegExp,
    keep: number,
): void => {
    const node = api[id];
    if (!node) {
        return;
    }
    for (const key of Object.keys(node.inputs)) {
        const slot = key.match(pattern)?.[1];
        if (slot !== undefined && parseInt(slot) > keep) {
            delete node.inputs[key];
        }
    }
};

/**
 * Wire the image array of the P-H3 image edit workflow. The first active entry
 * is the image being edited and feeds the two chains the workflow already
 * holds; every later entry is a reference, loaded and offered to both
 * consumers:
 *
 * - `BatchImagesNode` requires identical dimensions, which is what the
 *   `ResizeAndPadImage` (white letterbox) is for — its target comes from the
 *   `GetImageSize` of the edited image at upsampler scale;
 * - `PH3ImageConditioning` gets the reference as loaded, exactly as the
 *   reference workflow feeds it.
 *
 * Skipping a row drops it from the array, so the numbering stays contiguous:
 * the picture a request calls `<Picture 3>` is the third image that survives.
 * The upsampler prompt is text, so its `{b}` placeholder is rebuilt with one
 * `<Picture N>` line per image the model is shown. With no image at all the
 * template is left alone — the tab locks its Generate button, so nothing is
 * sent in that state.
 *
 * Config control fields: `image_node_id` (the edited image's `LoadImage`),
 * `cond_node_id`, `batch_node_id`, `size_node_id` (the `GetImageSize` of the
 * edited image), `format_node_id` + `format_field`.
 */
export const applyPH3Images = (
    api: Workflow,
    entries: PH3ImageEntry[] | undefined,
    control: controlType,
): void => {
    const imageId = control.image_node_id;
    const condId = control.cond_node_id;
    const batchId = control.batch_node_id;
    const sizeId = control.size_node_id;
    if (
        !imageId ||
        !condId ||
        !batchId ||
        !sizeId ||
        !api[imageId] ||
        !api[condId] ||
        !api[batchId]
    ) {
        return;
    }
    const images: PH3ActiveImage[] = activeEntries(entries).filter(
        (e): e is PH3ActiveImage => !!e.image,
    );
    const [primary, ...refs] = images;
    if (primary) {
        api[imageId].inputs.image = primary.image;
    }
    clearSlots(api, batchId, /^images\.image(\d+)$/, 0);
    clearSlots(api, condId, /^images\.image_(\d+)$/, 1);
    refs.forEach((entry, idx) => {
        const base = insertGraph(api, {
            ':load': {
                inputs: { image: entry.image },
                class_type: 'LoadImage',
                _meta: { title: `image_${idx + 2} (reference)` },
            },
            ':pad': {
                inputs: {
                    image: [':load', 0],
                    target_width: [sizeId, 0],
                    target_height: [sizeId, 1],
                    padding_color: 'white',
                    interpolation: 'lanczos',
                },
                class_type: 'ResizeAndPadImage',
                _meta: { title: `image_${idx + 2} padded to image_1` },
            },
        });
        api[condId].inputs[`images.image_${idx + 2}`] = [`${base}:load`, 0];
        api[batchId].inputs[`images.image${idx + 1}`] = [`${base}:pad`, 0];
    });
    const formatId = control.format_node_id;
    if (images.length && formatId && control.format_field && api[formatId]) {
        api[formatId].inputs[control.format_field] = upsamplerPictures(
            images.length,
        );
    }
};
