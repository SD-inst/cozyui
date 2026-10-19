import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { InputValue, NodeRef, Workflow } from '../api/graph';
import { getFreeNodeId } from '../api/utils';
import { controlType, tabConfigType } from '../redux/config';
import { useAPI } from './useAPI';

type loraParamsType = tabConfigType['handler_options']['lora_params'];

export type turboLoraValuesType = {
    lora_name?: string;
    strength?: number;
};

/**
 * Pure part of the turbo toggle: insert the turbo LoRA into the model chain
 * and pin the sampler CFG to 1 — the distilled LoRAs are trained CFG-less, so
 * a CFG > 1 breaks the image even though the UI still shows the user's value.
 */
export const applyTurboLora = (
    api: Workflow,
    turboLora: turboLoraValuesType,
    control: controlType,
    lora_params: loraParamsType,
): void => {
    const loraName = turboLora?.lora_name;
    const strength = turboLora?.strength ?? 1;
    if (!loraName || !lora_params?.class_name) {
        return;
    }
    const modelNodeIds: string[] =
        control?.turbo_model_node_ids ?? lora_params.output_node_ids ?? [];
    const targetIds = modelNodeIds.filter((id) => api[id]);
    if (!targetIds.length) {
        return;
    }

    const { api_input_name, lora_input_name, name_field_name, strength_field_name, class_name, output_idx } =
        lora_params;
    // Chain on top of whatever currently feeds the model consumers — the user
    // LoRAs have already rewired them, so the turbo LoRA lands last in the
    // chain.
    const inputNodeId = (
        api[targetIds[0]]?.inputs?.[api_input_name] as NodeRef | undefined
    )?.[0];
    const inputs: Record<string, InputValue> = {
        [name_field_name]: loraName,
        [strength_field_name]: strength,
    };
    if (inputNodeId !== undefined && output_idx !== undefined) {
        inputs[lora_input_name] = [inputNodeId, output_idx];
    }
    const loraNodeId = getFreeNodeId(api) + '';
    api[loraNodeId] = {
        inputs,
        class_type: class_name,
        _meta: { title: class_name },
    };
    targetIds.forEach(
        (id) => (api[id].inputs[api_input_name] = [loraNodeId, output_idx ?? 0]),
    );

    const cfgNodeId = control?.cfg_node_id;
    if (cfgNodeId && api[cfgNodeId]) {
        api[cfgNodeId].inputs[control?.cfg_field ?? 'cfg'] = 1;
    }
};

/**
 * Handler for the model-agnostic turbo toggle (`name='turbo'` in the form,
 * `id: "handle"` in config.json). Node ids it needs — the CFG holder
 * (`cfg_node_id`/`cfg_field`) and, when the LoRA must be inserted somewhere
 * other than `lora_params.output_node_ids`, `turbo_model_node_ids` — come from
 * the control entry in config.json, never hardcoded here.
 */
export const useTurboLoraHandler = () => {
    const { handler_options } = useAPI();
    const lora_params = handler_options?.lora_params;
    const { getValues } = useFormContext();

    return useEventCallback(
        (api: Workflow, value: boolean, control: controlType) => {
            if (!value) {
                return;
            }
            applyTurboLora(
                api,
                {
                    lora_name: getValues('turbo_lora.lora_name') as string,
                    strength: getValues('turbo_lora.strength') as number,
                },
                control,
                lora_params,
            );
        },
    );
};
