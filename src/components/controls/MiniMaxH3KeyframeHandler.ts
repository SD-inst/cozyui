import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';

type TRefEntry = {
    image?: string;
    video?: string;
    keyframe?: boolean;
    keyframe_position?: number;
    [key: string]: any;
};

/**
 * Inserts MiniMaxH3AddGuide nodes for the enabled keyframes (from both
 * ref_images and ref_videos) and chains them into the basic guider's
 * conditioning input, the same way LoRAs are chained.
 *
 * The image/video outputs are read from the reference node's inputs, which
 * are already connected by the ReferenceImages / ReferenceVideos handlers
 * (after all transformations: rescale, resample, trim, etc.).
 */
export const keyframeHandler = (
    api: any,
    images: TRefEntry[],
    videos: TRefEntry[],
    control: controlType,
) => {
    const refNodeID = control.node_id;
    const guiderNodeID = control.guider_node_id;
    const vaeNodeID = control.vae_node_id;
    const audioVaeNodeID = control.audio_vae_node_id;
    if (!refNodeID || !guiderNodeID || !vaeNodeID || !audioVaeNodeID) {
        return;
    }

    const keyframes: Array<{ image: any; position: number }> = [];
    (images || []).forEach((v, idx) => {
        if (v.keyframe && v.image) {
            const imageOutput = api[refNodeID].inputs[
                'ref_images.ref_image_' + idx
            ];
            if (imageOutput) {
                keyframes.push({
                    image: imageOutput,
                    position: v.keyframe_position || 0,
                });
            }
        }
    });
    (videos || []).forEach((v, idx) => {
        if (v.keyframe && v.video) {
            const videoOutput = api[refNodeID].inputs[
                'ref_videos.ref_video_' + idx
            ];
            if (videoOutput) {
                keyframes.push({
                    image: videoOutput,
                    position: v.keyframe_position || 0,
                });
            }
        }
    });

    if (!keyframes.length) {
        return;
    }

    keyframes.sort((a, b) => a.position - b.position);

    const basePositive = api[guiderNodeID].inputs.conditioning;
    const latent = [refNodeID, 1];

    let currentPositive = basePositive;
    keyframes.forEach((kf) => {
        const guideNodeID = getFreeNodeId(api) + '';
        api[guideNodeID] = {
            inputs: {
                frame_idx: Math.round(kf.position * 24),
                positive: currentPositive,
                latent: latent,
                vae: [vaeNodeID, 0],
                audio_vae: [audioVaeNodeID, 0],
                image: kf.image,
            },
            class_type: 'MiniMaxH3AddGuide',
            _meta: { title: 'Add Guide for MiniMax H3' },
        };
        currentPositive = [guideNodeID, 0];
    });

    api[guiderNodeID].inputs.conditioning = currentPositive;
};
