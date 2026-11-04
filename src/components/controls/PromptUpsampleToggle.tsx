import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { Workflow } from '../../api/graph';
import { controlType } from '../../redux/config';
import { useAppDispatch } from '../../redux/hooks';
import { delResult } from '../../redux/tab';
import { useRegisterHandler, useTabName } from '../contexts/TabContext';
import { applyPromptUpsample } from './PromptUpsampleHandler';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

/**
 * Toggle for the prompt upsampler of a tab whose workflow feeds the request
 * through a Format Text node (see `applyPromptUpsample`). The aspect ratio is
 * read from the form rather than the graph, because the upsampler needs it as
 * text in its prompt while the resolution selector feeds it to the sampler as
 * width/height.
 *
 * Config control fields: `node_id` + `field` (the switch), `format_node_id` +
 * `format_field` (the Format Text node and its aspect input), `preview_node_id`
 * (the text preview dropped when upsampling is off), and `aspect_field` (the
 * form field holding the aspect label).
 */
export const PromptUpsampleToggle = ({
    aspectField = 'aspect_ratio',
    ...props
}: ToggleInputProps & { aspectField?: string }) => {
    const { getValues } = useFormContext();
    const tab_name = useTabName();
    const dispatch = useAppDispatch();
    const handler = useEventCallback(
        (api: Workflow, value: boolean, control: controlType) => {
            applyPromptUpsample(
                api,
                value,
                control,
                getValues(control.aspect_field || aspectField) as string,
            );
            if (!value && control.preview_node_id) {
                // The panel would otherwise keep showing the text of a run
                // where upsampling was on.
                dispatch(
                    delResult({ tab_name, id: control.preview_node_id }),
                );
            }
        },
    );
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput {...props} />;
};
