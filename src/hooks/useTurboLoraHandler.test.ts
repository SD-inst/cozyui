import { describe, expect, it } from 'vitest';
import { getFreeNodeId } from '../api/utils';
import { Workflow } from '../api/graph';
import { controlType, tabConfigType } from '../redux/config';
import { applyTurboLora } from './useTurboLoraHandler';

const lora_params = {
    lora_input_name: 'model',
    api_input_name: 'model',
    output_node_ids: ['2'],
    output_idx: 0,
    class_name: 'LoraLoaderModelOnly',
    strength_field_name: 'strength_model',
    name_field_name: 'lora_name',
} as tabConfigType['handler_options']['lora_params'];

const control: controlType = {
    id: 'handle',
    field: '',
    cfg_node_id: '2',
    cfg_field: 'cfg',
};

const makeApi = (): Workflow => ({
    '1': {
        inputs: { unet_name: 'moss/moss_image_sft_int8_convrot.safetensors' },
        class_type: 'UNETLoader',
    },
    '9': {
        inputs: { single_layers: '22', model: ['1', 0] },
        class_type: 'SkipLayerGuidanceDiTSimple',
    },
    '2': {
        inputs: { steps: 20, cfg: 5, model: ['9', 0] },
        class_type: 'KSampler',
    },
});

const findByClass = (api: Workflow, classType: string) =>
    Object.entries(api).filter(([, n]) => n.class_type === classType);

describe('applyTurboLora', () => {
    it('inserts the turbo LoRA into the model chain and pins CFG to 1', () => {
        const api = makeApi();
        const loraNodeId = getFreeNodeId(api) + '';

        applyTurboLora(
            api,
            { lora_name: 'moss/8-steps-dmd-lora.safetensors', strength: 1 },
            control,
            lora_params,
        );

        const [[id, lora]] = findByClass(api, 'LoraLoaderModelOnly');
        expect(id).toBe(loraNodeId);
        expect(lora.inputs.lora_name).toBe('moss/8-steps-dmd-lora.safetensors');
        expect(lora.inputs.strength_model).toBe(1);
        // chained onto whatever fed the sampler before — the SLG node here
        expect(lora.inputs.model).toEqual(['9', 0]);
        expect(api['2'].inputs.model).toEqual([loraNodeId, 0]);
        expect(api['2'].inputs.cfg).toBe(1);
    });

    it('chains after already inserted user LoRAs', () => {
        const api = makeApi();
        // what the LoraInput handler leaves behind: sampler ← user LoRA ← SLG
        api['30'] = {
            inputs: {
                lora_name: 'moss/style.safetensors',
                strength_model: 0.8,
                model: ['9', 0],
            },
            class_type: 'LoraLoaderModelOnly',
        };
        api['2'].inputs.model = ['30', 0];

        applyTurboLora(
            api,
            { lora_name: 'moss/8-steps-dmd-lora.safetensors', strength: 0.9 },
            control,
            lora_params,
        );

        const turbo = findByClass(api, 'LoraLoaderModelOnly').find(
            ([id]) => id !== '30',
        )?.[1];
        expect(turbo?.inputs.model).toEqual(['30', 0]);
        expect(api['2'].inputs.model).not.toEqual(['30', 0]);
        expect(api['2'].inputs.steps).toBe(20);
    });

    it('leaves the graph untouched without a LoRA name', () => {
        const api = makeApi();
        applyTurboLora(api, { lora_name: '' }, control, lora_params);
        expect(findByClass(api, 'LoraLoaderModelOnly')).toHaveLength(0);
        expect(api['2'].inputs.cfg).toBe(5);
        expect(api['2'].inputs.model).toEqual(['9', 0]);
    });

    it('does not touch CFG when the control declares no CFG node', () => {
        const api = makeApi();
        applyTurboLora(
            api,
            { lora_name: 'moss/8-steps-dmd-lora.safetensors' },
            { id: 'handle', field: '' },
            lora_params,
        );
        expect(api['2'].inputs.cfg).toBe(5);
        expect(findByClass(api, 'LoraLoaderModelOnly')).toHaveLength(1);
    });
});
