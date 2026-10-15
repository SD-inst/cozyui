import { Workflow } from '../../../api/graph';
import { insertGraph } from '../../../api/utils';

// Graph builders for the Video join tab — kept out of the component file so
// they stay React-free and directly testable. Node IDs come exclusively from
// insertGraph — never hardcoded.

// Builds the whole join pipeline dynamically.
export const buildLoad = (api: Workflow, filename: string): string => {
    const base = insertGraph(api, {
        ':load': {
            inputs: { file: filename, 'video-preview': '' },
            class_type: 'LoadVideo',
            _meta: { title: 'Load Video' },
        },
        ':comp': {
            inputs: { video: [':load', 0] },
            class_type: 'GetVideoComponents',
            _meta: { title: 'Get Video Components' },
        },
    });
    return base + ':comp';
};

// Closes the loop: crossfades the last N frames of the joined video into a
// copy of the first N frames of the first clip (same tone-correction and
// transition logic as the chain joins), then strips those N frames from the
// start. Replaying the result wraps around without a visible seam.
export const buildLoopSeam = (
    api: Workflow,
    framesRef: [string, number],
    headSourceRef: [string, number],
    correct: boolean,
    overlap: number,
): [string, number] => {
    const graph: Workflow = {
        ':head': {
            inputs: {
                start_index: 0,
                num_frames: overlap,
                images: headSourceRef,
            },
            class_type: 'GetImageRangeFromBatch',
            _meta: { title: 'Loop Head Frames' },
        },
    };
    let headRef: [string, number] = [':head', 0];
    if (correct) {
        graph[':tone'] = {
            inputs: {
                source: framesRef,
                target: [':head', 0],
                mode: 'frame_shift',
                overlap,
                lut_bins: 64,
            },
            class_type: 'MiniMaxH3ToneCompensate',
            _meta: { title: 'MiniMax H3 Tone Compensate' },
        };
        headRef = [':tone', 0];
    }
    graph[':seam'] = {
        inputs: {
            // images_2 holds exactly `overlap` frames, so the join ends at
            // the blended seam and nothing from the head is duplicated.
            start_index: -overlap,
            interpolation: 'ease_in_out',
            transition_type: 'fade',
            transitioning_frames: overlap,
            blur_radius: 0,
            reverse: false,
            device: 'GPU',
            images_1: framesRef,
            images_2: headRef,
        },
        class_type: 'ImageBatchJoinWithTransition',
        _meta: { title: 'Loop Seam Join' },
    };
    graph[':strip'] = {
        inputs: {
            image: [':seam', 0],
            batch_index: overlap,
            // ComfyUI clamps length to the remaining batch size, so this
            // keeps everything after the stripped first frames.
            length: 4096,
        },
        class_type: 'ImageFromBatch',
        _meta: { title: 'Strip Loop Head' },
    };
    const base = insertGraph(api, graph);
    return [base + ':strip', 0];
};

// Audio mirror of buildLoopSeam: crossfades the last `overlap` frames of the
// joined audio into a copy of its first `overlap` frames, then drops those
// first frames. SoundFlow_Concatenator's crossfade consumes `fade_duration`
// from both sides (like ImageBatchJoinWithTransition does with frames), so
// the seam keeps the full length and the final trim leaves exactly
// `overlap` fewer samples. Without this the audio stays `loop_overlap`
// frames longer than the stripped video and shifts relative to it.
export const buildAudioLoopSeam = (
    api: Workflow,
    audioRef: [string, number],
    fpsRef: [string, number],
    overlap: number,
): [string, number] => {
    const base = insertGraph(api, {
        ':secs': {
            inputs: {
                expression: overlap + ' / a',
                'values.a': fpsRef,
            },
            class_type: 'ComfyMathExpression',
            _meta: { title: 'Loop Overlap in seconds' },
        },
        ':head': {
            inputs: {
                audio: audioRef,
                start_index: 0,
                duration: [':secs', 0],
            },
            class_type: 'TrimAudioDuration',
            _meta: { title: 'Loop Head Audio' },
        },
        ':seam': {
            inputs: {
                audio1: audioRef,
                audio2: [':head', 0],
                silence_before: 0,
                silence_between: 0,
                silence_after: 0,
                fade_duration: [':secs', 0],
            },
            class_type: 'SoundFlow_Concatenator',
            _meta: { title: 'Audio Loop Seam' },
        },
        ':strip': {
            inputs: {
                audio: [':seam', 0],
                start_index: [':secs', 0],
                // TrimAudioDuration clamps duration to the remaining length,
                // so this keeps everything after the trimmed head.
                duration: 86400,
            },
            class_type: 'TrimAudioDuration',
            _meta: { title: 'Strip Loop Head Audio' },
        },
    });
    return [base + ':strip', 0];
};
