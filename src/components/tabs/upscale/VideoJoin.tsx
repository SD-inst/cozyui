import { useEventCallback } from '@mui/material';
import { useFormContext, useWatch } from 'react-hook-form';
import { ArrayInput } from '../../controls/ArrayInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import {
    GridBottom,
    GridLeft,
    GridRight,
    Layout,
} from '../../controls/Layout';
import { SliderInput } from '../../controls/SliderInput';
import { ToggleInput } from '../../controls/ToggleInput';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { useRegisterHandler } from '../../contexts/TabContext';
import { WFTab } from '../../WFTab';
import { getFreeNodeId } from '../../../api/utils';
import { controlType } from '../../../redux/config';

const videoValue = { video: '' };

// Builds the whole join pipeline dynamically. Node IDs come exclusively from
// getFreeNodeId — never hardcoded.
const buildLoad = (api: any, filename: string): string => {
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

const Videos = ({ name }: { name: string }) => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, value: Array<{ video: string }>, control: controlType) => {
            if (!control.node_id) {
                return;
            }
            const overlap = getValues('overlap') ?? 48;
            const correct = getValues('correct_brightness') ?? false;
            const videos = (value || []).filter((v) => v.video);
            if (!videos.length) {
                return;
            }

            const combineNode = control.node_id;

            if (videos.length === 1) {
                // Degenerate case: just pass the single video through.
                const compId = buildLoad(api, videos[0].video);
                api[combineNode].inputs.images = [compId, 0];
                api[combineNode].inputs.audio = [compId, 1];
                api[combineNode].inputs.frame_rate = [compId, 2];
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
                        expression: 'a / b',
                        'values.a': overlap,
                        'values.b': fpsRef,
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

            api[combineNode].inputs.images = framesRef;
            api[combineNode].inputs.audio = audioRef;
            api[combineNode].inputs.frame_rate = fpsRef;
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={videoValue}
            keyField='video'
            min={2}
            max={10}
            receiverFieldName='video'
            targetFieldName='video'
        >
            <FileUpload name='video' label='video' type={UploadType.VIDEO} />
        </ArrayInput>
    );
};

const Content = () => {
    const videos = useWatch({ name: 'videos', defaultValue: [] });
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
