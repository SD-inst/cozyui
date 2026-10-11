import { describe, expect, it } from 'vitest';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';
import {
    applyAudioRefine,
    TValue,
} from './MiniMaxH3AudioRefinerHandler';

const value: TValue = {
    enabled: true,
    steps: 6,
    audio_denoise: 0.5,
    sampler: 'euler',
    scheduler: 'simple',
    seed: 1024,
};

const control: controlType = {
    id: 'handle',
    field: '',
    order: 150,
    sigma_shift_node_id: '136',
    guider_node_id: '105:16',
    video_vae_decode_node_id: '105:10',
    audio_vae_decode_node_id: '105:23',
};

const makeApi = (): Record<string, any> => ({
    '105:6': { inputs: { unet_name: 'model.safetensors' }, class_type: 'UNETLoader' },
    '136': { inputs: { shift_video: 12, shift_audio: 3, model: ['105:6', 0] }, class_type: 'MiniMaxH3SigmaShift' },
    '137': { inputs: { model: ['136', 0] }, class_type: 'SpectrumApplyMiniMaxH3' },
    '105:16': {
        inputs: { model: ['137', 0], conditioning: ['105:104', 0] },
        class_type: 'BasicGuider',
    },
    '105:14': {
        inputs: { guider: ['105:16', 0], latent_image: ['105:104', 1] },
        class_type: 'SamplerCustomAdvanced',
    },
    '105:10': { inputs: { samples: ['105:14', 0] }, class_type: 'VAEDecode' },
    '105:23': { inputs: { samples: ['105:14', 0] }, class_type: 'VAEDecodeAudio' },
});

const findByClass = (api: Record<string, any>, classType: string) =>
    Object.entries(api).filter(([, n]) => n.class_type === classType);

describe('applyAudioRefine', () => {
    it('does nothing when disabled', () => {
        const api = makeApi();
        applyAudioRefine(api, { ...value, enabled: false }, control);
        expect(findByClass(api, 'H3FrozenVideoCache')).toHaveLength(0);
        expect(findByClass(api, 'H3AudioRefineSampler')).toHaveLength(0);
        expect(api['105:10'].inputs.samples).toEqual(['105:14', 0]);
    });

    it('inserts the cache + sampler chain and rewires both VAE decodes', () => {
        const api = makeApi();
        const base = getFreeNodeId(api) + '';
        applyAudioRefine(api, value, control);

        const [[cacheID, cache]] = findByClass(api, 'H3FrozenVideoCache');
        const [[samplerID, sampler]] = findByClass(api, 'H3AudioRefineSampler');

        expect(cacheID).toBe(base + ':cache');
        expect(samplerID).toBe(base + ':refine');

        // the cache taps the sigma-shift node's output directly: user LoRAs +
        // shift are in, the turbo LoRA (downstream of the shift) is out
        expect(cache.inputs.model).toEqual(['136', 0]);
        expect(cache.inputs.precision).toBe('int4');
        expect(cache.inputs.cache_contents).toBe('hidden');

        // the sampler takes its model from the cache, the conditioning from
        // the base guider, and the latent from the base sampler
        expect(sampler.inputs.model).toEqual([base + ':cache', 0]);
        expect(sampler.inputs.positive).toEqual(['105:104', 0]);
        expect(sampler.inputs.negative).toEqual(['105:104', 0]);
        expect(sampler.inputs.latent).toEqual(['105:14', 0]);
        expect(sampler.inputs.cfg).toBe(1);
        expect(sampler.inputs.video_denoise).toBe(0);
        expect(sampler.inputs.steps).toBe(6);
        expect(sampler.inputs.audio_denoise).toBe(0.5);
        expect(sampler.inputs.seed).toBe(1024);

        // both decodes now read the refined latent
        expect(api['105:10'].inputs.samples).toEqual([samplerID, 0]);
        expect(api['105:23'].inputs.samples).toEqual([samplerID, 0]);
    });

    it('reuses the RefMod-applied conditioning of the base guider', () => {
        const api = makeApi();
        api['105:16'].inputs.conditioning = ['150:apply', 0];
        applyAudioRefine(api, value, control);

        const [, sampler] = findByClass(api, 'H3AudioRefineSampler')[0];
        expect(sampler.inputs.positive).toEqual(['150:apply', 0]);
        expect(sampler.inputs.negative).toEqual(['150:apply', 0]);
    });

    it('takes the conditioning of the upscale sampler own guider', () => {
        const api = makeApi();
        // applyLatentUpscale already built its second sampler with its own
        // guider, whose conditioning was created at the upscaled resolution
        api['140:sampler'] = {
            inputs: { guider: ['141', 0], latent_image: ['140:concat', 0] },
            class_type: 'SamplerCustomAdvanced',
        };
        api['141'] = {
            inputs: { model: ['136', 0], conditioning: ['142', 0] },
            class_type: 'BasicGuider',
        };
        api['105:10'].inputs.samples = ['140:sampler', 0];
        api['105:23'].inputs.samples = ['140:sampler', 0];
        applyAudioRefine(api, value, control);

        const [, sampler] = findByClass(api, 'H3AudioRefineSampler')[0];
        expect(sampler.inputs.latent).toEqual(['140:sampler', 0]);
        // upscaled conditioning, NOT the base 105:104 conditioning
        expect(sampler.inputs.positive).toEqual(['142', 0]);
        expect(sampler.inputs.negative).toEqual(['142', 0]);
        expect(api['105:10'].inputs.samples).not.toEqual(['140:sampler', 0]);
        expect(api['105:23'].inputs.samples).toEqual(
            api['105:10'].inputs.samples,
        );
    });

    it('uses the base guider when the upscale sampler kept it (no keyframes)', () => {
        const api = makeApi();
        api['140:sampler'] = {
            inputs: { guider: ['105:16', 0] },
            class_type: 'SamplerCustomAdvanced',
        };
        api['105:10'].inputs.samples = ['140:sampler', 0];
        api['105:23'].inputs.samples = ['140:sampler', 0];
        applyAudioRefine(api, value, control);

        const [, sampler] = findByClass(api, 'H3AudioRefineSampler')[0];
        expect(sampler.inputs.latent).toEqual(['140:sampler', 0]);
        expect(sampler.inputs.positive).toEqual(['105:104', 0]);
    });

    it('falls back to the configured base guider when the sampler chain is broken', () => {
        const api = makeApi();
        api['105:14'].inputs.guider = undefined;
        applyAudioRefine(api, value, control);

        const [, sampler] = findByClass(api, 'H3AudioRefineSampler')[0];
        expect(sampler.inputs.positive).toEqual(['105:104', 0]);
    });

    it('does nothing when the control ids are incomplete', () => {
        const api = makeApi();
        applyAudioRefine(api, value, { ...control, guider_node_id: undefined });
        expect(findByClass(api, 'H3AudioRefineSampler')).toHaveLength(0);
        expect(api['105:10'].inputs.samples).toEqual(['105:14', 0]);
    });
});
