import { useWatch } from 'react-hook-form';
import { ChatComponent } from '../../chat/ChatComponent';
import { ltx23V2VSystemPrompt } from '../../chat/prompts/ltx23V2V';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { CFGInput } from '../../controls/CFGInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { UploadType } from '../../controls/UploadType';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';

const Content = () => {
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='video' type={UploadType.VIDEO} />
                <TextInput name='prompt' multiline />
                <ChatComponent systemPrompt={ltx23V2VSystemPrompt} />
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
                <AdvancedSettings>
                    <TextInput
                        name='neg_prompt'
                        defaultValue='blurry, low quality, still frame, frames, watermark, overlay, titles, has blurbox, has subtitles'
                    />
                    <ModelSelectAutocomplete
                        name='model'
                        type='ltx2'
                        component='UNETLoader'
                        field='unet_name'
                        defaultValue='ltx2/ltx-2.3-22b-dev_transformer_only_fp8_scaled.safetensors'
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
                    <SamplerSelectInput name='sampler' defaultValue='res_2s' />
                    <CFGInput defaultValue={4} />
                </AdvancedSettings>
                <LoraInput
                    name='lora'
                    type='ltx2'
                    sx={{ mt: 1 }}
                />
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

export const LTX23V2VTab = (
    <WFTab
        label='LTX-2.3 V2V'
        value='LTX-2.3 V2V'
        group='V2V'
        receivers={[{ name: 'video', acceptedTypes: ['videos'] }]}
        content={<Content />}
    />
);
