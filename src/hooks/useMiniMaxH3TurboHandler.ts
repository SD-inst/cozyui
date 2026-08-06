import { useEventCallback } from '@mui/material';
import { getFreeNodeId, insertNode } from '../api/utils';
import { useAPI } from './useAPI';

const TURBO_LORA_NAME = 'h3/minimax_h3_turbo_4step_ckpt500.safetensors';

/**
 * Hook that returns a handler for the MiniMax H3 Turbo toggle.
 * When enabled, inserts a MiniMaxH3TurboLoRA node into the model chain
 * (before regular LoRAs) and adds a MiniMaxH3TurboSampler node,
 * connecting it to SamplerCustomAdvanced's `sampler` input.
 */
export const useMiniMaxH3TurboHandler = () => {
    const { handler_options, controls } = useAPI() as any;
    const lora_params = handler_options?.lora_params ?? {};
    const turbo_control = controls?.turbo ?? {};
    const unetLoaderId = turbo_control?.unet_loader_node_id;
    const samplerNodeId = turbo_control?.sampler_node_id;
    const spectrum_control = controls?.spectrum_enabled ?? {};

    const handler = useEventCallback((api: any, value: boolean) => {
        if (!value) {
            return;
        }

        const {
            output_node_ids,
            api_input_name,
            lora_input_name,
        } = lora_params;

        if (!output_node_ids?.length || !unetLoaderId || !samplerNodeId) {
            return;
        }

        insertNode(
            api,
            output_node_ids,
            api_input_name,
            {
                inputs: {
                    lora_name: TURBO_LORA_NAME,
                    strength: 1,
                    [lora_input_name]: [unetLoaderId, 0],
                },
                class_type: 'MiniMaxH3TurboLoRA',
                _meta: { title: 'MiniMax-H3 Turbo LoRA' },
            },
            0,
        );

        const turboSamplerId = getFreeNodeId(api) + '';
        api[turboSamplerId] = {
            inputs: {},
            class_type: 'MiniMaxH3TurboSampler',
            _meta: { title: 'MiniMax-H3 Turbo Sampler (4-step)' },
        };
        api[samplerNodeId].inputs.sampler = [turboSamplerId, 0];

        if (spectrum_control?.id) {
            api[spectrum_control.id].inputs[spectrum_control.field] = false;
        }
    });

    return handler;
};
