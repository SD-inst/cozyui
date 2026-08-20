import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SamplerSelectInput } from './SamplerSelectInput';
import { SeedInput } from './SeedInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type TValue = {
    enabled: boolean;
    main_steps: number;
    megapixels: number;
    steps: number;
    sampler: string;
    seed: number;
};

const STEPS_SIGMAS: Record<number, string> = {
    3: '0.9035, 0.6316, 0.3158, 0.0000',
    4: '0.9035, 0.8000, 0.6316, 0.3158, 0.0000',
    5: '0.9231, 0.8780, 0.8000, 0.6316, 0.3158, 0.0000',
};

const defaultValue: TValue = {
    enabled: false,
    main_steps: 4,
    megapixels: 1,
    sampler: 'lcm',
    seed: 1024,
    steps: 3,
};

export const MiniMaxH3LatentUpscale = ({
    name = 'latent_upscale',
    ...props
}: { name?: string } & BoxProps) => {
    const value = useWatch({ name, defaultValue });
    const mainSteps = useWatch({ name: 'steps', defaultValue: 8 }) as number;
    const handler = useEventCallback(
        (api: any, value: TValue, control: controlType) => {
            if (!value?.enabled) {
                return;
            }
            const {
                sampler_node_id,
                scheduler_node_id,
                video_vae_decode_node_id,
                audio_vae_decode_node_id,
                guider_node_id,
            } = control;
            if (
                !sampler_node_id ||
                !scheduler_node_id ||
                !video_vae_decode_node_id ||
                !audio_vae_decode_node_id ||
                !guider_node_id
            ) {
                return;
            }
            const sigmas = STEPS_SIGMAS[value.steps] ?? STEPS_SIGMAS[3];
            const graph = {
                ':seed': {
                    inputs: { value: value.seed },
                    class_type: 'PrimitiveInt',
                    _meta: { title: 'Seed (Latent Upscale)' },
                },
                ':split_sigmas': {
                    inputs: {
                        step: value.main_steps,
                        sigmas: [scheduler_node_id, 0],
                    },
                    class_type: 'SplitSigmas',
                    _meta: { title: 'SplitSigmas' },
                },
                ':separate': {
                    inputs: { av_latent: [sampler_node_id, 1] },
                    class_type: 'LTXVSeparateAVLatent',
                    _meta: { title: 'LTXVSeparateAVLatent' },
                },
                ':upscale': {
                    inputs: {
                        model_name:
                            'minimax_h3_latent_upscaler_3d_fp16.safetensors',
                        mode: 'megapixels',
                        'mode.megapixels': value.megapixels,
                        align: 32,
                        keep_proportion: false,
                        device: 'cuda',
                        precision: 'fp32',
                        latent: [':separate', 0],
                    },
                    class_type: 'MinimaxH3LatentUpscaler3D',
                    _meta: { title: 'Minimax H3 Latent Upscaler (3D)' },
                },
                ':concat': {
                    inputs: {
                        video_latent: [':upscale', 0],
                        audio_latent: [':separate', 1],
                    },
                    class_type: 'LTXVConcatAVLatent',
                    _meta: { title: 'LTXVConcatAVLatent' },
                },
                ':sigmas': {
                    inputs: { sigmas },
                    class_type: 'ManualSigmas',
                    _meta: { title: `${value.steps} step Sigmas` },
                },
                ':sampler_select': {
                    inputs: { sampler_name: value.sampler },
                    class_type: 'KSamplerSelect',
                    _meta: { title: 'KSamplerSelect' },
                },
                ':noise': {
                    inputs: { noise_seed: [':seed', 0] },
                    class_type: 'RandomNoise',
                    _meta: { title: 'RandomNoise' },
                },
                ':sampler': {
                    inputs: {
                        noise: [':noise', 0],
                        guider: [guider_node_id, 0],
                        sampler: [':sampler_select', 0],
                        sigmas: [':sigmas', 0],
                        latent_image: [':concat', 0],
                    },
                    class_type: 'SamplerCustomAdvanced',
                    _meta: { title: 'SamplerCustomAdvanced (Latent Upscale)' },
                },
            };
            const baseNodeID = insertGraph(api, graph);
            api[sampler_node_id].inputs.sigmas = [baseNodeID + ':split_sigmas', 0];
            const output: [string, number] = [baseNodeID + ':sampler', 0];
            api[video_vae_decode_node_id].inputs.samples = output;
            api[audio_vae_decode_node_id].inputs.samples = output;
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <Box {...props}>
            <ToggleInput
                name={`${name}.enabled`}
                label='latent_upscale'
                defaultValue={defaultValue.enabled}
            />
            {value?.enabled && (
                <Box display='flex' flexDirection='column' gap={2}>
                    <SliderInput
                        name={`${name}.main_steps`}
                        label='latent_upscale_main_steps'
                        defaultValue={defaultValue.main_steps}
                        min={1}
                        max={Math.max(1, mainSteps)}
                        step={1}
                    />
                    <SliderInput
                        name={`${name}.megapixels`}
                        label='latent_upscale_megapixels'
                        defaultValue={defaultValue.megapixels}
                        min={0.1}
                        max={2}
                        step={0.1}
                    />
                    <SliderInput
                        name={`${name}.steps`}
                        label='latent_upscale_steps'
                        defaultValue={defaultValue.steps}
                        min={3}
                        max={5}
                        step={1}
                    />
                    <SamplerSelectInput
                        name={`${name}.sampler`}
                        label='latent_upscale_sampler'
                        defaultValue={defaultValue.sampler}
                    />
                    <SeedInput
                        name={`${name}.seed`}
                        label='latent_upscale_seed'
                        defaultValue={defaultValue.seed}
                    />
                </Box>
            )}
        </Box>
    );
};
