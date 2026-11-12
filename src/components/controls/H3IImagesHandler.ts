import { Workflow } from '../../api/graph';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';
import { activeEntries } from '../../utils/arraySlots';

/**
 * One row of the H3 Image edit array.
 */
export type H3IImageEntry = {
    image?: string;
    skip?: boolean;
};

/**
 * A row that actually carries a file, i.e. one that reaches the graph.
 */
type H3IActiveImage = { image: string; skip?: boolean };

/**
 * Drop the reference slots a previous run left behind, keeping only the slots
 * asked for. `MiniMaxH3ImageConditioning` numbers its slots from 0
 * (`images.image_0`), which is the pattern this is called with.
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
 * Wire the image array of the H3 Image edit workflow into
 * `MiniMaxH3ImageConditioning`: slot `image_0` is the picture to edit, the rest
 * are references, and the prompt calls them `<Picture 1>`, `<Picture 2>`… in
 * slot order — the same order the chat attaches them in, so a request can name
 * the picture it means. The first active entry fills the `LoadImage` node the
 * workflow already holds, every later entry gets a `LoadImage` of its own, and
 * every one of them reaches the conditioning as the uploaded file, unscaled:
 * the conditioning anchors each picture on its own, so the pixels the user
 * uploaded are worth more than a resize that never asked for one.
 *
 * The tab's megapixel target is not a resize of the input either — it sizes the
 * canvas. The edited picture is scaled and aligned once by the two
 * `ResizeImageMaskNode`s of the workflow and `GetImageSize` of that copy gives
 * the conditioning its width and height; `applyH3ICustomAspect` replaces those
 * two inputs when the user picks a canvas instead.
 *
 * Skipping a row drops it from the array, so the numbering stays contiguous:
 * the picture a request calls `<Picture 3>` is the third image that survives.
 *
 * Config control fields: `image_node_id` (the edited image's `LoadImage`) and
 * `cond_node_id`.
 */
export const applyH3IImages = (
    api: Workflow,
    entries: H3IImageEntry[] | undefined,
    control: controlType,
): void => {
    const imageId = control.image_node_id;
    const condId = control.cond_node_id;
    if (!imageId || !condId || !api[imageId] || !api[condId]) {
        return;
    }
    const images: H3IActiveImage[] = activeEntries(entries).filter(
        (e): e is H3IActiveImage => !!e.image,
    );
    const [primary, ...refs] = images;
    if (primary) {
        api[imageId].inputs.image = primary.image;
    }
    clearSlots(api, condId, /^images\.image_(\d+)$/, 0);
    refs.forEach((entry, idx) => {
        const id = getFreeNodeId(api) + '';
        api[id] = {
            inputs: { image: entry.image },
            class_type: 'LoadImage',
            _meta: { title: `image_${idx + 2} (reference)` },
        };
        api[condId].inputs[`images.image_${idx + 1}`] = [id, 0];
    });
};
