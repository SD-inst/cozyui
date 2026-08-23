import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';

export type TRefEntry = {
    image?: string;
    video?: string;
    keyframe?: boolean;
    keyframe_position?: number;
    [key: string]: any;
};

export type TKeyframeEntry = { image: any; position: number };

/**
 * Collects the enabled keyframes (from both ref_images and ref_videos), reading
 * the image/video outputs from the reference node's inputs, which are already
 * connected by the ReferenceImages / ReferenceVideos handlers (after all
 * transformations: rescale, resample, trim, etc.). Returns entries sorted by
 * position.
 */
export const collectKeyframeEntries = (
    api: any,
    images: TRefEntry[],
    videos: TRefEntry[],
    refNodeID: string,
): TKeyframeEntry[] => {
    const keyframes: TKeyframeEntry[] = [];
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
    keyframes.sort((a, b) => a.position - b.position);
    return keyframes;
};

/**
 * Creates the MiniMaxH3AddGuide chain for `entries` on top of `basePositive`,
 * anchoring each keyframe to the `latent` AV latent (which `MiniMaxH3AddGuide`
 * reads at runtime, so the anchors land on the latent's own resolution).
 * Returns the final positive [nodeId, 0] (or `basePositive` when there are no
 * entries).
 */
export const buildKeyframeChain = (
    api: any,
    entries: TKeyframeEntry[],
    latent: [string, number],
    basePositive: [string, number],
    vae: [string, number],
    audioVae: [string, number],
): [string, number] => {
    let currentPositive = basePositive;
    entries.forEach((kf) => {
        const nodeID = getFreeNodeId(api) + '';
        api[nodeID] = {
            inputs: {
                frame_idx: Math.round(kf.position * 24),
                positive: currentPositive,
                latent: latent,
                vae: vae,
                audio_vae: audioVae,
                image: kf.image,
            },
            class_type: 'MiniMaxH3AddGuide',
            _meta: { title: 'Add Guide for MiniMax H3' },
        };
        currentPositive = [nodeID, 0];
    });
    return currentPositive;
};

/**
 * Inserts MiniMaxH3AddGuide nodes for the enabled keyframes (from both
 * ref_images and ref_videos) and chains them into the basic guider's
 * conditioning input, the same way LoRAs are chained.
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

    const entries = collectKeyframeEntries(api, images, videos, refNodeID);
    if (!entries.length) {
        return;
    }

    const basePositive = api[guiderNodeID].inputs.conditioning;
    const result = buildKeyframeChain(
        api,
        entries,
        [refNodeID, 1],
        basePositive,
        [vaeNodeID, 0],
        [audioVaeNodeID, 0],
    );
    api[guiderNodeID].inputs.conditioning = result;
};
