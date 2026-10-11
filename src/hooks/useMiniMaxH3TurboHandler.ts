import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { NodeRef, Workflow } from '../api/graph';
import { getFreeNodeId, insertNode } from '../api/utils';
import { useAPI } from './useAPI';

/**
 * Hook that returns a handler for the MiniMax H3 Turbo toggle.
 * When enabled, inserts the turbo LoRA node into the model chain AFTER the
 * sigma-shift node (at `turbo_model_node_ids` — the shift node's consumers)
 * and, for H3 turbo, adds a MiniMaxH3TurboSampler node, connecting it to
 * SamplerCustomAdvanced's `sampler` input. Keeping the turbo weights
 * downstream of the shift node lets the audio-refine branch tap the shift
 * node's model output without them.
 */
export const useMiniMaxH3TurboHandler = () => {
    const { handler_options } = useAPI() as any;
    const lora_params = handler_options?.lora_params ?? {};
    const { getValues } = useFormContext();

    const handler = useEventCallback((api: Workflow, value: boolean, control: any) => {
        if (!value) {
            return;
        }

        // PDD acceleration replaces turbo — when PDD is on, turbo has no effect.
        if (getValues('pdd')) {
            return;
        }

        const {
            output_node_ids,
            api_input_name,
            lora_input_name,
            output_idx,
            strength_field_name,
            name_field_name,
            class_name,
        } = lora_params;

        const turboLoraName = getValues('turbo_lora.lora_name') as string;
        const turboLoraStrength = getValues('turbo_lora.strength') as number;
        const samplerNodeId = control?.sampler_node_id;
        const spectrumNodeId = control?.spectrum_node_id;
        const sigmaShiftNodeId = control?.sigma_shift_node_id;
        // The turbo LoRA is applied AFTER the sigma-shift node (the shift
        // node's consumers), so the audio-refine branch can tap the shift
        // node's model output without carrying the turbo weights. Falls back
        // to the shift node itself (the pre-reorder position) when unset.
        const modelNodeIds: string[] =
            control?.turbo_model_node_ids ?? output_node_ids;

        if (!turboLoraName || !modelNodeIds?.length || !samplerNodeId) {
            return;
        }

        const isH3Turbo = turboLoraName.includes('h3_turbo');
        const isLightX2V = turboLoraName.includes('lightx2v');
        const is4Step = isLightX2V && turboLoraName.includes('4step');

        if (!isH3Turbo) {
            const inputNodeId = (
                api[modelNodeIds[0]]?.inputs?.[api_input_name] as
                    | NodeRef
                    | undefined
            )?.[0];
            const additionalFields: Record<string, any> = {};
            if (inputNodeId && output_idx !== undefined) {
                additionalFields[lora_input_name] = [inputNodeId, output_idx];
            }
            const loraNodeId = getFreeNodeId(api) + '';
            api[loraNodeId] = {
                inputs: {
                    [name_field_name]: turboLoraName,
                    [strength_field_name]: turboLoraStrength,
                    ...additionalFields,
                },
                class_type: class_name,
                _meta: { title: class_name },
            };
            modelNodeIds.forEach(
                (id: string) =>
                    (api[id].inputs[api_input_name] = [loraNodeId, output_idx]),
            );

            if (is4Step) {
                const shiftId = sigmaShiftNodeId ?? output_node_ids[0];
                api[shiftId].inputs.shift_video = 6;
            }
        } else {
            insertNode(
                api,
                modelNodeIds,
                api_input_name,
                {
                    inputs: {
                        lora_name: turboLoraName,
                        strength: turboLoraStrength,
                        low_vram: true,
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
        }

        if (spectrumNodeId) {
            api[spectrumNodeId].inputs.enabled = false;
        }
    });

    return handler;
};
