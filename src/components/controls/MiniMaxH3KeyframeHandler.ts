import { NodeRef, Workflow } from '../../api/graph';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';
import {
    anchorFrameOf,
    anchorSourceRef,
    applyPass1LatentAnchors,
    buildAnchorFitChain,
    collectLatentEntries,
    computeAnchorPlan,
    TAnchorEntry,
    TAnchorRegion,
} from './MiniMaxH3LatentAnchor';

export type TRefEntry = {
    image?: string;
    video?: string;
    keyframe?: boolean;
    /** Legacy: anchor position in seconds (kept for stored forms). */
    keyframe_position?: number;
    /** Anchor position in frames (H3, the model's own unit). */
    keyframe_frame?: number;
    latent?: boolean;
    trim?: number;
    [key: string]: any;
};

export type TKeyframeEntry = {
    kind: 'image' | 'video';
    /** Index inside the ref_images / ref_videos form array. */
    index: number;
    image: NodeRef;
    /** Guide position in frames. */
    frame: number;
};

/**
 * Collects the enabled keyframes (from both ref_images and ref_videos), reading
 * the image/video outputs from the reference node's inputs, which are already
 * connected by the ReferenceImages / ReferenceVideos handlers (after all
 * transformations: rescale, resample, trim, etc.). Returns entries sorted by
 * frame.
 */
export const collectKeyframeEntries = (
    api: Workflow,
    images: TRefEntry[],
    videos: TRefEntry[],
    refNodeID: string,
): TKeyframeEntry[] => {
    const keyframes: TKeyframeEntry[] = [];
    (images || []).forEach((v, idx) => {
        // Skipped items have no node built by the ReferenceImages handler, so
        // their slot is left at the API default; guard on `skip` too so the
        // keyframe is never collected regardless of that default.
        if (v.keyframe && v.image && !v.skip) {
            const imageOutput = api[refNodeID].inputs[
                'ref_images.ref_image_' + idx
            ];
            if (Array.isArray(imageOutput)) {
                keyframes.push({
                    kind: 'image',
                    index: idx,
                    image: imageOutput as NodeRef,
                    frame: anchorFrameOf(v),
                });
            }
        }
    });
    (videos || []).forEach((v, idx) => {
        if (v.keyframe && v.video && !v.skip) {
            const videoOutput = api[refNodeID].inputs[
                'ref_videos.ref_video_' + idx
            ];
            if (Array.isArray(videoOutput)) {
                keyframes.push({
                    kind: 'video',
                    index: idx,
                    image: videoOutput as NodeRef,
                    frame: anchorFrameOf(v),
                });
            }
        }
    });
    keyframes.sort((a, b) => a.frame - b.frame);
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
    api: Workflow,
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
                frame_idx: kf.frame,
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
 * Unified H3 anchor handler. Video anchors (keyframe=AddGuide and/or latent)
 * share one anchor plan (`computeAnchorPlan`) and one fitted clip
 * (`buildAnchorFitChain`, exactly 17m+5 frames, padded with repeats): video
 * guides therefore no longer rely on core AddGuide's silent start-crop, and
 * the guide's conditioning tokens and the latent region carry identical
 * frames at the same 17-frame-aligned position — the source of the old
 * flashes and duplicated-segment desyncs. Image guides keep their exact
 * position (single-frame guides are valid anywhere); image latents splice one
 * slot. Latent entries additionally VAE-encode the fitted clip into the
 * sampler's AV latent, freeze its slots with a nested noise_mask and splice
 * the clip's soundtrack into the audio stream (see MiniMaxH3LatentAnchor).
 */
export const keyframeHandler = (
    api: Workflow,
    images: TRefEntry[],
    videos: TRefEntry[],
    control: controlType,
    values?: { length?: number },
) => {
    const refNodeID = control.node_id;
    const guiderNodeID = control.guider_node_id;
    const vaeNodeID = control.vae_node_id;
    const audioVaeNodeID = control.audio_vae_node_id;
    if (!refNodeID) {
        return;
    }

    const guideEntries = collectKeyframeEntries(
        api,
        images,
        videos,
        refNodeID,
    );
    const latentEntries = collectLatentEntries(images, videos);

    // One plan for every flagged entry so guides and latent anchors agree.
    const planEntries: TAnchorEntry[] = [];
    (videos || []).forEach((v, idx) => {
        if ((v.keyframe || v.latent) && v.video && !v.skip) {
            planEntries.push({
                kind: 'video',
                index: idx,
                position: anchorFrameOf(v),
                trim: v.trim || 0,
            });
        }
    });
    (images || []).forEach((v, idx) => {
        if (v.latent && v.image && !v.skip) {
            planEntries.push({
                kind: 'image',
                index: idx,
                position: anchorFrameOf(v),
                trim: 0,
            });
        }
    });
    const plan = computeAnchorPlan(values?.length ?? 5, planEntries);

    let fits: Map<TAnchorRegion, NodeRef> | undefined;
    let sources: Map<TAnchorRegion, NodeRef> | undefined;
    if (plan) {
        const sourceMap = new Map<TAnchorRegion, NodeRef>();
        const imageSources = new Map<TAnchorRegion, NodeRef>();
        plan.regions.forEach((region) => {
            const entry = planEntries.find(
                (e) => e.kind === region.kind && e.index === region.index,
            );
            if (!entry) {
                return;
            }
            const ref = anchorSourceRef(api, refNodeID, entry);
            if (!ref) {
                return;
            }
            if (region.kind === 'video') {
                sourceMap.set(region, ref);
            } else {
                imageSources.set(region, ref);
            }
        });
        fits = buildAnchorFitChain(api, {
            regions: plan.regions,
            sources: sourceMap,
        });
        sources = imageSources;
    }

    if (
        guideEntries.length &&
        guiderNodeID &&
        vaeNodeID &&
        audioVaeNodeID
    ) {
        guideEntries.forEach((kf) => {
            const region = plan?.regions.find(
                (r) => r.kind === kf.kind && r.index === kf.index,
            );
            if (region) {
                kf.frame = region.guideFrameIndex;
                const fit = fits?.get(region);
                if (kf.kind === 'video' && fit) {
                    kf.image = fit;
                }
            }
        });
        const basePositive = api[guiderNodeID]
            .inputs.conditioning as NodeRef;
        const result = buildKeyframeChain(
            api,
            guideEntries,
            [refNodeID, 1],
            basePositive,
            [vaeNodeID, 0],
            [audioVaeNodeID, 0],
        );
        api[guiderNodeID].inputs.conditioning = result;
    }

    if (latentEntries.length && plan && fits && sources) {
        applyPass1LatentAnchors(api, control, plan, latentEntries, {
            fits,
            sources,
        });
    }
};
