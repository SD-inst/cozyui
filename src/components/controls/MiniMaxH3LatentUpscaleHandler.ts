import { NodeRef, Workflow } from '../../api/graph';
import { getFreeNodeId, insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import {
    collectKeyframeEntries,
    TRefEntry,
} from './MiniMaxH3KeyframeHandler';

export type TValue = {
    enabled: boolean;
    main_steps: number;
    megapixels: number;
    steps: number;
    sampler: string;
    seed: number;
};

/**
 * The VAE downsample factor for the MiniMax H3 video VAE: the upscaled video
 * latent's pixel size is its latent size × 16.
 */
const VAE_DOWNSAMPLE = 16;

/**
 * Computes the base pixel size, mirroring the ResolutionSelector's formula
 * (the node that drives the reference node's width/height). Returns the
 * base resolution's width/height, rounded to the `multiple`.
 */
const computeBaseResolution = (
    wRatio: number,
    hRatio: number,
    baseMP: number,
    multiple: number,
): { width: number; height: number } => {
    const totalPixels = baseMP * 1024 * 1024;
    const scale = Math.sqrt(totalPixels / (wRatio * hRatio));
    const width = Math.round((wRatio * scale) / multiple) * multiple;
    const height = Math.round((hRatio * scale) / multiple) * multiple;
    return { width, height };
};

/**
 * Parses an aspect-ratio string like "16:9 (Widescreen)" into its
 * (width, height) ratio tuple. Falls back to 1:1 when it cannot be parsed.
 */
export const parseAspectRatio = (
    aspectRatio: string | undefined,
): { w: number; h: number } => {
    if (!aspectRatio) {
        return { w: 1, h: 1 };
    }
    const match = aspectRatio.match(/^(\d+):(\d+)/);
    if (match) {
        const w = parseInt(match[1], 10);
        const h = parseInt(match[2], 10);
        if (h > 0 && w > 0) {
            return { w, h };
        }
    }
    return { w: 1, h: 1 };
};

/**
 * Computes the upscaled pixel size, mirroring the full chain:
 * ResolutionSelector (base res) → base aspect ratio → the upscaler's
 * MEGAPIXELS formula (aspect-ratio-preserving, aligned to 32, snapped to the
 * VAE grid of 16). This is a static computation so it does not create a
 * dependency on the runtime `:upscale` output (which would cycle back through
 * the reference node).
 */
export const computeUpscaledPixelSize = (
    aspectRatio: string | undefined,
    baseMP: number,
    multiple: number,
    targetMP: number,
): { width: number; height: number } => {
    const { w: wRatio, h: hRatio } = parseAspectRatio(aspectRatio);
    const base = computeBaseResolution(wRatio, hRatio, baseMP, multiple);
    const aspect = base.width / base.height;
    const targetPixels = targetMP * 1024 * 1024;
    const hPixelTarget = Math.sqrt(targetPixels / aspect);
    const wPixelTarget = hPixelTarget * aspect;
    const align = 32;
    const wPixelAligned = Math.round(wPixelTarget / align) * align;
    const hPixelAligned = Math.round(hPixelTarget / align) * align;
    const width = Math.round(wPixelAligned / VAE_DOWNSAMPLE) * VAE_DOWNSAMPLE;
    const height = Math.round(hPixelAligned / VAE_DOWNSAMPLE) * VAE_DOWNSAMPLE;
    return { width, height };
};

const STEPS_SIGMAS: Record<number, string> = {
    3: '0.9035, 0.6316, 0.3158, 0.0000',
    4: '0.9035, 0.8000, 0.6316, 0.3158, 0.0000',
    5: '0.9231, 0.8780, 0.8000, 0.6316, 0.3158, 0.0000',
};

/**
 * Form values the second-sampler guider needs to anchor keyframes on the
 * upscaled latent. Only the fields relevant to the active tab are read.
 */
export type TSecondGuiderValues = {
    refImages?: TRefEntry[];
    refVideos?: TRefEntry[];
    firstFrame?: string;
    lastFrame?: string;
    /** The form's aspect ratio (e.g. "16:9 (Widescreen)"). */
    aspectRatio?: string;
    /** The base-resolution megapixels (the `megapixels` control). */
    baseMP?: number;
    /** The latent-upscale target megapixels. */
    targetMP?: number;
    /**
     * When PDD acceleration is on, the second (upscale) pass runs on the model
     * BEFORE the PDD node — the PDD LoRAs are only valid on the base pass, so
     * the second guider's model is set to this ref instead of the base guider's.
     */
    pddModelRef?: NodeRef;
};

/**
 * Builds the second (upscale) sampler's own guider, anchored on the upscaled
 * `:concat` latent. The base-res guider (`guider_node_id`) is invalid for the
 * upscaled target because its keyframe conditioning was anchored at the base
 * resolution, so a parallel conditioning is needed at the upscaled resolution.
 *
 * - R2V (`MiniMaxH3ReferenceToVideo`): the second sampler duplicates the
 *   reference node at the upscaled resolution with the same `ref_images` and
 *   `ref_videos` (keyframes as VLM reference material), but WITHOUT the
 *   AddGuide chain — the keyframes are not overlaid on the latent. This avoids
 *   the crossfade artifact caused by the AddGuide's cover-crop when the
 *   keyframe aspect differs from the generation aspect, while the VLM still
 *   sees the keyframes for scene/character consistency.
 * - I2V (`MiniMaxH3ImageToVideo`): keyframes are baked into the reference node
 *   at its own width/height — duplicate that node driven by the upscaled pixel
 *   size (upscaled video latent size × VAE downsample) so the baked keyframes
 *   land on the upscaled grid.
 *
 * Returns the new guider's node ID, or null when there are no keyframes (the
 * conditioning is then resolution-independent and the base guider stays valid).
 */
export const buildSecondGuider = (
    api: Workflow,
    baseNodeID: string,
    control: controlType,
    values: TSecondGuiderValues,
    modelRef?: NodeRef,
): string | null => {
    const refNodeID = control.node_id;
    const guiderNodeID = control.guider_node_id;
    const refNode = refNodeID ? api[refNodeID] : undefined;
    if (!guiderNodeID || !refNode) {
        return null;
    }
    const model = modelRef ?? api[guiderNodeID].inputs.model;

    if (refNode.class_type === 'MiniMaxH3ReferenceToVideo') {
        const entries = collectKeyframeEntries(
            api,
            values.refImages || [],
            values.refVideos || [],
            refNodeID,
        );
        if (!entries.length) {
            if (!modelRef) {
                return null;
            }
            // PDD variant 2: no keyframes, but the upscale pass must run on the
            // pre-PDD model (the base guider carries the PDD model). Reuse the
            // base conditioning and swap only the model.
            const guiderID = getFreeNodeId(api) + '';
            api[guiderID] = {
                inputs: {
                    model,
                    conditioning: api[guiderNodeID].inputs.conditioning,
                },
                class_type: 'BasicGuider',
                _meta: { title: 'Basic Guider (Latent Upscale)' },
            };
            return guiderID;
        }
        // The second sampler does NOT overlay keyframes (no AddGuide) — the
        // keyframes are passed as VLM reference material only. A parallel
        // reference node is duplicated at the upscaled resolution with the
        // same `ref_images` and `ref_videos`, so the VLM sees them at the
        // upscaled scale for consistency, but no AddGuide overlays them on the
        // latent (avoiding the cover-crop crossfade artifact). The upscaled
        // size is computed statically from the aspect ratio and target MP
        // (mirroring the upscaler's MEGAPIXELS formula) because feeding the
        // reference node — upstream of the upscaler — with a value derived
        // from the runtime `:upscale` output would create a dependency cycle.
        const resSelID =
            Array.isArray(refNode.inputs.width) && refNode.inputs.width[0];
        const multiple =
            ((resSelID && api[resSelID as string]?.inputs?.multiple) as number) ||
            32;
        const upSize = computeUpscaledPixelSize(
            values.aspectRatio,
            values.baseMP ?? 0.4,
            multiple,
            values.targetMP ?? 1,
        );
        const newRefID = getFreeNodeId(api) + '';
        const newRefInputs: Record<string, any> = {
            prompt: refNode.inputs.prompt,
            clip: refNode.inputs.clip,
            vae: refNode.inputs.vae,
            audio_vae: refNode.inputs.audio_vae,
            length: refNode.inputs.length,
            width: upSize.width,
            height: upSize.height,
        };
        // Copy the reference material (images, videos, video soundtracks,
        // standalone audio) and the `ref_image_size` setting. No AddGuide is
        // added — the keyframes are reference material only, not overlaid on
        // the latent.
        Object.keys(refNode.inputs).forEach((key) => {
            if (
                key.startsWith('ref_images.') ||
                key.startsWith('ref_videos.') ||
                key.startsWith('ref_video_audios.') ||
                key.startsWith('ref_audios.') ||
                key === 'ref_image_size'
            ) {
                newRefInputs[key] = refNode.inputs[key];
            }
        });
        api[newRefID] = {
            inputs: newRefInputs,
            class_type: 'MiniMaxH3ReferenceToVideo',
            _meta: { title: 'MiniMax H3 Reference to Video (Latent Upscale)' },
        };
        const guiderID = getFreeNodeId(api) + '';
        api[guiderID] = {
            inputs: { model, conditioning: [newRefID, 0] },
            class_type: 'BasicGuider',
            _meta: { title: 'Basic Guider (Latent Upscale)' },
        };
        return guiderID;
    }

    if (refNode.class_type === 'MiniMaxH3ImageToVideo') {
        const hasFirst = values.firstFrame && refNode.inputs.first_frame;
        const hasLast = values.lastFrame && refNode.inputs.last_frame;
        if (!hasFirst && !hasLast) {
            if (!modelRef) {
                return null;
            }
            // PDD variant 2: no frames, but the upscale pass must run on the
            // pre-PDD model. Reuse the base conditioning and swap only the model.
            const guiderID = getFreeNodeId(api) + '';
            api[guiderID] = {
                inputs: {
                    model,
                    conditioning: api[guiderNodeID].inputs.conditioning,
                },
                class_type: 'BasicGuider',
                _meta: { title: 'Basic Guider (Latent Upscale)' },
            };
            return guiderID;
        }
        // Upscaled pixel size = upscaled video latent size × VAE downsample (16).
        const sizeID = getFreeNodeId(api) + '';
        api[sizeID] = {
            inputs: { latent: [baseNodeID + ':upscale', 0] },
            class_type: 'GetLatentSizeAndCount',
            _meta: { title: 'Get Latent Size (Latent Upscale)' },
        };
        const heightID = getFreeNodeId(api) + '';
        api[heightID] = {
            inputs: { expression: 'a * 16', 'values.a': [sizeID, 4] },
            class_type: 'ComfyMathExpression',
            _meta: { title: 'Upscaled Height (Latent Upscale)' },
        };
        const widthID = getFreeNodeId(api) + '';
        api[widthID] = {
            inputs: { expression: 'a * 16', 'values.a': [sizeID, 5] },
            class_type: 'ComfyMathExpression',
            _meta: { title: 'Upscaled Width (Latent Upscale)' },
        };
        // Duplicate the reference node at the upscaled resolution. Its latent
        // output is unused — only the conditioning (with keyframes baked at the
        // upscaled res) is fed to the second sampler's guider.
        const condID = getFreeNodeId(api) + '';
        api[condID] = {
            inputs: {
                prompt: refNode.inputs.prompt,
                clip: refNode.inputs.clip,
                vae: refNode.inputs.vae,
                length: refNode.inputs.length,
                width: [widthID, 1],
                height: [heightID, 1],
                ...(hasFirst
                    ? { first_frame: refNode.inputs.first_frame }
                    : {}),
                ...(hasLast ? { last_frame: refNode.inputs.last_frame } : {}),
            },
            class_type: 'MiniMaxH3ImageToVideo',
            _meta: { title: 'MiniMax H3 Image to Video (Latent Upscale)' },
        };
        const guiderID = getFreeNodeId(api) + '';
        api[guiderID] = {
            inputs: { model, conditioning: [condID, 0] },
            class_type: 'BasicGuider',
            _meta: { title: 'Basic Guider (Latent Upscale)' },
        };
        return guiderID;
    }

    return null;
};

/**
 * Inserts the latent-upscale sub-graph and rewires the workflow for it. Pure
 * (operates on the `api` object + a value getter) so it can be unit-tested.
 */
export const applyLatentUpscale = (
    api: Workflow,
    value: TValue,
    control: controlType,
    values: TSecondGuiderValues,
) => {
    if (!value?.enabled) {
        return;
    }
    const {
        sampler_node_id,
        video_vae_decode_node_id,
        audio_vae_decode_node_id,
        guider_node_id,
    } = control;
    if (
        !sampler_node_id ||
        !video_vae_decode_node_id ||
        !audio_vae_decode_node_id ||
        !guider_node_id
    ) {
        return;
    }
    // The main pass keeps whatever sigmas it already has: the scheduler's in
    // normal mode, or the PDD node's when PDD acceleration is on (the PDD
    // handler runs first and rewires the main sampler's sigmas). Splitting
    // those keeps the PDD schedule intact on the base pass.
    const mainSigmas = api[sampler_node_id].inputs.sigmas;
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
                sigmas: mainSigmas,
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
                model_name: 'minimax_h3_latent_upscaler_3d_fp16.safetensors',
                mode: 'megapixels',
                'mode.megapixels': value.megapixels,
                align: 32,
                keep_proportion: true,
                device: 'cuda',
                precision: 'fp32',
                latent: [':separate', 0],
                enable_chunking: false,
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

    const newGuiderID = buildSecondGuider(
        api,
        baseNodeID,
        control,
        values,
        values.pddModelRef,
    );
    if (newGuiderID) {
        api[baseNodeID + ':sampler'].inputs.guider = [newGuiderID, 0];
    }
};
