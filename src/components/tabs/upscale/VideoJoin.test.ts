import { describe, expect, it } from 'vitest';
import {
    buildAudioLoopSeam,
    buildLoopSeam,
} from './videoJoinGraph';

const findNodes = (api: Record<string, any>, classType: string) =>
    Object.values(api).filter((n) => n.class_type === classType);

const idOf = (api: Record<string, any>, node: unknown) =>
    Object.keys(api).find((id) => api[id] === node)!;

describe('buildAudioLoopSeam', () => {
    it('crossfades the audio tail into a head copy and strips the head', () => {
        const api: Record<string, any> = {};
        const audioRef: [string, number] = ['10', 1];
        const fpsRef: [string, number] = ['10', 2];

        const out = buildAudioLoopSeam(api, audioRef, fpsRef, 48);

        const math = findNodes(api, 'ComfyMathExpression');
        expect(math).toHaveLength(1);
        expect(math[0].inputs.expression).toBe('48 / a');
        expect(math[0].inputs['values.a']).toEqual(fpsRef);
        const secsRef: [string, number] = [idOf(api, math[0]), 0];

        const concat = findNodes(api, 'SoundFlow_Concatenator');
        expect(concat).toHaveLength(1);
        expect(concat[0].inputs.audio1).toEqual(audioRef);
        expect(concat[0].inputs.fade_duration).toEqual(secsRef);

        const trims = findNodes(api, 'TrimAudioDuration');
        expect(trims).toHaveLength(2);

        // Head slice feeds the crossfade source: first `overlap` seconds.
        const head = trims.find((t) => t.inputs.audio === audioRef);
        expect(head).toBeDefined();
        expect(head.inputs.start_index).toBe(0);
        expect(head.inputs.duration).toEqual(secsRef);
        expect(concat[0].inputs.audio2).toEqual([idOf(api, head), 0]);

        // Final strip mirrors the video head strip: everything after the
        // first `overlap` seconds of the seam output.
        const strip = trims.find((t) => t !== head);
        expect(strip.inputs.start_index).toEqual(secsRef);
        expect(strip.inputs.audio).toEqual([idOf(api, concat[0]), 0]);
        expect(out).toEqual([idOf(api, strip), 0]);
    });

    it('video and audio seams derive from the same joined chain refs', () => {
        const api: Record<string, any> = {};
        const framesRef: [string, number] = ['20', 0];
        const audioRef: [string, number] = ['10', 1];
        const headSourceRef: [string, number] = ['10', 0];
        const fpsRef: [string, number] = ['10', 2];

        const videoOut = buildLoopSeam(api, framesRef, headSourceRef, false, 48);
        const audioOut = buildAudioLoopSeam(api, audioRef, fpsRef, 48);

        const strip = findNodes(api, 'ImageFromBatch')[0];
        expect(strip.inputs.image).toEqual([
            idOf(api, findNodes(api, 'ImageBatchJoinWithTransition')[0]),
            0,
        ]);
        expect(strip.inputs.batch_index).toBe(48);
        expect(videoOut).toEqual([idOf(api, strip), 0]);

        const audioConcat = findNodes(api, 'SoundFlow_Concatenator')[0];
        expect(audioConcat.inputs.audio1).toEqual(audioRef);
        expect(findNodes(api, 'TrimAudioDuration')).toHaveLength(2);
        expect(audioOut[0]).toBeTruthy();
        expect(audioOut[1]).toBe(0);
    });
});
