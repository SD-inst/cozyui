import { Box, BoxProps, useEventCallback } from '@mui/material';
import { insertGraph } from '../../api/utils';
import { useResultParam } from '../../hooks/useResult';
import { useWatchForm } from '../../hooks/useWatchForm';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { VerticalBox } from '../VerticalBox';
import { keyframeHandler, TKeyframe } from './keyframeHandler';
import { SamplerSelectInput } from './SamplerSelectInput';
import { SchedulerSelectInput } from './SchedulerSelectInput';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';
import { useWatch } from 'react-hook-form';

type TValue = {
    spatial: boolean;
    temporal: boolean;
    audio: boolean;
    steps: number;
    distill_strength: number;
    detail_strength: number;
    sampler: string;
    scheduler: string;
};

const defaults: TValue = {
    audio: false,
    detail_strength: 0.3,
    distill_strength: 0.6,
    sampler: 'euler_ancestral',
    scheduler: 'simple',
    spatial: true,
    steps: 3,
    temporal: false,
};

export const LTX2UpsampleControl = ({
    name = 'upsample',
    i2v = false,
    ...props
}: {
    name?: string;
    i2v?: boolean;
} & BoxProps) => {
    const fps = useWatchForm('fps');
    const { id: resultNodeID } = useResultParam();
    const keyframes: TKeyframe[] = useWatchForm('keyframes');
    const value: TValue = useWatch({ name, defaultValue: defaults });
    const handler = useEventCallback(
        (api: any, value: TValue, control: controlType) => {
            if (!value) {
                return;
            }
            const {
                input_node_id,
                cond_node_id,
                model_node_id,
                seed_node_id,
                output_node_id,
                image_node_id,
                crop_node_id,
                scale_node_id,
                audio_node_id,
            } = control;
            if (!value.spatial) {
                api[scale_node_id].inputs.scale_by = 1;
                if (!value.temporal) {
                    return;
                }
            }
            const splitGraph = {
                ':1': {
                    inputs: {
                        av_latent: [input_node_id, 0],
                    },
                    class_type: 'LTXVSeparateAVLatent',
                    _meta: {
                        title: 'LTXVSeparateAVLatent',
                    },
                },
                ':2': {
                    inputs: {
                        positive: [cond_node_id, 0],
                        negative: [cond_node_id, 1],
                        latent: [':1', 0],
                    },
                    class_type: 'LTXVCropGuides',
                    _meta: {
                        title: 'LTXVCropGuides',
                    },
                },
            };
            const splitGraphNodeID = insertGraph(api, splitGraph);
            const separateNodeID = splitGraphNodeID + ':1';
            let condNodeID = splitGraphNodeID + ':2';
            let samplesNode = [condNodeID, 2];
            if (value.temporal) {
                const temporalUpscale = {
                    ':1': {
                        inputs: {
                            model_name:
                                'ltx/ltx-2-temporal-upscaler-x2-1.0.safetensors',
                        },
                        class_type: 'LatentUpscaleModelLoader',
                        _meta: {
                            title: 'Load Temporal Upscale Model',
                        },
                    },
                    ':2': {
                        inputs: {
                            samples: samplesNode,
                            upscale_model: [':1', 0],
                            vae: [model_node_id, 2],
                        },
                        class_type: 'LTXVLatentUpsampler',
                        _meta: {
                            title: 'Latent temporal upsample',
                        },
                    },
                    ':3': {
                        inputs: {
                            frame_rate: fps * 2,
                            positive: [condNodeID, 0],
                            negative: [condNodeID, 1],
                        },
                        class_type: 'LTXVConditioning',
                        _meta: {
                            title: 'LTXVConditioning double FPS',
                        },
                    },
                };
                const newNodeID = insertGraph(api, temporalUpscale);
                samplesNode = [newNodeID + ':2', 0];
                condNodeID = newNodeID + ':3';
                api[resultNodeID].inputs.frame_rate = fps * 2;
            }
            if (value.spatial) {
                const spatialUpscale = {
                    ':1': {
                        inputs: {
                            model_name:
                                'ltx/ltx-2-spatial-upscaler-x2-1.0.safetensors',
                        },
                        class_type: 'LatentUpscaleModelLoader',
                        _meta: {
                            title: 'Load Latent Upscale Model',
                        },
                    },
                    ':2': {
                        inputs: {
                            samples: samplesNode,
                            upscale_model: [':1', 0],
                            vae: [model_node_id, 2],
                        },
                        class_type: 'LTXVLatentUpsampler',
                        _meta: {
                            title: 'Latent spatial upsample',
                        },
                    },
                };
                samplesNode = [insertGraph(api, spatialUpscale) + ':2', 0];
            }
            const modelNode = api[input_node_id].inputs.model;
            const wf: any = {
                ':1': {
                    inputs: {
                        video_latent: samplesNode,
                        audio_latent: [separateNodeID, 1],
                    },
                    class_type: 'LTXVConcatAVLatent',
                    _meta: {
                        title: 'LTXVConcatAVLatent',
                    },
                },
                ':2': {
                    inputs: {
                        seed: [seed_node_id, 0],
                        steps: value.steps,
                        cfg: 1,
                        sampler_name: value.sampler,
                        scheduler: value.scheduler,
                        denoise: 0.5,
                        model: [':4', 0],
                        positive: [condNodeID, 0],
                        negative: [condNodeID, 1],
                        latent_image: [':1', 0],
                    },
                    class_type: 'KSampler',
                    _meta: {
                        title: '2x Upscale',
                    },
                },
                ':3': {
                    inputs: {
                        lora_name:
                            'ltx2/ltx-2-19b-distilled-lora-384.safetensors',
                        strength_model: value.distill_strength,
                        model: modelNode,
                    },
                    class_type: 'LoraLoaderModelOnly',
                    _meta: {
                        title: 'LoraLoaderModelOnly',
                    },
                },
                ':4': {
                    inputs: {
                        lora_name:
                            'ltx2/ltx-2-19b-ic-lora-detailer.safetensors',
                        strength_model: value.detail_strength,
                        model: [':3', 0],
                    },
                    class_type: 'LoraLoaderModelOnly',
                    _meta: {
                        title: 'LoraLoaderModelOnly',
                    },
                },
            };
            if (i2v) {
                wf[':5'] = {
                    inputs: {
                        strength: 1,
                        bypass: false,
                        vae: [model_node_id, 2],
                        image: [image_node_id, 0],
                        latent: samplesNode,
                    },
                    class_type: 'LTXVImgToVideoInplace',
                    _meta: {
                        title: 'LTXVImgToVideoInplace',
                    },
                };
                wf[':1'].inputs.video_latent = [':5', 0];
            }
            const wfNodeID = insertGraph(api, wf);
            const upscaleOutputNode = [wfNodeID + ':2', 0];
            if (keyframes?.length) {
                keyframeHandler(
                    api,
                    value.temporal
                        ? keyframes
                              .filter(
                                  (kf) =>
                                      !kf.image.match(/\.(mp4|webm|avi|wmv)$/)
                              )
                              .map((kf) => ({
                                  ...kf,
                                  position: kf.position * 2,
                              }))
                        : keyframes,
                    {
                        id: 'handle',
                        field: '',
                        cond_node_id: wfNodeID + ':2',
                        model_node_id,
                        concat_node_id: wfNodeID + ':1',
                        crop_node_id,
                    }
                );
            }
            api[output_node_id].inputs.av_latent = upscaleOutputNode;
            if (!value.audio) {
                api[audio_node_id].inputs.samples = [separateNodeID, 1];
            }
        }
    );
    useRegisterHandler({ name, handler });
    return (
        <VerticalBox alignItems='flex-start'>
            <Box display='flex' flexDirection='row' gap={2} {...props}>
                <ToggleInput
                    name={`${name}.spatial`}
                    label='upsample_spatial'
                    defaultValue={defaults.spatial}
                />
                <ToggleInput
                    name={`${name}.temporal`}
                    label='upsample_temporal'
                    defaultValue={defaults.temporal}
                />
                <ToggleInput
                    name={`${name}.audio`}
                    label='upsample_audio'
                    disabled={!value?.temporal && !value?.spatial}
                    defaultValue={defaults.audio}
                />
            </Box>
            {(value?.temporal || value?.spatial) && (
                <>
                    <SliderInput
                        name={`${name}.steps`}
                        label='steps'
                        defaultValue={defaults.steps}
                        max={20}
                    />
                    <Box
                        display='flex'
                        flexDirection='row'
                        gap={2}
                        width='100%'
                    >
                        <SliderInput
                            name={`${name}.distill_strength`}
                            label='upsample_distill_strength'
                            defaultValue={defaults.distill_strength}
                            max={1}
                            step={0.05}
                        />
                        <SliderInput
                            name={`${name}.detail_strength`}
                            label='upsample_detail_strength'
                            defaultValue={defaults.detail_strength}
                            max={1}
                            step={0.05}
                        />
                    </Box>
                    <SamplerSelectInput
                        name={`${name}.sampler`}
                        label='upsample_sampler'
                        defaultValue={defaults.sampler}
                    />
                    <SchedulerSelectInput
                        name={`${name}.scheduler`}
                        label='upsample_scheduler'
                        defaultValue={defaults.scheduler}
                    />
                </>
            )}
        </VerticalBox>
    );
};
