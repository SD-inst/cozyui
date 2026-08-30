import { describe, expect, it } from 'vitest';
import { getFreeNodeId } from '../../api/utils';
import { controlType } from '../../redux/config';
import {
    applyLatentUpscale,
    buildSecondGuider,
} from './MiniMaxH3LatentUpscaleHandler';

const value = {
    enabled: true,
    megapixels: 1,
    steps: 4,
    sampler: 'lcm',
    seed: 1024,
};

const control: controlType = {
    id: 'handle',
    field: '',
    sampler_node_id: '105:14',
    video_vae_decode_node_id: '105:10',
    audio_vae_decode_node_id: '105:23',
    guider_node_id: '105:16',
    node_id: '105:104',
};

const findNodes = (api: Record<string, any>, classType: string) =>
    Object.values(api).filter((n) => n.class_type === classType);

describe('applyLatentUpscale — R2V', () => {
    const makeApi = (): Record<string, any> => ({
        '105:14': {
            inputs: { sigmas: ['105:9', 0], guider: ['105:16', 0] },
            class_type: 'SamplerCustomAdvanced',
        },
        '105:9': { inputs: {}, class_type: 'BasicScheduler' },
        '105:16': {
            inputs: { model: ['137', 0], conditioning: ['105:104', 0] },
            class_type: 'BasicGuider',
        },
        '105:10': {
            inputs: { samples: ['105:14', 0] },
            class_type: 'VAEDecode',
        },
        '105:23': {
            inputs: { samples: ['105:14', 0] },
            class_type: 'VAEDecodeAudio',
        },
        '105:104': {
            inputs: {
                prompt: 'test prompt',
                clip: ['105:13', 0],
                vae: ['105:11', 0],
                audio_vae: ['105:24', 0],
                length: ['105:107', 1],
                'ref_images.ref_image_0': ['200', 0],
                'ref_images.ref_image_2': ['201', 0],
                'ref_videos.ref_video_0': ['300', 0],
            },
            class_type: 'MiniMaxH3ReferenceToVideo',
        },
    });

    const refValues = {
        refImages: [
            { image: 'a.png', keyframe: true, keyframe_position: 0 },
            { image: 'b.png', keyframe: false },
            { image: 'c.png', keyframe: true, keyframe_position: 2 },
        ],
        refVideos: [
            { video: 'a.mp4', keyframe: true, keyframe_position: 0 },
        ],
    };

    it('gives the second sampler its own BasicGuider with a ref node that excludes keyframes', () => {
        const api = makeApi();
        const baseNodeID = getFreeNodeId(api) + '';
        applyLatentUpscale(api, value, control, refValues);

        const secondSampler = api[baseNodeID + ':sampler'];
        const guiderID = secondSampler.inputs.guider[0];

        // second sampler's guider is a new BasicGuider (not the base 105:16)
        expect(secondSampler.inputs.guider).not.toEqual(['105:16', 0]);
        expect(api[guiderID].class_type).toBe('BasicGuider');
        expect(api[guiderID].inputs.model).toEqual(['137', 0]);

        // the guider's conditioning is a NEW reference node (not the base 105:104)
        const condID = api[guiderID].inputs.conditioning[0];
        const newRef = api[condID];
        expect(newRef.class_type).toBe('MiniMaxH3ReferenceToVideo');
        expect(condID).not.toBe('105:104');

        // the new ref node carries the keyframe ref_videos (as VLM reference
        // material, not overlaid via AddGuide)
        expect(newRef.inputs['ref_videos.ref_video_0']).toEqual(['300', 0]);
        // it also carries the regular ref_images (for character consistency)
        expect(newRef.inputs['ref_images.ref_image_0']).toEqual(['200', 0]);
        expect(newRef.inputs['ref_images.ref_image_2']).toEqual(['201', 0]);
        // it carries the same prompt / clip / vae / audio_vae / length
        expect(newRef.inputs.prompt).toBe('test prompt');
        expect(newRef.inputs.clip).toEqual(['105:13', 0]);
        expect(newRef.inputs.vae).toEqual(['105:11', 0]);
        expect(newRef.inputs.audio_vae).toEqual(['105:24', 0]);
        expect(newRef.inputs.length).toEqual(['105:107', 1]);

        // there are NO AddGuide nodes in the second sampler's graph
        expect(findNodes(api, 'MiniMaxH3AddGuide')).toHaveLength(0);
        // there are NO resize nodes for the keyframes
        expect(findNodes(api, 'ImageResizeKJv2')).toHaveLength(0);

        // main sampler keeps the original base-res guider
        expect(api['105:14'].inputs.guider).toEqual(['105:16', 0]);
    });

    it('leaves the base reference node\'s ref_videos untouched (keyframes stay in the base pass)', () => {
        const api = makeApi();
        applyLatentUpscale(api, value, control, refValues);
        // the base reference node's ref_video input is unchanged
        expect(api['105:104'].inputs['ref_videos.ref_video_0']).toEqual(['300', 0]);
    });

    it('leaves the second sampler on the base guider when there are no keyframes', () => {
        const api = makeApi();
        const baseNodeID = getFreeNodeId(api) + '';
        applyLatentUpscale(api, value, control, {
            refImages: [{ image: 'a.png', keyframe: false }],
            refVideos: [{ video: 'a.mp4', keyframe: false }],
        });
        expect(api[baseNodeID + ':sampler'].inputs.guider).toEqual([
            '105:16',
            0,
        ]);
        expect(findNodes(api, 'MiniMaxH3AddGuide')).toHaveLength(0);
    });
});

describe('applyLatentUpscale — I2V', () => {
    const makeApi = (): Record<string, any> => ({
        '105:14': {
            inputs: { sigmas: ['105:9', 0], guider: ['105:16', 0] },
            class_type: 'SamplerCustomAdvanced',
        },
        '105:9': { inputs: {}, class_type: 'BasicScheduler' },
        '105:16': {
            inputs: { model: ['137', 0], conditioning: ['105:104', 0] },
            class_type: 'BasicGuider',
        },
        '105:10': {
            inputs: { samples: ['105:14', 0] },
            class_type: 'VAEDecode',
        },
        '105:23': {
            inputs: { samples: ['105:14', 0] },
            class_type: 'VAEDecodeAudio',
        },
        '105:104': {
            inputs: {
                prompt: 'test prompt',
                clip: ['105:13', 0],
                vae: ['105:11', 0],
                length: ['105:107', 1],
                first_frame: ['138', 0],
                last_frame: ['139', 0],
            },
            class_type: 'MiniMaxH3ImageToVideo',
        },
    });

    it('duplicates the reference node at the upscaled size for the second sampler', () => {
        const api = makeApi();
        const baseNodeID = getFreeNodeId(api) + '';
        applyLatentUpscale(api, value, control, {
            firstFrame: 'first.png',
            lastFrame: 'last.png',
        });

        const secondSampler = api[baseNodeID + ':sampler'];
        const guiderID = secondSampler.inputs.guider[0];
        expect(api[guiderID].class_type).toBe('BasicGuider');
        expect(api[guiderID].inputs.model).toEqual(['137', 0]);

        // the guider's conditioning is a duplicated MiniMaxH3ImageToVideo
        const condID = api[guiderID].inputs.conditioning[0];
        const dup = api[condID];
        expect(dup.class_type).toBe('MiniMaxH3ImageToVideo');
        // it carries the same prompt / clip / vae / length and first/last frames
        expect(dup.inputs.prompt).toBe('test prompt');
        expect(dup.inputs.clip).toEqual(['105:13', 0]);
        expect(dup.inputs.vae).toEqual(['105:11', 0]);
        expect(dup.inputs.length).toEqual(['105:107', 1]);
        expect(dup.inputs.first_frame).toEqual(['138', 0]);
        expect(dup.inputs.last_frame).toEqual(['139', 0]);

        // width/height come from the upscaled latent size × 16
        const widthNode = api[dup.inputs.width[0]];
        const heightNode = api[dup.inputs.height[0]];
        expect(widthNode.class_type).toBe('ComfyMathExpression');
        expect(heightNode.class_type).toBe('ComfyMathExpression');
        expect(widthNode.inputs.expression).toBe('a * 16');
        expect(heightNode.inputs.expression).toBe('a * 16');

        // the size node reads the upscaled video latent
        const sizeNode = api[widthNode.inputs['values.a'][0]];
        expect(sizeNode.class_type).toBe('GetLatentSizeAndCount');
        expect(sizeNode.inputs.latent).toEqual([baseNodeID + ':upscale', 0]);
        expect(widthNode.inputs['values.a'][1]).toBe(5);
        expect(heightNode.inputs['values.a'][1]).toBe(4);

        // main sampler keeps the original base-res guider
        expect(api['105:14'].inputs.guider).toEqual(['105:16', 0]);
    });

    it('leaves the second sampler on the base guider when there are no frames', () => {
        const api = makeApi();
        const baseNodeID = getFreeNodeId(api) + '';
        // no first/last frame wired on the reference node
        delete api['105:104'].inputs.first_frame;
        delete api['105:104'].inputs.last_frame;
        applyLatentUpscale(api, value, control, {});
        expect(api[baseNodeID + ':sampler'].inputs.guider).toEqual([
            '105:16',
            0,
        ]);
    });
});

describe('applyLatentUpscale — PDD', () => {
    const makeApi = (): Record<string, any> => ({
        '105:14': {
            inputs: { sigmas: ['999', 1], guider: ['105:16', 0] },
            class_type: 'SamplerCustomAdvanced',
        },
        '999': { inputs: {}, class_type: 'MiniMaxH3PDDAccApply' },
        '105:16': {
            inputs: { model: ['999', 0], conditioning: ['105:104', 0] },
            class_type: 'BasicGuider',
        },
        '105:10': {
            inputs: { samples: ['105:14', 0] },
            class_type: 'VAEDecode',
        },
        '105:23': {
            inputs: { samples: ['105:14', 0] },
            class_type: 'VAEDecodeAudio',
        },
        '105:104': {
            inputs: {
                prompt: 'test prompt',
                clip: ['105:13', 0],
                vae: ['105:11', 0],
                audio_vae: ['105:24', 0],
                length: ['105:107', 1],
                'ref_images.ref_image_0': ['200', 0],
            },
            class_type: 'MiniMaxH3ReferenceToVideo',
        },
    });

    const pddValues = {
        refImages: [{ image: 'a.png', keyframe: false }],
        pddModelRef: ['999', 0] as [string, number],
    };

    it('does not insert a SplitSigmas and keeps the full PDD sigmas on the main sampler', () => {
        const api = makeApi();
        const baseNodeID = getFreeNodeId(api) + '';
        applyLatentUpscale(api, value, control, pddValues);

        // no SplitSigmas node — the PDD schedule is not split
        expect(findNodes(api, 'SplitSigmas')).toHaveLength(0);
        // the main sampler keeps the PDD sigmas (not rewired to a split node)
        expect(api['105:14'].inputs.sigmas).toEqual(['999', 1]);
        // the second (upscale) sampler is still inserted
        expect(api[baseNodeID + ':sampler'].class_type).toBe(
            'SamplerCustomAdvanced',
        );
        // the main pass still feeds the upscale chain (separate → upscale)
        const separate = findNodes(api, 'LTXVSeparateAVLatent')[0];
        expect(separate.inputs.av_latent).toEqual(['105:14', 1]);
    });
});

describe('buildSecondGuider — no reference node', () => {
    it('returns null when the tab has no keyframe reference node', () => {
        const api: Record<string, any> = {
            '105:14': { inputs: {}, class_type: 'SamplerCustomAdvanced' },
        };
        const noNodeId: controlType = { ...control, node_id: undefined };
        expect(buildSecondGuider(api, '999', noNodeId, {})).toBeNull();
    });
});
