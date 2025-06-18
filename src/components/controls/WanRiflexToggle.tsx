import { useCallback } from 'react';
import { useRegisterHandler } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';
import { controlType } from '../../redux/config';

export const WanRiflexToggle = ({ ...props }: ToggleInputProps) => {
    const handler = useCallback(
        (api: any, value: boolean, control?: controlType) => {
            if (!value || !control || !control.node_id || !control.field) {
                return;
            }
            api[control.node_id].inputs[control.field] = 6;
        },
        []
    );
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput {...props} />;
};
