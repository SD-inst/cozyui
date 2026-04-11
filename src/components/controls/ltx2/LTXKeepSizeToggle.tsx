import { useEventCallback } from 'yet-another-react-lightbox';
import { useRegisterHandler } from '../../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from '../ToggleInput';
import { controlType } from '../../../redux/config';

export const LTXKeepSizeToggle = ({ name, ...props }: ToggleInputProps) => {
    const handler = useEventCallback(
        (api: any, value: boolean, control: controlType) => {
            if (!value || !control.node_id) {
                return;
            }
            const resize_node_id = api[control.node_id].inputs.image[0];
            const image_node_id = api[resize_node_id].inputs.image[0];
            api[control.node_id].inputs.image = [image_node_id, 0];
        },
    );
    useRegisterHandler({ name, handler });
    return <ToggleInput name={name} {...props} />;
};
