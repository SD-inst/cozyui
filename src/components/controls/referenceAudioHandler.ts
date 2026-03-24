import { useEventCallback } from 'yet-another-react-lightbox';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useFormContext } from 'react-hook-form';

export type TReferenceAudio = {
    enabled: boolean;
    source: boolean;
    igc: number;
    audio: string;
    trim: number;
};

export const useReferenceAudioHandler = () => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, value: TReferenceAudio, control: controlType) => {
            if (!value || !value.enabled || !value.audio) {
                return;
            }
            const length = getValues('length');
            const fps = getValues('fps');
            const duration = length / fps;
            const { audio_vae_node_id, concat_node_id, guider_node_id } =
                control;
            const wf: { [key: string]: any } = {
                ':1': {
                    inputs: {
                        audio: value.audio,
                        audioUI: '',
                    },
                    class_type: 'LoadAudio',
                    _meta: {
                        title: 'Load Audio',
                    },
                },
            };
            if (value.source) {
                wf[':2'] = {
                    inputs: {
                        audio_vae: [audio_vae_node_id, 0],
                        audio: [':1', 0],
                    },
                    class_type: 'LTXVAudioVAEEncode',
                    _meta: {
                        title: 'LTXV Audio VAE Encode',
                    },
                };
                wf[':3'] = {
                    inputs: {
                        video_fps: fps,
                        video_start_time: 0,
                        video_end_time: duration,
                        audio_latent: [':2', 0],
                        audio_start_time:
                            value.trim < duration ? value.trim : duration,
                        audio_end_time: duration,
                        max_length: 'pad',
                    },
                    class_type: 'LTXVAudioVideoMask',
                    _meta: {
                        title: 'LTXV Audio/Video Mask',
                    },
                };
                const nodeID = insertGraph(api, wf);
                api[concat_node_id].inputs.audio_latent = [nodeID + ':3', 1];
            } else {
                const guider_inputs = api[guider_node_id].inputs;
                wf[':2'] = {
                    inputs: {
                        identity_guidance_scale: value.igc,
                        start_percent: 0,
                        end_percent: 1,
                        model: guider_inputs['model'],
                        positive: guider_inputs['positive'],
                        negative: guider_inputs['negative'],
                        reference_audio: [':1', 0],
                        audio_vae: [audio_vae_node_id, 0],
                    },
                    class_type: 'LTXVReferenceAudio',
                    _meta: {
                        title: 'LTXV Reference Audio (ID-LoRA)',
                    },
                };
                const nodeID = insertGraph(api, wf);
                api[guider_node_id].inputs.model = [nodeID + ':2', 0];
                api[guider_node_id].inputs.positive = [nodeID + ':2', 1];
                api[guider_node_id].inputs.negative = [nodeID + ':2', 2];
            }
        },
    );
    return handler;
};
