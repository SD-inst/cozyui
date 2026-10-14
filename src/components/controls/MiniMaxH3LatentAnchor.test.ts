import { describe, expect, it } from 'vitest';
import { controlType } from '../../redux/config';
import {
    anchorFitFrames,
    anchorLayoutFor,
    anchorLengthInfo,
    applyPass1LatentAnchors,
    collectLatentEntries,
    computeAnchorPlan,
} from './MiniMaxH3LatentAnchor';
import { applyLatentUpscale } from './MiniMaxH3LatentUpscaleHandler';
import { keyframeHandler } from './MiniMaxH3KeyframeHandler';
import type { TRefEntry } from './MiniMaxH3KeyframeHandler';

// length = 5s -> 120 raw frames -> snapped to 124 (17*7+5)
// slots = 5*7+2 = 37, audio slots = round(124*40/24) = 207
describe('computeAnchorPlan', () => {
    it('interior video region snaps to chunk boundaries', () => {
        const plan = computeAnchorPlan(5, [
            { kind: 'video', index: 0, position: 48, trim: 34 },
        ]);
        expect(plan).not.toBeNull();
        expect(plan!.frames).toBe(124);
        expect(plan!.slots).toBe(37);
        expect(plan!.audioSlots).toBe(207);
        const region = plan!.regions[0];
        expect(region.slotStart).toBe(15);
        expect(region.slotLen).toBe(10);
        // Shared clip fit is always 17m+5 (identical for guide and latent).
        expect(region.fitFrames).toBe(39);
        expect(region.guideFrameIndex).toBe(51);
        expect(region.padJunk).toBe(true);
        expect(region.audio).toEqual([85, 142]);
    });

    it('end-of-video video region runs flush to the last slot', () => {
        const plan = computeAnchorPlan(5, [
            { kind: 'video', index: 1, position: 115, trim: 22 },
        ]);
        const region = plan!.regions[0];
        expect(region.slotStart).toBe(30);
        expect(region.slotLen).toBe(7);
        expect(region.fitFrames).toBe(22);
        expect(region.guideFrameIndex).toBe(102);
        expect(region.flush).toBe(true);
        expect(region.padJunk).toBe(false);
        expect(region.frameStart).toBe(102);
        expect(region.frameCover).toBe(22);
        expect(region.audio).toEqual([170, 207]);
    });

    it('trim=0 falls back to one chunk taken from the clip end', () => {
        const plan = computeAnchorPlan(5, [
            { kind: 'video', index: 0, position: 24, trim: 0 },
        ]);
        const region = plan!.regions[0];
        expect(region.fitFrames).toBe(22);
        expect(region.slotStart).toBe(5);
        expect(region.slotLen).toBe(5);
        expect(region.padJunk).toBe(true);
    });

    it('single images anchor one slot and freeze no audio', () => {
        const plan = computeAnchorPlan(5, [
            { kind: 'image', index: 2, position: 36, trim: 0 },
            { kind: 'image', index: 3, position: 120, trim: 0 },
        ]);
        expect(plan!.regions[0].slotStart).toBe(10);
        expect(plan!.regions[0].slotLen).toBe(1);
        expect(plan!.regions[0].audio).toBeNull();
        // Image guides keep their exact frame position.
        expect(plan!.regions[0].guideFrameIndex).toBe(36);
        // End positions land on the very last slot.
        expect(plan!.regions[1].slotStart).toBe(36);
    });

    it('rejects videos shorter than two temporal chunks', () => {
        // length 0.2s -> raw 5 -> snapped 5 -> a single lead chunk
        expect(computeAnchorPlan(0.2, [{ kind: 'video', index: 0, position: 0, trim: 17 }])).toBeNull();
    });

    it('seamless-loop layout: head anchor + end anchor + free middle', () => {
        // length 7s -> snapped 175 frames (17*10+5) -> 52 slots, 292 audio slots
        const plan = computeAnchorPlan(7, [
            { kind: 'video', index: 0, position: 0, trim: 48 },
            { kind: 'video', index: 1, position: 120, trim: 48 },
        ]);
        expect(plan!.frames).toBe(175);
        expect(plan!.slots).toBe(52);
        expect(plan!.audioSlots).toBe(292);
        const [head, tail] = plan!.regions;
        // 48 frames snap up to 3 chunks; the fitted clip is 17m+5 = 56 frames.
        expect(head.slotStart).toBe(0);
        expect(head.slotLen).toBe(15);
        expect(head.fitFrames).toBe(56);
        expect(head.guideFrameIndex).toBe(0);
        expect(head.flush).toBe(false);
        // The end anchor runs flush to the last slot.
        expect(tail.slotStart).toBe(35);
        expect(tail.slotLen).toBe(17);
        expect(tail.fitFrames).toBe(56);
        expect(tail.guideFrameIndex).toBe(119);
        expect(tail.flush).toBe(true);
        expect(tail.audio).toEqual([198, 292]);
        expect(head.audio).toEqual([0, 85]);
    });
});

describe('collectLatentEntries', () => {
    it('keeps only non-skipped latent entries with their form index', () => {
        const images: TRefEntry[] = [
            { image: 'a.png', latent: false },
            { image: 'b.png', latent: true },
            { image: 'c.png', latent: true, skip: true },
        ];
        const videos: TRefEntry[] = [
            { video: 'd.mp4', latent: true, trim: 51, keyframe_position: 3 },
            { video: 'e.mp4', latent: true, trim: 51, keyframe_frame: 100 },
        ];
        const entries = collectLatentEntries(images, videos);
        expect(entries).toEqual([
            { kind: 'image', index: 1, position: 0, trim: 0 },
            // legacy seconds fall back to frames
            { kind: 'video', index: 0, position: 72, trim: 51 },
            { kind: 'video', index: 1, position: 100, trim: 51 },
        ]);
    });
});

const control: controlType = {
    id: 'handle',
    field: '',
    node_id: '105:104',
    guider_node_id: '105:16',
    vae_node_id: '105:11',
    audio_vae_node_id: '105:24',
    sampler_node_id: '105:14',
    resolution_node_id: '115',
};

const makeApi = (): Record<string, any> => ({
    '105:14': {
        inputs: {
            guider: ['105:16', 0],
            latent_image: ['105:104', 1],
        },
        class_type: 'SamplerCustomAdvanced',
    },
    '105:16': {
        inputs: { model: ['137', 0], conditioning: ['105:104', 0] },
        class_type: 'BasicGuider',
    },
    '105:104': {
        inputs: {
            prompt: 'test prompt',
            clip: ['105:13', 0],
            vae: ['105:11', 0],
            audio_vae: ['105:24', 0],
            length: ['105:107', 1],
            width: ['115', 0],
            height: ['115', 1],
            'ref_videos.ref_video_0': ['300', 0],
            'ref_video_audios.ref_video_audio_0': ['300', 1],
        },
        class_type: 'MiniMaxH3ReferenceToVideo',
    },
    '115': { inputs: { multiple: 32 }, class_type: 'ResolutionSelector' },
    '105:10': {
        inputs: { samples: ['105:14', 0] },
        class_type: 'VAEDecode',
    },
    '105:23': {
        inputs: { samples: ['105:14', 0] },
        class_type: 'VAEDecodeAudio',
    },
});

const findNodes = (api: Record<string, any>, classType: string) =>
    Object.values(api).filter((n) => n.class_type === classType);

describe('applyPass1LatentAnchors', () => {
    it('splices the clip into the sampler latent with both stream masks', () => {
        const api = makeApi();
        const entries = collectLatentEntries(
            [],
            [
                {
                    video: 'd.mp4',
                    latent: true,
                    trim: 22,
                    keyframe_frame: 115,
                },
            ],
        );
        const plan = computeAnchorPlan(5, entries)!;
        applyPass1LatentAnchors(api, control, plan, entries);

        const separate = findNodes(api, 'LTXVSeparateAVLatent');
        expect(separate.length).toBe(1);
        const concat = findNodes(api, 'LTXVConcatAVLatent');
        expect(concat.length).toBe(1);

        const replace = findNodes(api, 'ReplaceVideoLatentFrames');
        expect(replace.length).toBe(1);
        expect(replace[0].inputs.index).toBe(30);

        // Flush region: no junk pad, no video LatentCut (only audio fit + head).
        expect(findNodes(api, 'LatentCut').length).toBe(2);
        expect(findNodes(api, 'ImageBatch').length).toBe(1); // mask segments

        const grab = findNodes(api, 'ImageFromBatch');
        expect(
            grab.some((n) => n.inputs.batch_index === -22 && n.inputs.length === 22),
        ).toBe(true);
        const expand = findNodes(api, 'ImageExpandBatch+');
        expect(expand.length).toBe(1);
        expect(expand[0].inputs.size).toBe(22);
        expect(expand[0].inputs.method).toBe('repeat first');

        const masked = findNodes(api, 'SetLatentNoiseMask');
        expect(masked.length).toBe(2);

        // Flush window [170, 207) == stream end: no audio tail concat.
        expect(findNodes(api, 'VAEEncodeAudio').length).toBe(1);
        const audioTrim = findNodes(api, 'TrimAudioDuration');
        expect(audioTrim.length).toBe(2);
        expect(audioTrim[0].inputs.start_index).toBeCloseTo(-22 / 24);
        expect(audioTrim[0].inputs.duration).toBeCloseTo(22 / 24);
        // Window forced to exact duration (silence pad + trim).
        const silence = findNodes(api, 'EmptyAudio');
        expect(silence[0].inputs.duration).toBeCloseTo(37 / 40);
        expect(findNodes(api, 'AudioConcat').length).toBe(1);
        expect(findNodes(api, 'LatentConcat').length).toBe(1);
        const rects = findNodes(api, 'SolidMask').filter((n) => n.inputs.width === 37);
        expect(rects.length).toBe(1);
        expect(findNodes(api, 'MaskComposite')[0].inputs.x).toBe(170);

        const scale = findNodes(api, 'ImageScale');
        expect(scale[0].inputs.width).toEqual(['115', 0]);
        expect(scale[0].inputs.height).toEqual(['115', 1]);

        expect(api['105:14'].inputs.latent_image).toEqual([
            expect.stringContaining(':concat'),
            0,
        ]);
    });

    it('builds per-slot mask segments around the region', () => {
        const api = makeApi();
        const entries = collectLatentEntries(
            [],
            [
                {
                    video: 'd.mp4',
                    latent: true,
                    trim: 34,
                    keyframe_frame: 48,
                },
            ],
        );
        const plan = computeAnchorPlan(5, entries)!;
        applyPass1LatentAnchors(api, control, plan, entries);

        // Interior region [15..25): white 15, black 10, white 12.
        const batches = findNodes(api, 'EmptyImage').map((n) => n.inputs.batch_size);
        expect(batches).toEqual([15, 10, 12]);

        const cut = findNodes(api, 'LatentCut').filter((n) => n.inputs.dim === 't');
        expect(cut.length).toBe(1);
        expect(cut[0].inputs.amount).toBe(10);

        // Interior clip: shared fit is 17m+5 = 39 frames (head grab, tail
        // repeat pad); the latent splice uses the first 34 + 5 junk frames.
        const grab = findNodes(api, 'ImageFromBatch').filter(
            (n) => n.inputs.length === 39,
        );
        expect(grab.length).toBe(1);
        expect(grab[0].inputs.batch_index).toBe(0);
        const expand = findNodes(api, 'ImageExpandBatch+');
        expect(expand.length).toBe(1);
        expect(expand[0].inputs.size).toBe(39);
        expect(expand[0].inputs.method).toBe('repeat last');
        const head = findNodes(api, 'ImageFromBatch').filter(
            (n) => n.inputs.length === 34,
        );
        expect(head.length).toBe(1);
        const pad = findNodes(api, 'ImageFromBatch').filter(
            (n) => n.inputs.length === 5,
        );
        expect(pad.length).toBe(1);

        const composite = findNodes(api, 'MaskComposite');
        expect(composite.length).toBe(1);
        expect(composite[0].inputs.x).toBe(85);
        const solids = findNodes(api, 'SolidMask');
        expect(solids.some((n) => n.inputs.width === 207)).toBe(true);
        expect(
            solids.some((n) => n.inputs.width === 142 - 85 && n.inputs.height === 2),
        ).toBe(true);

        // Interior window [85, 142): audio is spliced and the original tail
        // re-joined; the encoded clip latent is trimmed to the window.
        expect(findNodes(api, 'VAEEncodeAudio').length).toBe(1);
        expect(findNodes(api, 'LatentConcat').length).toBe(2);
        expect(findNodes(api, 'LatentCut').length).toBe(4);
    });
});

describe('applyLatentUpscale — anchor re-application', () => {
    it('re-encodes the anchor at the upscaled size and rewires the concat', () => {
        const api = makeApi();
        const refVideos: TRefEntry[] = [
            { video: 'd.mp4', latent: true, trim: 22, keyframe_frame: 115 },
        ];

        applyLatentUpscale(
            api,
            { enabled: true, megapixels: 1, steps: 3, sampler: 'er_sde', seed: 1 },
            { ...control, video_vae_decode_node_id: '105:10', audio_vae_decode_node_id: '105:23' },
            {
                refVideos,
                aspectRatio: '16:9 (Widescreen)',
                baseMP: 0.4,
                targetMP: 1,
                length: 5,
            },
        );

        // The upscale graph's separate/upscale/concat plus one anchor chain.
        const replace = findNodes(api, 'ReplaceVideoLatentFrames');
        expect(replace.length).toBe(1);
        expect(replace[0].inputs.index).toBe(30);

        const separate = findNodes(api, 'LTXVSeparateAVLatent');
        expect(separate.length).toBe(1);
        const concat = findNodes(api, 'LTXVConcatAVLatent');
        expect(concat.length).toBe(1);

        // The upscaled chain encodes at a static (upscaled) pixel size.
        const scale = findNodes(api, 'ImageScale');
        expect(typeof scale[0].inputs.width).toBe('number');
        expect(scale[0].inputs.width).toBeGreaterThan(768);

        expect(concat[0].inputs.video_latent[0]).toContain(':vmask');
        expect(concat[0].inputs.audio_latent[0]).toContain(':amask');
        expect(findNodes(api, 'SetLatentNoiseMask').length).toBe(2);
    });
});

describe('UI hint helpers', () => {
    it('anchorFitFrames quantizes trim to 17m+5', () => {
        expect(anchorFitFrames(0)).toBe(22);
        expect(anchorFitFrames(17)).toBe(22);
        expect(anchorFitFrames(30)).toBe(39);
        expect(anchorFitFrames(48)).toBe(56);
        // clamped by the video's chunk count
        expect(anchorFitFrames(48, 3)).toBe(56);
        expect(anchorFitFrames(120, 3)).toBe(56);
    });

    it('anchorLengthInfo mirrors the graph length math', () => {
        expect(anchorLengthInfo(5)).toEqual({
            frames: 124,
            slots: 37,
            audioSlots: 207,
        });
        expect(anchorLengthInfo(7)).toEqual({
            frames: 175,
            slots: 52,
            audioSlots: 292,
        });
        // raw 144 frames (144 % 17 = 8) snap up to 158 — Python-style modulo
        expect(anchorLengthInfo(6).frames).toBe(158);
        expect(anchorLengthInfo(0)).toEqual({
            frames: 5,
            slots: 2,
            audioSlots: 8,
        });
    });

    it('anchorLayoutFor mirrors the plan of a single entry', () => {
        const layout = anchorLayoutFor(7, 0, 48);
        expect(layout).not.toBeNull();
        expect(layout!.guideFrameIndex).toBe(0);
        expect(layout!.fitFrames).toBe(56);
        const tail = anchorLayoutFor(7, 120, 48);
        expect(tail!.flush).toBe(true);
        expect(tail!.guideFrameIndex).toBe(119);
        expect(tail!.fitFrames).toBe(56);
        // too short for anchors
        expect(anchorLayoutFor(0.2, 0, 17)).toBeNull();
    });
});

describe('keyframeHandler — shared fit chain and grid-snapped guides', () => {    it('video guide gets the 17m+5 fitted clip at the chunk-aligned frame', () => {
        const api = makeApi();
        const images: TRefEntry[] = [
            { image: 'a.png', keyframe: true, keyframe_frame: 40 },
        ];
        const videos: TRefEntry[] = [
            { video: 'd.mp4', keyframe: true, trim: 34, keyframe_frame: 48 },
        ];
        api['105:104'].inputs['ref_images.ref_image_0'] = ['299', 0];

        keyframeHandler(api, images, videos, control, { length: 5 });

        const guides = findNodes(api, 'MiniMaxH3AddGuide');
        expect(guides.length).toBe(2);
        // Video guide: snapped to frame 51, fed by the shared fit chain.
        const videoGuide = guides.find((n) =>
            String(n.inputs.image).includes('expand') ||
            (Array.isArray(n.inputs.image) &&
                String(n.inputs.image[0]).includes('expand')),
        );
        expect(videoGuide).toBeTruthy();
        expect(videoGuide.inputs.frame_idx).toBe(51);
        expect(findNodes(api, 'ImageExpandBatch+').length).toBe(1);
        // Image guide keeps its exact position and raw source.
        const imageGuide = guides.find(
            (n) => !Array.isArray(n.inputs.image) ||
                !String(n.inputs.image[0]).includes('expand'),
        );
        expect(imageGuide.inputs.frame_idx).toBe(40);
        expect(imageGuide.inputs.image).toEqual(['299', 0]);
        // No latent anchor requested: sampler latent untouched.
        expect(api['105:14'].inputs.latent_image).toEqual(['105:104', 1]);
    });
});
