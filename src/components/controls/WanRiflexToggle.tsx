import { useEventCallback } from '@mui/material';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const WanRiflexToggle = ({ ...props }: ToggleInputProps) => {
    const handler = useEventCallback(
        (api: any, value: boolean, control: controlType) => {
            if (!value || !control.node_id || !control.field) {
                return;
            }
            api[control.node_id].inputs[control.field] = 6;
        }
    );
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput {...props} />;
};
