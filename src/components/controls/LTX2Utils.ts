import { useEventCallback } from 'yet-another-react-lightbox';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { UploadType } from './UploadType';
import { useFormContext } from 'react-hook-form';

type nodes = {
    audio_vae_node_id: string;
    video_node_id: string;
    concat_node_id: string;
};

export const LTXVideoHandler = (
    api: any,
    nodes: nodes,
    fps: number,
    length: number,
    noAudio: boolean = false,
) => {
    api[nodes.video_node_id].force_rate = fps;

    const graph: any = {
        ':2': {
            inputs: {
                video_info: [nodes.video_node_id, 3],
            },
            class_type: 'VHS_VideoInfoLoaded',
            _meta: {
                title: 'Video Info (Loaded) 🎥🅥🅗🅢',
            },
        },
        ':1': {
            inputs: {
                video_fps: fps,
                video_start_time: [':2', 2],
                video_end_time: length / fps,
                audio_start_time: 0,
                audio_end_time: length / fps,
                max_length: 'pad',
            },
            class_type: 'LTXVAudioVideoMask',
            _meta: {
                title: 'LTXV Audio/Video Mask',
            },
        },
    };

    if (!noAudio) {
        graph[':1'].inputs.audio_latent = [':3', 0];
        graph[':1'].inputs.audio_start_time = [':2', 2];
        graph[':3'] = {
            inputs: {
                audio: [nodes.video_node_id, 2],
                audio_vae: [nodes.audio_vae_node_id, 0],
            },
            class_type: 'LTXVAudioVAEEncode',
            _meta: {
                title: 'LTXV Audio VAE Encode',
            },
        };
    }
    const graphNodeID = insertGraph(api, graph);
    const maskNodeID = graphNodeID + ':1';
    api[maskNodeID].inputs.video_latent =
        api[nodes.concat_node_id].inputs.video_latent;
    api[nodes.concat_node_id].inputs.video_latent = [maskNodeID, 0];
    if (!noAudio) {
        api[nodes.concat_node_id].inputs.audio_latent = [maskNodeID, 1];
    }
};

export const useLTXUploadHandler = () => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (
            api: any,
            _value: string,
            control: controlType,
            filetype: UploadType,
        ) => {
            if (filetype !== UploadType.VIDEO) {
                return;
            }
            const fps = getValues('fps');
            const length = getValues('length');
            const noAudio = getValues('no_audio');
            return LTXVideoHandler(
                api,
                {
                    audio_vae_node_id: control.audio_vae_node_id,
                    video_node_id: control.node_id,
                    concat_node_id: control.concat_node_id,
                },
                fps,
                length,
                noAudio,
            );
        },
    );
    return handler;
};
