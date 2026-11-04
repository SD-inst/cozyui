import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { aspectString } from '../../utils/aspect';

/**
 * Prompt-upsampler branch of the P-H3 image workflow.
 *
 * The toggle drives the core If/Else Switch (`ComfySwitchNode`): its inputs are
 * lazy, so the upsampler LLM is not even loaded when the switch selects the
 * raw prompt — nothing has to be removed from the graph.
 *
 * The upsampler is a text model, so the chosen aspect ratio has to reach it as
 * text. The Format Text node holds the template ("Aspect ratio: {b}\nRequest:
 * {a}") and this fills its `values.b` with the bare "W:H" of the resolution
 * selector's current choice, so the picture the sampler renders and the
 * description the upsampler writes agree on one ratio.
 *
 * With upsampling off the Preview as Text node would echo the user's own
 * prompt back at them, so it is dropped along with the text result it produced
 * on an earlier run (`preview_node_id`).
 */
export const applyPromptUpsample = (
    api: Workflow,
    enabled: boolean,
    control: controlType,
    aspectLabel?: string,
): void => {
    if (!control.node_id || !control.field || !api[control.node_id]) {
        return;
    }
    api[control.node_id].inputs[control.field] = enabled;
    const formatId = control.format_node_id;
    if (formatId && control.format_field && api[formatId]) {
        api[formatId].inputs[control.format_field] = aspectString(
            aspectLabel || '',
        );
    }
    const previewId = control.preview_node_id;
    if (!enabled && previewId && api[previewId]) {
        delete api[previewId];
    }
};
