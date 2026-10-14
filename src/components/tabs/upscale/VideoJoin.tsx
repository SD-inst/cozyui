import { useEventCallback } from '@mui/material';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { ArrayInput } from '../../controls/ArrayInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import {
    GridBottom,
    GridLeft,
    GridRight,
    Layout,
} from '../../controls/Layout';
import { Randomizer } from '../../controls/Randomizer';
import { SliderInput } from '../../controls/SliderInput';
import { ToggleInput } from '../../controls/ToggleInput';
import { ToggleInputBase } from '../../controls/ToggleInputBase';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { useRegisterHandler } from '../../contexts/TabContext';
import { WFTab } from '../../WFTab';
import { Workflow } from '../../../api/graph';
import { getFreeNodeId } from '../../../api/utils';
import { controlType } from '../../../redux/config';

const videoValue = { video: '' };

// Builds the whole join pipeline dynamically. Node IDs come exclusively from
// getFreeNodeId — never hardcoded.
const buildLoad = (api: Workflow, filename: string): string => {
    const loadId = getFreeNodeId(api) + '';
    api[loadId] = {
        inputs: { file: filename, 'video-preview': '' },
        class_type: 'LoadVideo',
        _meta: { title: 'Load Video' },
    };
    const compId = getFreeNodeId(api) + '';
    api[compId] = {
        inputs: { video: [loadId, 0] },
        class_type: 'GetVideoComponents',
        _meta: { title: 'Get Video Components' },
    };
    return compId;
};

// Closes the loop: crossfades the last N frames of the joined video into a
// copy of the first N frames of the first clip (same tone-correction and
// transition logic as the chain joins), then strips those N frames from the
// start. Replaying the result wraps around without a visible seam.
const buildLoopSeam = (
    api: Workflow,
    framesRef: [string, number],
    headSourceRef: [string, number],
    correct: boolean,
    overlap: number,
): [string, number] => {
    const headId = getFreeNodeId(api) + '';
    api[headId] = {
        inputs: { start_index: 0, num_frames: overlap, images: headSourceRef },
        class_type: 'GetImageRangeFromBatch',
        _meta: { title: 'Loop Head Frames' },
    };
    let headRef: [string, number] = [headId, 0];
    if (correct) {
        const toneId = getFreeNodeId(api) + '';
        api[toneId] = {
            inputs: {
                source: framesRef,
                target: headRef,
                mode: 'frame_shift',
                overlap,
                lut_bins: 64,
            },
            class_type: 'MiniMaxH3ToneCompensate',
            _meta: { title: 'MiniMax H3 Tone Compensate' },
        };
        headRef = [toneId, 0];
    }
    const seamId = getFreeNodeId(api) + '';
    api[seamId] = {
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
    const stripId = getFreeNodeId(api) + '';
    api[stripId] = {
        inputs: {
            image: [seamId, 0],
            batch_index: overlap,
            // ComfyUI clamps length to the remaining batch size, so this
            // keeps everything after the stripped first frames.
            length: 4096,
        },
        class_type: 'ImageFromBatch',
        _meta: { title: 'Strip Loop Head' },
    };
    return [stripId, 0];
};

const Videos = ({ name }: { name: string }) => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (
            api: Workflow,
            value: Array<{ video: string; skip?: boolean }>,
            control: controlType,
        ) => {
            if (!control.node_id) {
                return;
            }
            const overlap = getValues('overlap') ?? 48;
            const correct = getValues('correct_brightness') ?? false;
            const loop = getValues('loop') ?? false;
            const videos = (value || []).filter((v) => v.video && !v.skip);
            if (!videos.length) {
                return;
            }

            const combineNode = control.node_id;

            if (videos.length === 1) {
                // Degenerate case: just pass the single video through.
                const compId = buildLoad(api, videos[0].video);
                api[combineNode].inputs.images = [compId, 0];
                api[combineNode].inputs.audio = [compId, 1];
                api[combineNode].inputs.fps = [compId, 2];
                if (control.save_node_id) {
                    api[control.save_node_id].inputs.video = [combineNode, 0];
                }
                return;
            }

            const components: string[] = videos.map((v) =>
                buildLoad(api, v.video),
            );
            // All chained segments share the first video's fps.
            const fpsRef: [string, number] = [components[0], 2];

            // Brightness-correction chain: C1 = frames_1,
            // C_i = tone(source = C_{i-1}, target = frames_i).
            const corrected: [string, number][] = [[components[0], 0]];
            for (let i = 1; i < components.length; i++) {
                if (correct) {
                    const toneId = getFreeNodeId(api) + '';
                    api[toneId] = {
                        inputs: {
                            source: corrected[i - 1],
                            target: [components[i], 0],
                            mode: 'frame_shift',
                            overlap,
                            lut_bins: 64,
                        },
                        class_type: 'MiniMaxH3ToneCompensate',
                        _meta: { title: 'MiniMax H3 Tone Compensate' },
                    };
                    corrected.push([toneId, 0]);
                } else {
                    corrected.push([components[i], 0]);
                }
            }

            // Video crossfade chain + audio crossfade chain, built in one pass.
            let framesRef: [string, number] = corrected[0];
            let audioRef: [string, number] = [components[0], 1];
            for (let i = 1; i < corrected.length; i++) {
                const joinId = getFreeNodeId(api) + '';
                api[joinId] = {
                    inputs: {
                        // Negative start_index resolves to (F_prev - N) at
                        // runtime, so the seam is the last N frames.
                        start_index: -overlap,
                        interpolation: 'ease_in_out',
                        transition_type: 'fade',
                        transitioning_frames: overlap,
                        blur_radius: 0,
                        reverse: false,
                        device: 'GPU',
                        images_1: framesRef,
                        images_2: corrected[i],
                    },
                    class_type: 'ImageBatchJoinWithTransition',
                    _meta: { title: 'Image Batch Join With Transition' },
                };
                framesRef = [joinId, 0];

                const mathId = getFreeNodeId(api) + '';
                api[mathId] = {
                    inputs: {
                        expression: overlap + ' / a',
                        'values.a': fpsRef,
                    },
                    class_type: 'ComfyMathExpression',
                    _meta: { title: 'Overlap in seconds' },
                };
                const concatId = getFreeNodeId(api) + '';
                api[concatId] = {
                    inputs: {
                        audio1: audioRef,
                        audio2: [components[i], 1],
                        silence_before: 0,
                        silence_between: 0,
                        silence_after: 0,
                        fade_duration: [mathId, 0],
                    },
                    class_type: 'SoundFlow_Concatenator',
                    _meta: { title: 'Audio Crossfade Join' },
                };
                audioRef = [concatId, 0];
            }

            if (loop) {
                framesRef = buildLoopSeam(
                    api,
                    framesRef,
                    corrected[0],
                    correct,
                    getValues('loop_overlap') ?? overlap,
                );
            }

            api[combineNode].inputs.images = framesRef;
            api[combineNode].inputs.audio = audioRef;
            api[combineNode].inputs.fps = fpsRef;
            if (control.save_node_id) {
                api[control.save_node_id].inputs.video = [combineNode, 0];
            }
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={videoValue}
            keyField='video'
            min={0}
            max={10}
            receiverFieldName='video'
            targetFieldName='video'
        >
            <FileUpload name='video' label='video' type={UploadType.VIDEO} />
        </ArrayInput>
    );
};

// Seeds loop_overlap from the main overlap on the user's enable click only.
// A restored loop=true state (tab switch / reload) sets the form value
// without firing the switch onChange, so the persisted loop overlap stays.
const LoopToggle = ({ name }: { name: string }) => {
    const { getValues, setValue } = useFormContext();
    const {
        field: { ref, value, onChange, onBlur },
    } = useController({ name, defaultValue: false });
    return (
        <ToggleInputBase
            name={name}
            label='loop'
            baseRef={ref}
            value={value}
            onBlur={onBlur}
            onChange={(_, checked) => {
                onChange(checked);
                if (checked) {
                    setValue('loop_overlap', getValues('overlap'));
                }
            }}
        />
    );
};

const Content = () => {
    const videos = useWatch({ name: 'videos', defaultValue: [] });
    const loop = useWatch({ name: 'loop', defaultValue: false });
    const filled = (videos || []).filter((v: any) => v.video).length;
    return (
        <Layout>
            <GridLeft>
                <Videos name='videos' />
                <ToggleInput
                    name='correct_brightness'
                    label='correct_brightness'
                    defaultValue={true}
                />
                <SliderInput
                    name='overlap'
                    label='overlap'
                    defaultValue={48}
                    min={8}
                    max={240}
                    step={1}
                />
                <LoopToggle name='loop' />
                {loop && (
                    <SliderInput
                        name='loop_overlap'
                        label='loop_overlap'
                        defaultValue={48}
                        min={8}
                        max={240}
                        step={1}
                    />
                )}
                <Randomizer />
            </GridLeft>
            <GridRight>
                <VideoResult />
            </GridRight>
            <GridBottom>
                <GenerateButton disabled={filled < 2} />
            </GridBottom>
        </Layout>
    );
};

export const VideoJoinTab = (
    <WFTab
        label='Video join'
        value='Video join'
        group='Postprocessing'
        receivers={[{ name: 'videos', acceptedTypes: 'gifs' }]}
        content={<Content />}
    />
);
