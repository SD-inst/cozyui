import { useWatch } from 'react-hook-form';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { CFGInput } from '../../controls/CFGInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LengthInput } from '../../controls/LengthSlider';
import { LoraInput } from '../../controls/LoraInput';
import { LTX2KeyframesControl } from '../../controls/ltx2/LTX2KeyframesControl';
import { LTX2ReferenceAudioControl } from '../../controls/ltx2/LTX2ReferenceAudioControl';
import { LTX2UpsampleControl } from '../../controls/ltx2/LTX2UpsampleControl';
import { useLTXUploadHandler } from '../../controls/ltx2/LTX2Utils';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';
import { ChatComponent } from '../../chat/ChatComponent';
import { ltx2I2VSystemPrompt } from '../../chat/prompts/ltx2I2V';

const Content = () => {
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    const handler = useLTXUploadHandler();
    return (
        <Layout>
            <GridLeft>
                <FileUpload
                    name='image'
                    type={UploadType.IMAGEORVIDEO}
                    extraHandler={handler}
                />
                <LTX2KeyframesControl />
                <LTX2ReferenceAudioControl />
                <TextInput name='prompt' multiline />
                <ChatComponent
                    systemPrompt={ltx2I2VSystemPrompt}
                    mediaFields={[{ name: 'image', kind: 'image' }]}
                />
                <SliderInput
                    name='size'
                    label='size_mp'
                    defaultValue={1}
                    min={0.1}
                    max={2}
                    step={0.01}
                />
                <LengthInput
                    name='length'
                    min={9}
                    max={601}
                    step={8}
                    defaultValue={129}
                    fps={fps}
                />
                <SliderInput name='steps' defaultValue={20} min={5} max={50} />
                <AdvancedSettings>
                    <TextInput
                        name='neg_prompt'
                        defaultValue='blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles'
                        multiline
                    />
                    <CFGInput defaultValue={4} />
                    <SliderInput
                        name='fps'
                        defaultValue={24}
                        min={1}
                        max={50}
                    />
                    <ModelSelectAutocomplete
                        name='model'
                        type='ltx2'
                        component='UNETLoader'
                        field='unet_name'
                        defaultValue='ltx2/ltx-2-19b-dev-fp8.safetensors'
                        sx={{ mb: 2 }}
                    />
                    <ModelSelectAutocomplete
                        name='text_encoder'
                        type='ltx_gemma'
                        component='LTXAVTextEncoderLoader'
                        field='text_encoder'
                        defaultValue='gemma_3_12B_it_fp8_e4m3fn.safetensors'
                        sx={{ mb: 2 }}
                    />
                    <SliderInput
                        name='compression'
                        defaultValue={33}
                        min={1}
                        max={50}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='euler' />
                    <LTX2UpsampleControl i2v />
                </AdvancedSettings>
                <LoraInput name='lora' type='ltx2' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult fps={fps} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const LTX2I2VTab = (
    <WFTab
        label='LTX-2'
        value='LTX-2 I2V'
        group='I2V'
        receivers={[
            { name: 'image', acceptedTypes: ['images', 'gifs'] },
            { name: 'keyframes', acceptedTypes: ['images', 'gifs'] },
            { name: 'reference_audio', acceptedTypes: 'audio' },
        ]}
        content={<Content />}
    />
);
