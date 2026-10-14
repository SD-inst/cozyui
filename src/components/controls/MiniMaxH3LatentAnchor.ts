import { NodeRef, Workflow } from '../../api/graph';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import type { TRefEntry } from './MiniMaxH3KeyframeHandler';

/**
 * H3 latent anchoring: write an image/clip VAE-encoded straight into the AV
 * latent and freeze those slots from denoising with a nested `noise_mask`
 * (video + audio streams masked separately). Unlike MiniMaxH3AddGuide (a
 * conditioning token re-injected every step), the anchor is a plain latent
 * region: the sampler blends it back at every step, so the model never has to
 * "understand" an end-clip it was not trained on.
 *
 * Temporal alignment (the whole point of the slot math below):
 * - the H3 video VAE chunks time at 17 pixel frames (token_drop 3 only at the
 *   very end), so a full-video latent of F = 17M+5 frames has T = 5M+2 slots
 *   and chunk i covers pixel frames [17i, 17i+17) <-> latent slots [5i, 5i+5);
 * - a clip encoded standalone gets the chunk structure of a standalone video:
 *   17m frames -> 5m-3 slots, 17m+5 frames -> 5m+2 slots. Only the 17m+5
 *   shape matches a region that ends flush with the video end (the trailing
 *   5-frame chunk == the video's trailing chunk), and the 17m trim + a 5-frame
 *   junk pad (its slots are cut off after encoding) matches a chunk-aligned
 *   interior region. Anchors therefore always start on a 17-frame boundary.
 * - the audio stream ([B,32,2,T_a]) is spliced along its last axis with core
 *   `LatentCut/LatentConcat(dim='x')` (for 4D latents 'x' == time) using the
 *   clip's own soundtrack (`TrimAudioDuration` + `VAEEncodeAudio`, which
 *   resamples to the audio VAE's 32 kHz and quantizes to ceil(40·s) slots).
 *   Masking plain zero audio slots instead is wrong: the audio latent space
 *   is mean/std-normalized, so a zero latent decodes to a faint hum, not to
 *   silence. Regions without a connected `ref_video_audios` are left fully
 *   denoised rather than frozen.
 */

const FPS = 24;
const AUDIO_LATENT_FPS = 40;
const AUDIO_VAE_SAMPLE_RATE = 32000;
const CHUNK = 17;
const CHUNK_SLOTS = 5;
const AUDIO_VAE_RATIO = 5 / 3;

/** Spatial size of the per-slot video mask images. The mask is constant per
 *  slot, so SetLatentNoiseMask's bilinear resize onto the latent grid is
 *  exact at any latent resolution (both passes: base and upscaled). */
const SLOT_MASK_SIZE = 8;

export type TAnchorEntry = {
    kind: 'image' | 'video';
    /** Index inside the ref_images / ref_videos form array. */
    index: number;
    /** Anchor position in frames (the `keyframe_frame` field). */
    position: number;
    /** Trimmed source length in frames (the `trim` field, 0 = full clip). */
    trim: number;
};

export type TAnchorRegion = {
    kind: 'image' | 'video';
    index: number;
    /** First latent slot to replace. */
    slotStart: number;
    /** Number of latent slots replaced. */
    slotLen: number;
    /** Anchor clip length in frames, always 17m+5 for videos (shared by the
     *  AddGuide and the latent splice, padded to exactly this many frames). */
    fitFrames: number;
    /** Frame index handed to MiniMaxH3AddGuide: snapped to a 17-frame chunk
     *  boundary (end-aligned for flush regions) — matching the trained grid;
     *  core AddGuide accepts any index, which is what produced the flashes
     *  and the clip duplication when the two mechanisms disagreed. */
    guideFrameIndex: number;
    /** The region runs flush to the last latent slot (end anchor). */
    flush: boolean;
    /** Interior video regions encode the first 17m fit frames plus a 5-frame
     *  junk pad and cut the pad slots off after encoding. */
    padJunk: boolean;
    /** First pixel frame covered (audio window computation). */
    frameStart: number;
    /** Pixel frames covered. */
    frameCover: number;
    /** Audio latent slots to freeze ([a0, a1)), null for single images. */
    audio: [number, number] | null;
};

export type TAnchorPlan = {
    /** Total video frames (snapped to the 17k+5 grid, mirrors the graph). */
    frames: number;
    /** Total video latent slots. */
    slots: number;
    /** Total audio latent slots. */
    audioSlots: number;
    regions: TAnchorRegion[];
};

const snappedFrameCount = (seconds: number): number => {
    const raw = Math.max(5, Math.round(seconds * FPS));
    // Mirror the graph's ComfyMathExpression (Python semantics: `%` of a
    // negative number is non-negative — JS `%` is not).
    const mod = (((5 - (raw % CHUNK)) % CHUNK) + CHUNK) % CHUNK;
    return raw + mod;
};

/** The fitted anchor-clip length for a given trim (17m+5 frames). */
export const anchorFitFrames = (trim: number, maxChunks = Infinity): number => {
    const trimFrames = trim > 0 ? trim : CHUNK;
    const chunks = Math.min(maxChunks, Math.max(1, Math.round(trimFrames / CHUNK)));
    return CHUNK * chunks + 5;
};

/**
 * The real video length for a `length` (seconds) slider value: snapped to the
 * 17k+5 frame grid exactly like the graph's ComfyMathExpression, with the
 * resulting latent slot count (17 frames = 5 slots, the trailing 5 frames = 2).
 */
export const anchorLengthInfo = (seconds: number): {
    frames: number;
    slots: number;
    audioSlots: number;
} => {
    const frames = snappedFrameCount(seconds);
    const slots = CHUNK_SLOTS * ((frames - 5) / CHUNK) + 2;
    const audioSlots = Math.round((frames * AUDIO_LATENT_FPS) / FPS);
    return { frames, slots, audioSlots };
};

/**
 * The effective anchor layout for UI hints: what the model will actually see
 * for a video anchor at `position` (frames) with `trim` (frames) on a video
 * of `lengthSeconds`. Returns the region plan or null when the video is too
 * short to host anchors.
 */
export const anchorLayoutFor = (
    lengthSeconds: number,
    position: number,
    trim: number,
): TAnchorRegion | null => {
    const plan = computeAnchorPlan(lengthSeconds, [
        { kind: 'video', index: 0, position, trim },
    ]);
    return plan?.regions[0] ?? null;
};

export const computeAnchorPlan = (
    lengthSeconds: number,
    entries: TAnchorEntry[],
): TAnchorPlan | null => {
    const frames = snappedFrameCount(lengthSeconds);
    if (!entries.length || frames < 5 + CHUNK) {
        // A single chunk video has no interior slots to anchor into.
        return null;
    }
    const m = (frames - 5) / CHUNK;
    const slots = CHUNK_SLOTS * m + 2;
    const audioSlots = Math.round((frames * AUDIO_LATENT_FPS) / FPS);

    const regions: TAnchorRegion[] = [];
    entries.forEach((entry) => {
        const positionFrames = entry.position;
        if (entry.kind === 'image') {
            const slotStart =
                positionFrames >= frames - 5
                    ? slots - 1
                    : Math.min(
                        CHUNK_SLOTS * Math.round(positionFrames / CHUNK),
                        slots - 1,
                    );
            regions.push({
                kind: 'image',
                index: entry.index,
                slotStart,
                slotLen: 1,
                fitFrames: 1,
                guideFrameIndex: positionFrames,
                flush: false,
                padJunk: false,
                frameStart: 0,
                frameCover: 1,
                audio: null,
            });
            return;
        }

        const trimFrames = entry.trim > 0 ? entry.trim : CHUNK;
        const chunkCount = Math.min(
            m,
            Math.max(1, Math.round(trimFrames / CHUNK)),
        );
        const chunkIndex = Math.round(positionFrames / CHUNK);
        const fitFrames = anchorFitFrames(entry.trim, m);
        const k = Math.min(chunkIndex, m - chunkCount);
        const flush = positionFrames + CHUNK * chunkCount + 5 > frames;

        let region: TAnchorRegion;
        if (flush) {
            // The clip's own trailing 5-frame chunk == the video's trailing
            // chunk, so the region runs flush to the last slot.
            region = {
                kind: 'video',
                index: entry.index,
                slotStart: CHUNK_SLOTS * (m - chunkCount),
                slotLen: CHUNK_SLOTS * chunkCount + 2,
                fitFrames,
                guideFrameIndex: CHUNK * (m - chunkCount),
                flush: true,
                padJunk: false,
                frameStart: CHUNK * (m - chunkCount),
                frameCover: CHUNK * chunkCount + 5,
                audio: null,
            };
        } else {
            region = {
                kind: 'video',
                index: entry.index,
                slotStart: CHUNK_SLOTS * k,
                slotLen: CHUNK_SLOTS * chunkCount,
                fitFrames,
                guideFrameIndex: CHUNK * k,
                flush: false,
                padJunk: true,
                frameStart: CHUNK * k,
                frameCover: CHUNK * chunkCount,
                audio: null,
            };
        }
        const a0 = Math.round(region.frameStart * AUDIO_VAE_RATIO);
        // The audio VAE quantizes to ceil(L·40/s) slots (800-sample hop at
        // 32 kHz); the window matches the frozen video span and is filled
        // with the clip's encoded audio (zero latents are not silence — they
        // decode to a hum).
        const a1 = Math.min(
            audioSlots,
            a0 + Math.ceil(region.frameCover * AUDIO_VAE_RATIO),
        );
        region.audio = a1 > a0 ? [a0, a1] : null;
        regions.push(region);
    });

    return { frames, slots, audioSlots, regions };
};

/** Reads the anchor position in frames (`keyframe_frame`), falling back to
 *  the legacy seconds field. */
export const anchorFrameOf = (v: TRefEntry): number =>
    v.keyframe_frame !== undefined
        ? v.keyframe_frame
        : Math.round((v.keyframe_position || 0) * 24);

/** Collects the entries with the `latent` flag from the form arrays, keeping
 *  the form-array index (needed to resolve the reference node's inputs when
 *  the second pass rebuilds the chain). */
export const collectLatentEntries = (
    images: TRefEntry[] | undefined,
    videos: TRefEntry[] | undefined,
): TAnchorEntry[] => {
    const entries: TAnchorEntry[] = [];
    (images || []).forEach((v, idx) => {
        if (v.latent && v.image && !v.skip) {
            entries.push({
                kind: 'image',
                index: idx,
                position: anchorFrameOf(v),
                trim: 0,
            });
        }
    });
    (videos || []).forEach((v, idx) => {
        if (v.latent && v.video && !v.skip) {
            entries.push({
                kind: 'video',
                index: idx,
                position: anchorFrameOf(v),
                trim: v.trim || 0,
            });
        }
    });
    return entries;
};

/** Source image frames for an entry as connected on the reference node
 *  (after every transformation the Reference* handlers applied). */
export const anchorSourceRef = (
    api: Workflow,
    refNodeID: string,
    entry: TAnchorEntry,
): NodeRef | undefined => {
    const key =
        entry.kind === 'image'
            ? 'ref_images.ref_image_' + entry.index
            : 'ref_videos.ref_video_' + entry.index;
    const input = api[refNodeID].inputs[key];
    return Array.isArray(input) ? (input as NodeRef) : undefined;
};

/** The clip's soundtrack as connected on the reference node (`ref_video_audios`,
 *  absent when the entry has `no_audio`). */
export const anchorAudioRef = (
    api: Workflow,
    refNodeID: string,
    entryIndex: number,
): NodeRef | undefined => {
    const input = api[refNodeID].inputs['ref_video_audios.ref_video_audio_' + entryIndex];
    return Array.isArray(input) ? (input as NodeRef) : undefined;
};

/**
 * Splices each region's clip audio into the audio stream at its planned
 * window. For the 4D audio latent the core splice nodes' `x` dimension is the
 * time axis. The grab side matches the video grab (tail for flush regions,
 * head otherwise) so audio and video anchors carry the same source segment;
 * the encoded latent is trimmed to the exact window so the stream length
 * never changes.
 */
export const buildAudioSpliceChain = (
    api: Workflow,
    options: {
        audioDest: NodeRef;
        regions: TAnchorRegion[];
        audioSources: Map<TAnchorRegion, NodeRef>;
        audioVAERef: NodeRef;
        /** Total audio latent slots of the stream. */
        audioSlots: number;
    },
): NodeRef => {
    const { audioDest, regions, audioSources, audioVAERef } = options;

    const spliced = [...regions]
        .filter((region) => region.audio && audioSources.has(region))
        .sort((a, b) => (a.audio as Array<number>)[0] - (b.audio as Array<number>)[0]);

    // One insertion per region: cut [cursor, a0) of the rebuilt prefix, then
    // concat the encoded clip audio (trimmed to exactly a1-a0 slots).
    let current: NodeRef = audioDest;
    let cursor = 0;
    spliced.forEach((region, i) => {
        const [a0, a1] = region.audio as [number, number];
        const source = audioSources.get(region) as NodeRef;
        const graph: Workflow = {};
        if (a0 > cursor) {
            graph[':head_' + i] = {
                inputs: {
                    samples: current,
                    dim: 'x',
                    index: cursor,
                    amount: a0 - cursor,
                },
                class_type: 'LatentCut',
                _meta: { title: 'Keep Audio ' + cursor + '-' + a0 },
            };
            current = [':head_' + i, 0];
        }
        graph[':trim_' + i] = {
            inputs: {
                audio: source,
                start_index: region.flush ? -region.fitFrames / FPS : 0,
                duration: region.fitFrames / FPS,
            },
            class_type: 'TrimAudioDuration',
            _meta: { title: 'Grab Anchor Audio' },
        };
        // Force the grab to exactly the window duration: TrimAudioDuration
        // silently clamps to the source length, and a short encoded latent
        // would desynchronize the whole audio stream (stream shorter than the
        // latent time axis the model was conditioned on). Silence padding
        // covers the chunk-snapping overshoot beyond the user's trim.
        graph[':sil_' + i] = {
            inputs: {
                duration: (a1 - a0) / AUDIO_LATENT_FPS,
                sample_rate: AUDIO_VAE_SAMPLE_RATE,
                channels: 2,
            },
            class_type: 'EmptyAudio',
            _meta: { title: 'Silence Pad' },
        };
        graph[':pad_' + i] = {
            inputs: {
                audio1: [':trim_' + i, 0],
                audio2: [':sil_' + i, 0],
                direction: 'after',
            },
            class_type: 'AudioConcat',
            _meta: { title: 'Pad Anchor Audio' },
        };
        graph[':fitw_' + i] = {
            inputs: {
                audio: [':pad_' + i, 0],
                start_index: 0,
                duration: (a1 - a0) / AUDIO_LATENT_FPS,
            },
            class_type: 'TrimAudioDuration',
            _meta: { title: 'Fit Anchor Audio Duration' },
        };
        graph[':enc_' + i] = {
            inputs: { audio: [':fitw_' + i, 0], vae: audioVAERef },
            class_type: 'VAEEncodeAudio',
            _meta: { title: 'Encode Anchor Audio' },
        };
        graph[':fit_' + i] = {
            inputs: {
                samples: [':enc_' + i, 0],
                dim: 'x',
                index: 0,
                amount: a1 - a0,
            },
            class_type: 'LatentCut',
            _meta: { title: 'Fit Anchor Audio Slots' },
        };
        graph[':cat_' + i] = {
            inputs: { samples1: current, samples2: [':fit_' + i, 0], dim: 'x' },
            class_type: 'LatentConcat',
            _meta: { title: 'Splice Anchor Audio' },
        };
        const base = insertGraph(api, graph);
        current = [base + ':cat_' + i, 0];
        cursor = a1;
    });

    // Re-attach the untouched audio tail from the original stream.
    if (cursor > 0 && cursor < options.audioSlots) {
        const baseTail = insertGraph(api, {
            ':tail': {
                inputs: {
                    samples: audioDest,
                    dim: 'x',
                    index: cursor,
                    amount: options.audioSlots - cursor,
                },
                class_type: 'LatentCut',
                _meta: { title: 'Keep Audio Tail' },
            },
            ':done': {
                inputs: { samples1: current, samples2: [':tail', 0], dim: 'x' },
                class_type: 'LatentConcat',
                _meta: { title: 'Rejoin Audio Stream' },
            },
        });
        current = [baseTail + ':done', 0];
    }

    return current;
};

export type TAnchorEncodeSize =
    | { kind: 'runtime'; width: NodeRef; height: NodeRef }
    | { kind: 'static'; width: number; height: number };

/**
 * The shared anchor-clip fit chain: grab `fitFrames` (17m+5) frames from the
 * source segment side-aligned (tail for flush regions, head otherwise) and
 * pad with repeats to exactly that count. The SAME fitted frames feed both
 * MiniMaxH3AddGuide (whose own crop is then a no-op) and the latent splice,
 * so the conditioning token and the latent region always carry identical
 * frames — no duplicated fraction of a second at segment starts.
 */
export const buildAnchorFitChain = (
    api: Workflow,
    options: {
        regions: TAnchorRegion[];
        sources: Map<TAnchorRegion, NodeRef>;
    },
): Map<TAnchorRegion, NodeRef> => {
    const fits = new Map<TAnchorRegion, NodeRef>();
    options.regions.forEach((region) => {
        const source = options.sources.get(region);
        if (!source || region.kind !== 'video') {
            return;
        }
        const base = insertGraph(api, {
            ':grab': {
                inputs: {
                    batch_index: region.flush ? -region.fitFrames : 0,
                    length: region.fitFrames,
                    image: source,
                },
                class_type: 'ImageFromBatch',
                _meta: { title: 'Grab Anchor Clip' },
            },
            ':expand': {
                inputs: {
                    image: [':grab', 0],
                    size: region.fitFrames,
                    method: region.flush ? 'repeat first' : 'repeat last',
                },
                class_type: 'ImageExpandBatch+',
                _meta: { title: 'Fit Anchor Clip' },
            },
        });
        fits.set(region, [base + ':expand', 0]);
    });
    return fits;
};

/**
 * Inserts the scale/encode/replace chain over the video stream of
 * `videoDest`, one sequence per plan region, fed by the shared fitted clip.
 * Returns the latent ref of the final ReplaceVideoLatentFrames.
 */
export const buildAnchorReplaceChain = (
    api: Workflow,
    options: {
        videoDest: NodeRef;
        regions: TAnchorRegion[];
        /** Fitted clips (videos) built by `buildAnchorFitChain`. */
        fits: Map<TAnchorRegion, NodeRef>;
        /** Source refs for single-image regions. */
        sources: Map<TAnchorRegion, NodeRef>;
        vaeRef: NodeRef;
        size: TAnchorEncodeSize;
    },
): NodeRef => {
    const { videoDest, regions, fits, sources, vaeRef, size } = options;

    let current: NodeRef = videoDest;

    regions.forEach((region) => {
        const fit = region.kind === 'video' ? fits.get(region) : sources.get(region);
        if (!fit) {
            return;
        }
        const graph: Workflow = {};
        let framesOut: NodeRef;
        if (region.kind === 'video') {
            if (region.padJunk) {
                // Interior regions freeze 17m frames at chunk boundaries:
                // encode the first fitFrames-5 fit frames plus 5 junk pad
                // frames (the pad's slots are cut off after encoding).
                graph[':cutin'] = {
                    inputs: {
                        batch_index: 0,
                        length: region.fitFrames - 5,
                        image: fit,
                    },
                    class_type: 'ImageFromBatch',
                    _meta: { title: 'Anchor Clip Head' },
                };
                graph[':pad'] = {
                    inputs: {
                        batch_index: 0,
                        length: 5,
                        image: fit,
                    },
                    class_type: 'ImageFromBatch',
                    _meta: { title: 'Junk Pad Frames' },
                };
                graph[':padded'] = {
                    inputs: {
                        image1: [':cutin', 0],
                        image2: [':pad', 0],
                    },
                    class_type: 'ImageBatch',
                    _meta: { title: 'Pad Anchor Clip' },
                };
                framesOut = [':padded', 0];
            } else {
                framesOut = fit;
            }
        } else {
            graph[':first'] = {
                inputs: { batch_index: 0, length: 1, image: fit },
                class_type: 'ImageFromBatch',
                _meta: { title: 'Anchor Image' },
            };
            framesOut = [':first', 0];
        }

        graph[':scale'] = {
            inputs: {
                upscale_method: 'lanczos',
                width: size.width,
                height: size.height,
                crop: 'center',
                image: framesOut,
            },
            class_type: 'ImageScale',
            _meta: { title: 'Scale Anchor to Canvas' },
        };
        graph[':encode'] = {
            inputs: { pixels: [':scale', 0], vae: vaeRef },
            class_type: 'VAEEncode',
            _meta: { title: 'Encode Anchor Clip' },
        };
        let encoded: NodeRef = [':encode', 0];
        if (region.padJunk) {
            graph[':cut'] = {
                inputs: {
                    samples: encoded,
                    dim: 't',
                    index: 0,
                    amount: region.slotLen,
                },
                class_type: 'LatentCut',
                _meta: { title: 'Cut Junk Slots' },
            };
            encoded = [':cut', 0];
        }
        graph[':replace'] = {
            inputs: {
                destination: current,
                source: encoded,
                index: region.slotStart,
            },
            class_type: 'ReplaceVideoLatentFrames',
            _meta: {
                title: 'Anchor Video Slots (' + region.slotStart + ')',
            },
        };

        const base = insertGraph(api, graph);
        current = [base + ':replace', 0];
    });

    return current;
};

/**
 * Inserts the mask graphs: a per-slot video mask batch (one constant image
 * per latent slot, white = denoise, black = frozen) and a single audio mask
 * image whose width is the audio latent time axis ([B,32,2,T] maps the mask
 * spatial axes onto (2, T)). Only the passed audio windows (regions whose
 * clip audio was actually spliced in) get frozen.
 */
export const buildAnchorMaskGraph = (
    api: Workflow,
    plan: TAnchorPlan,
    regions: TAnchorRegion[],
    audioWindows: Array<[number, number]>,
): { videoMask: NodeRef; audioMask: NodeRef } => {
    const graph: Workflow = {};

    // --- video mask: (slots, SLOT_MASK_SIZE, SLOT_MASK_SIZE) image batch ---
    const videoRegions = [...regions].sort(
        (a, b) => a.slotStart - b.slotStart,
    );
    const segments: Array<{ white: boolean; len: number }> = [];
    let cursor = 0;
    videoRegions.forEach((region) => {
        // Overlapping anchors merge: only the not-yet-covered tail of a
        // region adds a new frozen segment.
        const start = Math.max(region.slotStart, cursor);
        const end = Math.min(plan.slots, region.slotStart + region.slotLen);
        if (end <= start) {
            return;
        }
        if (start > cursor) {
            segments.push({ white: true, len: start - cursor });
        }
        segments.push({ white: false, len: end - start });
        cursor = end;
    });
    if (cursor < plan.slots) {
        segments.push({ white: true, len: plan.slots - cursor });
    }

    const imageRefs: NodeRef[] = [];
    segments.forEach((seg, i) => {
        graph[':seg_' + i] = {
            inputs: {
                width: SLOT_MASK_SIZE,
                height: SLOT_MASK_SIZE,
                batch_size: seg.len,
                color: seg.white ? 0xffffff : 0,
            },
            class_type: 'EmptyImage',
            _meta: { title: (seg.white ? 'Denoise slots ' : 'Frozen slots ') + i },
        };
        imageRefs.push([':seg_' + i, 0]);
    });
    let lastImage = imageRefs[0];
    for (let i = 1; i < imageRefs.length; i++) {
        graph[':batch_' + i] = {
            inputs: { image1: lastImage, image2: imageRefs[i] },
            class_type: 'ImageBatch',
            _meta: { title: 'Stack Slot Masks' },
        };
        lastImage = [':batch_' + i, 0];
    }
    graph[':vmask'] = {
        inputs: { image: lastImage, channel: 'red' },
        class_type: 'ImageToMask',
        _meta: { title: 'Video Slot Mask' },
    };

    // --- audio mask: SolidMask(width = audioSlots, height = 2), black rects ---
    graph[':abase'] = {
        inputs: { value: 1, width: plan.audioSlots, height: 2 },
        class_type: 'SolidMask',
        _meta: { title: 'Audio Mask Base' },
    };
    let audioRef: NodeRef = [':abase', 0];
    let rectIdx = 0;
    audioWindows.forEach(([a0, a1]) => {
        graph[':arect_' + rectIdx] = {
            inputs: { value: 1, width: a1 - a0, height: 2 },
            class_type: 'SolidMask',
            _meta: { title: 'Audio Freeze Window' },
        };
        graph[':acomp_' + rectIdx] = {
            inputs: {
                destination: audioRef,
                source: [':arect_' + rectIdx, 0],
                x: a0,
                y: 0,
                operation: 'subtract',
            },
            class_type: 'MaskComposite',
            _meta: { title: 'Subtract Audio Window' },
        };
        audioRef = [':acomp_' + rectIdx, 0];
        rectIdx++;
    });

    const base = insertGraph(api, graph);
    return {
        videoMask: [base + ':vmask', 0],
        audioMask: [base + (rectIdx > 0 ? ':acomp_' + (rectIdx - 1) : ':abase'), 0],
    };
};

/** The reference node's AV latent consumed by the pass 1 anchor chain.
 *  `pre` reuses fit/source graphs already built for the AddGuide chain, so
 *  both mechanisms splice identical frames. */
export const applyPass1LatentAnchors = (
    api: Workflow,
    control: controlType,
    plan: TAnchorPlan,
    entries: TAnchorEntry[],
    pre?: {
        fits: Map<TAnchorRegion, NodeRef>;
        sources: Map<TAnchorRegion, NodeRef>;
    },
): void => {
    const {
        node_id: refNodeID,
        sampler_node_id: samplerNodeID,
        resolution_node_id: resolutionNodeID,
        vae_node_id: vaeNodeID,
    } = control;
    if (!refNodeID || !samplerNodeID || !resolutionNodeID || !vaeNodeID) {
        return;
    }

    // Only entries that actually requested the latent anchor get spliced.
    const regions = plan.regions.filter((region) =>
        entries.some((e) => e.kind === region.kind && e.index === region.index),
    );
    if (!regions.length) {
        return;
    }

    const separateGraph: Workflow = {
        ':separate': {
            inputs: { av_latent: [refNodeID, 1] },
            class_type: 'LTXVSeparateAVLatent',
            _meta: { title: 'Separate AV Latent' },
        },
    };
    const sepBase = insertGraph(api, separateGraph);
    const videoDest: NodeRef = [sepBase + ':separate', 0];
    const audioDest: NodeRef = [sepBase + ':separate', 1];

    let fits = pre?.fits;
    let sources = pre?.sources;
    if (!fits || !sources) {
        const localSources = new Map<TAnchorRegion, NodeRef>();
        const sourceMap = new Map<TAnchorRegion, NodeRef>();
        regions.forEach((region) => {
            const entry = entries.find(
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
                localSources.set(region, ref);
            }
        });
        fits = buildAnchorFitChain(api, { regions, sources: sourceMap });
        sources = localSources;
    }

    const replaced = buildAnchorReplaceChain(api, {
        videoDest,
        regions,
        fits,
        sources,
        vaeRef: [vaeNodeID, 0],
        size: {
            kind: 'runtime',
            width: [resolutionNodeID, 0],
            height: [resolutionNodeID, 1],
        },
    });

    // Splice the clips' soundtracks into the audio stream so the frozen
    // windows carry real audio (zero latents would decode to a hum).
    const audioSources = new Map<TAnchorRegion, NodeRef>();
    regions.forEach((region) => {
        if (!region.audio) {
            return;
        }
        const ref = anchorAudioRef(api, refNodeID, region.index);
        if (ref) {
            audioSources.set(region, ref);
        }
    });
    const audioWindows: Array<[number, number]> = regions
        .filter((region) => region.audio && audioSources.has(region))
        .map((region) => region.audio as [number, number]);

    let audioLatent: NodeRef = audioDest;
    if (audioWindows.length && control.audio_vae_node_id) {
        audioLatent = buildAudioSpliceChain(api, {
            audioDest,
            regions,
            audioSources,
            audioVAERef: [control.audio_vae_node_id, 0],
            audioSlots: plan.audioSlots,
        });
    }

    const { videoMask, audioMask } = buildAnchorMaskGraph(
        api,
        plan,
        regions,
        audioWindows,
    );

    const maskGraph: Workflow = {
        ':vmasked': {
            inputs: { samples: replaced, mask: videoMask },
            class_type: 'SetLatentNoiseMask',
            _meta: { title: 'Mask Video Slots' },
        },
        ':concat': {
            inputs: {
                video_latent: [':vmasked', 0],
                audio_latent: audioWindows.length
                    ? [':amasked', 0]
                    : audioLatent,
            },
            class_type: 'LTXVConcatAVLatent',
            _meta: { title: 'Rejoin AV Latent' },
        },
    };
    if (audioWindows.length) {
        maskGraph[':amasked'] = {
            inputs: { samples: audioLatent, mask: audioMask },
            class_type: 'SetLatentNoiseMask',
            _meta: { title: 'Mask Audio Slots' },
        };
    }
    const maskBase = insertGraph(api, maskGraph);

    api[samplerNodeID].inputs.latent_image = [maskBase + ':concat', 0];
};
