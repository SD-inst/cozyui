import { Box, useEventCallback } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ArrayInput } from '../../controls/ArrayInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LengthInput } from '../../controls/LengthSlider';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { MiniMaxH3SpectrumControls } from '../../controls/MiniMaxH3SpectrumControls';
import { SectionAccordion } from '../../controls/SectionAccordion';
import { VideoInterpolationSlider } from '../../controls/VideoInterpolationSlider';

import { getFreeNodeId, insertGraph } from '../../../api/utils';
import { useMiniMaxH3FirstMessageTransform } from '../../../hooks/useMiniMaxH3FirstMessageTransform';
import { useMiniMaxH3TurboHandler } from '../../../hooks/useMiniMaxH3TurboHandler';
import { useTranslate } from '../../../i18n/I18nContext';
import { controlType } from '../../../redux/config';
import { ChatComponent } from '../../chat/ChatComponent';
import { miniMaxH3R2VSystemPrompt } from '../../chat/prompts/minimaxH3R2V';
import { useRegisterHandler } from '../../contexts/TabContext';
import { LoraInput } from '../../controls/LoraInput';
import { keyframeHandler } from '../../controls/MiniMaxH3KeyframeHandler';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SelectInput } from '../../controls/SelectInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { ToggleInput } from '../../controls/ToggleInput';
import { TurboLoraSelect } from '../../controls/TurboLoraSelect';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';

import { useFormContext } from 'react-hook-form';

const imageValue = { image: '', keyframe: false, keyframe_position: 0 };
const audioValue = { audio: '' };
const videoValue = {
    video: '',
    no_audio: false,
    trim: 0,
    last: false,
    keyframe: false,
    keyframe_position: 0,
};

const KeyframeControl = ({ name }: { name: string }) => {
    const positionName = name.replace(/\.keyframe$/, '.keyframe_position');
    const enabled = useWatch({ name, defaultValue: false });
    return (
        <Box>
            <ToggleInput name={name} label='keyframe' defaultValue={false} />
            {enabled && (
                <SliderInput
                    name={positionName}
                    label='keyframe_position'
                    min={0}
                    max={30}
                    step={0.1}
                    defaultValue={0}
                />
            )}
        </Box>
    );
};

const ReferenceImages = ({ name }: { name: string }) => {
    const { getValues } = useFormContext();

    const handler = useEventCallback(
        (api: any, value: Array<{ image: string }>, control: controlType) => {
            if (!value || !value.length || !control.node_id) {
                return;
            }

            const scaleMode = getValues('ref_image_size') === 'scale';

            value.forEach((v, idx) => {
                if (!v.image) {
                    return;
                }
                const imageNodeID = getFreeNodeId(api) + '';
                api[imageNodeID] = {
                    inputs: { image: v.image },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Image' },
                };

                let outputId = imageNodeID;
                let outputIdx = 0;

                if (scaleMode) {
                    const scaleGraph = {
                        ':scale_mpx': {
                            inputs: { value: getValues('ref_megapixels') || 1 },
                            class_type: 'PrimitiveFloat',
                            _meta: { title: 'Reference scaling mpx' },
                        },
                        ':scale': {
                            inputs: {
                                upscale_method: 'lanczos',
                                megapixels: [':scale_mpx', 0],
                                resolution_steps: 32,
                                image: [imageNodeID, 0],
                            },
                            class_type: 'ImageScaleToTotalPixels',
                            _meta: { title: 'Scale Image to Total Pixels' },
                        },
                        ':size': {
                            inputs: {
                                image: [imageNodeID, 0],
                            },
                            class_type: 'GetImageSize',
                            _meta: { title: 'Get Image Size' },
                        },
                        ':math': {
                            inputs: {
                                expression: 'a * b / 1024 / 1024 > c',
                                'values.a': [':size', 0],
                                'values.b': [':size', 1],
                                'values.c': [':scale_mpx', 0],
                            },
                            class_type: 'ComfyMathExpression',
                            _meta: { title: 'Math Expression' },
                        },
                        ':switch': {
                            inputs: {
                                switch: [':math', 2],
                                on_false: [imageNodeID, 0],
                                on_true: [':scale', 0],
                            },
                            class_type: 'ComfySwitchNode',
                            _meta: { title: 'If/Else Switch' },
                        },
                    };

                    const baseId = insertGraph(api, scaleGraph);
                    outputId = baseId + ':switch';
                    outputIdx = 0;
                }

                api[control.node_id].inputs['ref_images.ref_image_' + idx] = [
                    outputId,
                    outputIdx,
                ];
            });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={imageValue}
            max={9}
            receiverFieldName='image'
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' type={UploadType.IMAGE} />
            <KeyframeControl name='keyframe' />
        </ArrayInput>
    );
};

const ReferenceAudio = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: Array<{ audio: string }>, control: controlType) => {
            if (!value || !value.length || !control.node_id) {
                return;
            }

            value.forEach((v, idx) => {
                if (!v.audio) {
                    return;
                }
                const audioNodeID = getFreeNodeId(api) + '';
                api[audioNodeID] = {
                    inputs: { audio: v.audio },
                    class_type: 'LoadAudio',
                    _meta: { title: 'Load Audio' },
                };
                api[control.node_id].inputs['ref_audios.ref_audio_' + idx] = [
                    audioNodeID,
                    0,
                ];
            });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={audioValue}
            keyField='audio'
            max={3}
            receiverFieldName='audio'
            targetFieldName='audio'
        >
            <FileUpload name='audio' label='audio' type={UploadType.AUDIO} />
        </ArrayInput>
    );
};

const ReferenceVideos = ({ name }: { name: string }) => {
    const { getValues } = useFormContext();

    const handler = useEventCallback(
        (
            api: any,
            value: Array<{
                video: string;
                no_audio: boolean;
                trim: number;
                last: boolean;
            }>,
            control: controlType,
        ) => {
            if (!control.node_id) {
                return;
            }

            const scaleMode = getValues('ref_image_size') === 'scale';

            (value || []).forEach((v, idx) => {
                if (!v.video) {
                    return;
                }

                const resampleGraph = {
                    ':video': {
                        inputs: {
                            video: '',
                            force_rate: 0,
                            custom_width: 0,
                            custom_height: 0,
                            frame_load_cap: 0,
                            skip_first_frames: 0,
                            select_every_nth: 1,
                        },
                        class_type: 'VHS_LoadVideo',
                        _meta: { title: 'Load Video (Upload)' },
                    },
                    ':info': {
                        inputs: {
                            video_info: [':video', 3],
                        },
                        class_type: 'VHS_VideoInfoLoaded',
                        _meta: { title: 'Video Info (Loaded)' },
                    },
                    ':math': {
                        inputs: {
                            expression: 'a != 24',
                            'values.a': [':info', 0],
                        },
                        class_type: 'ComfyMathExpression',
                        _meta: { title: 'Math Expression' },
                    },
                    ':resample': {
                        inputs: {
                            ckpt_name: 'rife_v4.26.safetensors',
                            fps_in: [':info', 0],
                            fps_out: 24,
                            scale_factor: 1,
                            ensemble: true,
                            linearize: false,
                            lf_guardrail: false,
                            lf_sigma: 13,
                            source_pair_match: false,
                            match_a_cap: 0.02,
                            match_b_cap: 0.00784313725490196,
                            edge_band_lock: false,
                            tau_low: 0.0058823529411764705,
                            tau_high: 0.023529411764705882,
                            band_radius: 4,
                            band_soft_sigma: 2,
                            clear_cache_after_n_frames: 0,
                            frames: [':video', 0],
                        },
                        class_type: 'RIFE_FPS_Resample',
                        _meta: { title: 'RIFE VFI FPS Resample' },
                    },
                    ':switch': {
                        inputs: {
                            switch: [':math', 2],
                            on_false: [':video', 0],
                            on_true: [':resample', 0],
                        },
                        class_type: 'ComfySwitchNode',
                        _meta: { title: 'If/Else Switch' },
                    },
                };

                const baseID = insertGraph(api, resampleGraph);

                const videoNodeID = baseID + ':video';
                const resampleSwitchNodeID = baseID + ':switch';

                api[videoNodeID].inputs.video = v.video;

                let frameSourceId = resampleSwitchNodeID;
                if (v.trim > 0) {
                    const trimBaseId = insertGraph(api, {
                        ':trim': {
                            inputs: {
                                batch_index: v.last ? -v.trim : 0,
                                length: v.trim,
                                image: [resampleSwitchNodeID, 0],
                            },
                            class_type: 'ImageFromBatch',
                            _meta: { title: 'Trim Video' },
                        },
                    });
                    frameSourceId = trimBaseId + ':trim';
                }

                let outputId = frameSourceId;
                let outputIdx = 0;

                if (scaleMode) {
                    const scaleGraph = {
                        ':scale_mpx': {
                            inputs: { value: getValues('ref_megapixels') || 1 },
                            class_type: 'PrimitiveFloat',
                            _meta: { title: 'Reference scaling mpx' },
                        },
                        ':video_info': {
                            inputs: { video_info: [videoNodeID, 3] },
                            class_type: 'VHS_VideoInfoLoaded',
                            _meta: { title: 'Video Info (Loaded)' },
                        },
                        ':scale': {
                            inputs: {
                                upscale_method: 'lanczos',
                                megapixels: [':scale_mpx', 0],
                                resolution_steps: 32,
                                image: [frameSourceId, 0],
                            },
                            class_type: 'ImageScaleToTotalPixels',
                            _meta: { title: 'Scale Image to Total Pixels' },
                        },
                        ':math': {
                            inputs: {
                                expression: 'a * b / 1024 / 1024 > c',
                                'values.a': [':video_info', 3],
                                'values.b': [':video_info', 4],
                                'values.c': [':scale_mpx', 0],
                            },
                            class_type: 'ComfyMathExpression',
                            _meta: { title: 'Math Expression' },
                        },
                        ':switch': {
                            inputs: {
                                switch: [':math', 2],
                                on_false: [frameSourceId, 0],
                                on_true: [':scale', 0],
                            },
                            class_type: 'ComfySwitchNode',
                            _meta: { title: 'If/Else Switch' },
                        },
                    };

                    const scaleBaseId = insertGraph(api, scaleGraph);
                    outputId = scaleBaseId + ':switch';
                    outputIdx = 0;
                }

                api[control.node_id].inputs['ref_videos.ref_video_' + idx] = [
                    outputId,
                    outputIdx,
                ];
                if (!v.no_audio) {
                    api[control.node_id].inputs[
                        'ref_video_audios.ref_video_audio_' + idx
                    ] = [videoNodeID, 2];
                }
            });

            keyframeHandler(
                api,
                getValues('ref_images') || [],
                getValues('ref_videos') || [],
                control,
            );
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={videoValue}
            keyField='video'
            max={3}
            receiverFieldName='video'
            targetFieldName='video'
        >
            <FileUpload name='video' label='video' type={UploadType.VIDEO} />
            <ToggleInput name='no_audio' label='no_audio' />
            <Box display='flex' flexWrap='wrap' alignItems='center' gap={4}>
                <LengthInput
                    name='trim'
                    label='ref_video_trim'
                    min={0}
                    max={720}
                    fps={24}
                    defaultValue={0}
                    step={8}
                    sx={{ minWidth: 200, flex: 1 }}
                />
                <ToggleInput
                    name='last'
                    label='ref_video_last'
                    sx={{ mt: 1 }}
                />
            </Box>
            <KeyframeControl name='keyframe' />
        </ArrayInput>
    );
};

const ReferenceScaling = ({ name }: { name: string }) => {
    const tr = useTranslate();
    const mode = useWatch({ name, defaultValue: 'scale' });

    const handler = useEventCallback(
        (api: any, value: string, control: controlType) => {
            if (!control.node_id) {
                return;
            }
            const normalizedValue = value === 'scale' ? 'max' : value;
            api[control.node_id].inputs[control.field] = normalizedValue;
        },
    );
    useRegisterHandler({ name, handler });

    const isScale = mode === 'scale';

    return (
        <Box
            sx={{
                mt: 2,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 3,
                alignItems: 'stretch',
            }}
        >
            <Box sx={{ flex: 1 }}>
                <SelectInput
                    name={name}
                    label='ref_image_size'
                    choices={[
                        { text: tr('controls.scale_match'), value: 'match' },
                        { text: tr('controls.scale_scale'), value: 'scale' },
                        { text: tr('controls.scale_max'), value: 'max' },
                    ]}
                    defaultValue='scale'
                    sx={{ width: '100% !important' }}
                />
            </Box>
            <Box sx={{ flex: 1, display: isScale ? 'block' : 'none' }}>
                <SliderInput
                    name='ref_megapixels'
                    label='ref_megapixels'
                    defaultValue={0.8}
                    min={0.1}
                    max={2}
                    step={0.1}
                />
            </Box>
        </Box>
    );
};

const Content = () => {
    const turboHandler = useMiniMaxH3TurboHandler();
    const transformFirstMessage = useMiniMaxH3FirstMessageTransform();
    useRegisterHandler({ name: 'turbo', handler: turboHandler });
    return (
        <Layout>
            <GridLeft>
                <SectionAccordion
                    label='controls.references'
                    defaultExpanded
                    sx={{ mb: 3 }}
                >
                    <Box display='flex' flexDirection='column' gap={3}>
                        <ReferenceImages name='ref_images' />
                        <ReferenceVideos name='ref_videos' />
                        <ReferenceAudio name='ref_audio' />
                    </Box>
                </SectionAccordion>
                <TextInput name='prompt' multiline />
                <ChatComponent
                    systemPrompt={miniMaxH3R2VSystemPrompt}
                    mediaFields={[
                        {
                            name: 'ref_images',
                            kind: 'image',
                            itemField: 'image',
                        },
                        {
                            name: 'ref_videos',
                            kind: 'video',
                            itemField: 'video',
                        },
                    ]}
                    transformFirstMessage={transformFirstMessage}
                />
                <MiniMaxH3ResolutionSelector
                    name='aspect_ratio'
                    defaultValue='16:9 (Widescreen)'
                />
                <SliderInput
                    name='megapixels'
                    label='size_mp'
                    defaultValue={0.4}
                    min={0.1}
                    max={2}
                    step={0.1}
                />
                <SliderInput
                    name='length'
                    label='length'
                    defaultValue={5}
                    min={1}
                    max={30}
                    step={0.1}
                />
                <SliderInput name='steps' defaultValue={8} min={1} max={50} />
                <ToggleInput name='turbo' label='turbo' defaultValue={true} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='res_multistep'
                    />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <MiniMaxH3SpectrumControls />
                    <ReferenceScaling name='ref_image_size' />
                    <VideoInterpolationSlider />
                    <TurboLoraSelect />
                </AdvancedSettings>
                <LoraInput name='lora' type='minimax_h3' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult rate_override={4} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const MiniMaxH3R2VTab = (
    <WFTab
        label='MiniMax H3 R2V'
        value='MiniMax H3 R2V'
        group='I2V'
        receivers={[
            { name: 'ref_images', acceptedTypes: ['images'] },
            { name: 'ref_videos', acceptedTypes: ['gifs'] },
            { name: 'ref_audio', acceptedTypes: ['audio'] },
        ]}
        content={<Content />}
    />
);
