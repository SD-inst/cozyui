import { InputValue, isNodeRef, Workflow } from '../../api/graph';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';

export type TValue = {
    enabled: boolean;
    steps: number;
    audio_denoise: number;
    sampler: string;
    scheduler: string;
    seed: number;
};

/**
 * Reads the conditioning of the guider that feeds the sampler `samplerID`
 * (sampler → guider → conditioning), or `undefined` when the chain is absent.
 */
const conditioningOfSampler = (
    api: Workflow,
    samplerID: string,
): InputValue | undefined => {
    const guiderRef = api[samplerID]?.inputs.guider;
    if (!guiderRef || !isNodeRef(guiderRef)) {
        return undefined;
    }
    return api[guiderRef[0]]?.inputs.conditioning;
};

/**
 * Inserts the audio-refine sub-graph (H3FrozenVideoCache → H3AudioRefineSampler)
 * and rewires the final VAE decodes to its output. Pure (operates on the `api`
 * object) so it can be unit-tested.
 *
 * Wiring:
 * - the cache node's `model` taps the sigma-shift node's output directly: the
 *   refine pass runs on the user LoRAs + shift, but NOT on the turbo LoRA (now
 *   inserted downstream of the shift node) and NOT on the PDD node.
 * - `latent` is whatever currently feeds the video VAE decode: the base
 *   sampler's output, or the latent-upscale sampler's output when the upscaler
 *   is active (its handler runs before this one).
 * - `positive`/`negative` are taken from the guider of THAT SAME sampler, so the
 *   conditioning always matches the latent: with latent upscale the second
 *   sampler has its own guider whose conditioning is built at the upscaled
 *   resolution, and the base-res conditioning would mismatch the latent's
 *   tensor sizes. It is already RefMod-applied when refmods are active (their
 *   handler runs first).
 */
export const applyAudioRefine = (
    api: Workflow,
    value: TValue,
    control: controlType,
): void => {
    if (!value?.enabled) {
        return;
    }
    const {
        sigma_shift_node_id,
        guider_node_id,
        video_vae_decode_node_id,
        audio_vae_decode_node_id,
    } = control;
    if (
        !sigma_shift_node_id ||
        !guider_node_id ||
        !video_vae_decode_node_id ||
        !audio_vae_decode_node_id
    ) {
        return;
    }
    const videoDecode = api[video_vae_decode_node_id];
    if (!videoDecode) {
        return;
    }
    const latent = videoDecode.inputs.samples;
    if (!isNodeRef(latent)) {
        return;
    }
    // Conditioning comes from the guider of the sampler that produced this
    // latent (base sampler or latent-upscale sampler).
    const samplerConditioning = conditioningOfSampler(api, latent[0]);
    // Fallback: the configured base guider (the sampler's guider chain is
    // absent only in an incomplete workflow).
    const conditioning =
        samplerConditioning && isNodeRef(samplerConditioning)
            ? samplerConditioning
            : api[guider_node_id]?.inputs?.conditioning;
    if (!conditioning || !isNodeRef(conditioning)) {
        return;
    }
    const graph: Workflow = {
        ':cache': {
            inputs: {
                enabled: true,
                cache_contents: 'hidden',
                backend: 'auto',
                precision: 'int4',
                refresh_interval: 0,
                verbose: false,
                allow_disk: false,
                vram_margin_gb: 1,
                free_after_pass: false,
                model: [sigma_shift_node_id, 0],
            },
            class_type: 'H3FrozenVideoCache',
            _meta: { title: 'H3 Frozen Video Cache' },
        },
        ':refine': {
            inputs: {
                seed: value.seed,
                steps: value.steps,
                cfg: 1,
                sampler_name: value.sampler,
                scheduler: value.scheduler,
                audio_denoise: value.audio_denoise,
                video_denoise: 0,
                model: [':cache', 0],
                positive: conditioning,
                negative: conditioning,
                latent,
            },
            class_type: 'H3AudioRefineSampler',
            _meta: { title: 'H3 Audio Refine Sampler' },
        },
    };
    const baseID = insertGraph(api, graph);
    const refineID = baseID + ':refine';
    api[video_vae_decode_node_id].inputs.samples = [refineID, 0];
    api[audio_vae_decode_node_id].inputs.samples = [refineID, 0];
};
