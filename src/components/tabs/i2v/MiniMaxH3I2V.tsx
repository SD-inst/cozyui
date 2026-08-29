import { useEventCallback } from '@mui/material';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { MiniMaxH3LatentUpscale } from '../../controls/MiniMaxH3LatentUpscale';
import { H3SparseAttention } from '../../controls/H3SparseAttention';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { MiniMaxH3Steps } from '../../controls/MiniMaxH3Steps';
import { TurboPDDToggle } from '../../controls/TurboPDDToggle';
import { VideoInterpolationSlider } from '../../controls/VideoInterpolationSlider';
import { MiniMaxH3SpectrumControls } from '../../controls/MiniMaxH3SpectrumControls';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { LoraInput } from '../../controls/LoraInput';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { TurboLoraSelect } from '../../controls/TurboLoraSelect';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';
import { Workflow } from '../../../api/graph';
import { controlType } from '../../../redux/config';
import { useMiniMaxH3PDDHandler } from '../../../hooks/useMiniMaxH3PDDHandler';
import { useMiniMaxH3TurboHandler } from '../../../hooks/useMiniMaxH3TurboHandler';
import { useMiniMaxH3I2VFirstMessageTransform } from '../../../hooks/useMiniMaxH3I2VFirstMessageTransform';
import { useRegisterHandler } from '../../contexts/TabContext';
import { ChatComponent } from '../../chat/ChatComponent';
import { miniMaxH3I2VSystemPrompt } from '../../chat/prompts/minimaxH3I2V';

const ImageFrameInput = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: Workflow, value: string, control: controlType) => {
            if (!value) {
                return;
            }
            const imageNodeId = control.image_node_id;
            api[imageNodeId] = {
                inputs: { image: value },
                class_type: 'LoadImage',
                _meta: { title: 'Load Image' },
            };
            if (control.scale_node_id) {
                api[control.scale_node_id].inputs.image = [imageNodeId, 0];
                api[control.node_id].inputs[control.field] = [
                    control.scale_node_id,
                    0,
                ];
            } else {
                api[control.node_id].inputs[control.field] = [imageNodeId, 0];
            }
        },
    );
    useRegisterHandler({ name, handler });
    return <FileUpload name={name} type={UploadType.IMAGE} />;
};

const Content = () => {
    const turboHandler = useMiniMaxH3TurboHandler();
    const pddHandler = useMiniMaxH3PDDHandler();
    const transformFirstMessage = useMiniMaxH3I2VFirstMessageTransform();
    useRegisterHandler({ name: 'turbo', handler: turboHandler });
    useRegisterHandler({ name: 'pdd', handler: pddHandler });
    return (
        <Layout>
            <GridLeft>
                <ImageFrameInput name='first_frame' />
                <ImageFrameInput name='last_frame' />
                <TextInput name='prompt' multiline />
                <ChatComponent
                    systemPrompt={miniMaxH3I2VSystemPrompt}
                    mediaFields={[
                        { name: 'first_frame', kind: 'image' },
                        { name: 'last_frame', kind: 'image' },
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
                    step={0.01}
                />
                <SliderInput
                    name='length'
                    label='length'
                    defaultValue={5}
                    min={1}
                    max={30}
                    step={0.1}
                />
                <MiniMaxH3Steps />
                <TurboPDDToggle />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                    <ModelSelectAutocomplete
                        name='video_vae'
                        type='minimax_h3_vae'
                        component='VAELoader'
                        field='vae_name'
                        previews={false}
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='beta57'
                    />
                    <MiniMaxH3LatentUpscale />
                    <H3SparseAttention />
                    <MiniMaxH3SpectrumControls />
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

export const MiniMaxH3I2VTab = (
    <WFTab
        label='MiniMax H3'
        value='MiniMax H3 I2V'
        group='I2V'
        receivers={[
            { name: 'first_frame', acceptedTypes: ['images'] },
            { name: 'last_frame', acceptedTypes: ['images'] },
        ]}
        content={<Content />}
    />
);
