import { useCallback } from 'react';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const HYRiflexInput = ({ ...props }: ToggleInputProps) => {
    const handler = useCallback(
        (api: any, value: any, control?: controlType) => {
            if (!control || !value) {
                return;
            }
            const riflex_node_id = getFreeNodeId(api) + '';
            api[riflex_node_id] = {
                inputs: {
                    k: 4,
                    model: [control.input_node_id, 0],
                    latent: [control.latent_node_id, 0],
                },
                class_type: 'ApplyRifleXRoPE_HunuyanVideo',
                _meta: {
                    title: 'Apply RifleXRoPE HunuyanVideo',
                },
            };
            api[control.output_node_id].inputs['model'] = [riflex_node_id, 0];
        },
        []
    );
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput tooltip='riflex' {...props} />;
};
