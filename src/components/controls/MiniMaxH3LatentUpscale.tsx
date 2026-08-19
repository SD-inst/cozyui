import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SamplerSelectInput } from './SamplerSelectInput';
import { SchedulerSelectInput } from './SchedulerSelectInput';
import { SeedInput } from './SeedInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type TValue = {
    enabled: boolean;
    scale: number;
    steps: number;
    denoise: number;
    sampler: string;
    scheduler: string;
    seed: number;
};

const defaultValue: TValue = {
    denoise: 0.5,
    enabled: false,
    sampler: 'lcm',
    scale: 1.5,
    scheduler: 'beta57',
    seed: 1024,
    steps: 3,
};

export const MiniMaxH3LatentUpscale = ({
    name = 'latent_upscale',
    ...props
}: { name?: string } & BoxProps) => {
    const value = useWatch({ name, defaultValue });
    const handler = useEventCallback(
        (api: any, value: TValue, control: controlType) => {
            if (!value?.enabled) {
                return;
            }
            const {
                sampler_node_id,
                video_vae_decode_node_id,
                audio_vae_decode_node_id,
                guider_node_id,
                scheduler_node_id,
            } = control;
            if (
                !sampler_node_id ||
                !video_vae_decode_node_id ||
                !audio_vae_decode_node_id ||
                !guider_node_id ||
                !scheduler_node_id
            ) {
                return;
            }
            const graph = {
                ':seed': {
                    inputs: { value: value.seed },
                    class_type: 'PrimitiveInt',
                    _meta: { title: 'Seed (Latent Upscale)' },
                },
                ':upscale': {
                    inputs: {
                        model_name:
                            'minimax_h3_latent_upscaler_3d_bf16.safetensors',
                        scale: value.scale,
                        device: 'cuda',
                        precision: 'fp32',
                        latent: [sampler_node_id, 0],
                    },
                    class_type: 'MinimaxH3LatentUpscalerNode3D',
                    _meta: { title: 'Minimax H3 Latent Upscaler (3D)' },
                },
                ':scheduler': {
                    inputs: {
                        scheduler: value.scheduler,
                        steps: value.steps,
                        denoise: value.denoise,
                        model: api[scheduler_node_id].inputs.model,
                    },
                    class_type: 'BasicScheduler',
                    _meta: { title: 'BasicScheduler' },
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
                        sigmas: [':scheduler', 0],
                        latent_image: [':upscale', 0],
                    },
                    class_type: 'SamplerCustomAdvanced',
                    _meta: { title: 'SamplerCustomAdvanced (Latent Upscale)' },
                },
            };
            const baseNodeID = insertGraph(api, graph);
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
                        name={`${name}.scale`}
                        label='latent_upscale_scale'
                        defaultValue={defaultValue.scale}
                        min={1}
                        max={2}
                        step={0.1}
                    />
                    <SliderInput
                        name={`${name}.steps`}
                        label='latent_upscale_steps'
                        defaultValue={defaultValue.steps}
                        min={1}
                        max={20}
                        step={1}
                    />
                    <SliderInput
                        name={`${name}.denoise`}
                        label='latent_upscale_denoise'
                        defaultValue={defaultValue.denoise}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <SamplerSelectInput
                        name={`${name}.sampler`}
                        label='latent_upscale_sampler'
                        defaultValue={defaultValue.sampler}
                    />
                    <SchedulerSelectInput
                        name={`${name}.scheduler`}
                        label='latent_upscale_scheduler'
                        defaultValue={defaultValue.scheduler}
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
