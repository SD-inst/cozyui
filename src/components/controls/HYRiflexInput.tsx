import { useCallback } from 'react';
import { insertNode } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';

export const HYRiflexInput = ({ ...props }: ToggleInputProps) => {
    const handler = useCallback(
        (api: any, value: any, control?: controlType) => {
            if (!control || !value) {
                return;
            }
            const riflex_node = {
                inputs: {
                    k: 4,
                    model: null,
                    latent: [control.latent_node_id, 0],
                },
                class_type: 'ApplyRifleXRoPE_HunuyanVideo',
                _meta: {
                    title: 'Apply RifleXRoPE HunuyanVideo',
                },
            };
            insertNode(api, control.output_node_id, 'model', riflex_node);
        },
        []
    );
    useRegisterHandler({ name: props.name, handler });
    return <ToggleInput tooltip='riflex' {...props} />;
};
