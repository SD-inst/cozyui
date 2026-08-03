import { useEventCallback } from '@mui/material';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ArrayInput } from '../../controls/ArrayInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';
import { controlType } from '../../../redux/config';
import { useRegisterHandler } from '../../contexts/TabContext';
import { getFreeNodeId } from '../../../api/utils';

const imageValue = { image: '' };
const audioValue = { audio: '' };
const videoValue = { video: '' };

const ReferenceImages = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: Array<{ image: string }>, control: controlType) => {
            if (!value || !value.length || !control.node_id) {
                return;
            }

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
                api[control.node_id].inputs['ref_images.ref_image_' + idx] = [
                    imageNodeID,
                    0,
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
            max={3}
            receiverFieldName='audio'
            targetFieldName='audio'
        >
            <FileUpload name='audio' label='audio' type={UploadType.AUDIO} />
        </ArrayInput>
    );
};

const ReferenceVideos = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: Array<{ video: string }>, control: controlType) => {
            if (!value || !value.length || !control.node_id) {
                return;
            }

            value.forEach((v, idx) => {
                if (!v.video) {
                    return;
                }
                const videoNodeID = getFreeNodeId(api) + '';
                api[videoNodeID] = {
                    inputs: { video: v.video },
                    class_type: 'VHS_LoadVideo',
                    _meta: { title: 'Load Video' },
                };
                api[control.node_id].inputs['ref_videos.ref_video_' + idx] = [
                    videoNodeID,
                    0,
                ];
                api[control.node_id].inputs['ref_video_audios.ref_video_audio_' + idx] = [
                    videoNodeID,
                    2,
                ];
            });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={videoValue}
            max={3}
            receiverFieldName='video'
            targetFieldName='video'
        >
            <FileUpload name='video' label='video' type={UploadType.VIDEO} />
        </ArrayInput>
    );
};

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <ReferenceImages name='ref_images' />
                <ReferenceVideos name='ref_videos' />
                <ReferenceAudio name='ref_audio' />
                <TextInput name='prompt' sx={{ mb: 2 }} multiline />
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
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
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
                </AdvancedSettings>
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult />
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
            { name: 'ref_images', acceptedTypes: ['images', 'gifs'] },
            { name: 'ref_videos', acceptedTypes: ['videos'] },
            { name: 'ref_audio', acceptedTypes: ['audio'] },
        ]}
        content={<Content />}
    />
);
