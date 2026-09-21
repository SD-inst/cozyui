import { mergeType } from '../../../api/mergeType';
import { useWatch } from 'react-hook-form';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { CFGInput } from '../../controls/CFGInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LengthInput } from '../../controls/LengthSlider';
import { LTX2NoAudioToggle } from '../../controls/ltx2/LTX2NoAudioToggle';
import { LoraInput } from '../../controls/LoraInput';
import { LTX23UpsampleControl } from '../../controls/ltx2/LTX23UpsampleControl';
import { LTX2KeyframesControl } from '../../controls/ltx2/LTX2KeyframesControl';
import { LTX2ReferenceAudioControl } from '../../controls/ltx2/LTX2ReferenceAudioControl';
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
import { ltx23I2VSystemPrompt } from '../../chat/prompts/ltx23I2V';
import { LTXKeepSizeToggle } from '../../controls/ltx2/LTXKeepSizeToggle';
import { LTX2LoopControl } from '../../controls/ltx2/LTX2LoopControl';

const Content = () => {
    const fps = useWatch({ name: 'fps', defaultValue: 24 });
    const handler = useLTXUploadHandler();
    const distillStrength = useWatch({ name: 'distill_strength', defaultValue: 0.5 });
    const distillAppend = distillStrength > 0
        ? [{
            id: 'ltx2/ltx-2.3-22b-distilled-1.1_lora-dynamic_fro09_avg_rank_111_bf16.safetensors',
            label: 'ltx-2.3-22b-distilled-1.1_lora-dynamic_fro09_avg_rank_111_bf16',
            strength: distillStrength,
            merge: mergeType.DOUBLE,
        }]
        : undefined;
    return (
        <Layout>
            <GridLeft>
                <FileUpload
                    name='image'
                    type={UploadType.IMAGEORVIDEO}
                    extraHandler={handler}
                />
                <LTX2NoAudioToggle name='no_audio' defaultValue={false} />
                <SliderInput
                    name='strength'
                    defaultValue={1}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <LTX2KeyframesControl />
                <LTX2ReferenceAudioControl />
                <TextInput name='prompt' multiline />
                <ChatComponent
                    systemPrompt={ltx23I2VSystemPrompt}
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
                <LTXKeepSizeToggle name='keep_size' />
                <LengthInput
                    name='length'
                    min={9}
                    max={601}
                    step={8}
                    defaultValue={129}
                    fps={fps}
                />
                <SliderInput name='steps' defaultValue={20} min={5} max={50} />
                <SliderInput name='distill_strength' defaultValue={0.5} min={0} max={1} step={0.05} />
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
                    <SliderInput
                        name='compression'
                        defaultValue={33}
                        min={1}
                        max={50}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='euler' />
                    <LTX23UpsampleControl i2v />
                    <LTX2LoopControl name='loop' />
                </AdvancedSettings>
                <LoraInput name='lora' type='ltx2' sx={{ mt: 1 }} append={distillAppend} />
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

export const LTX23I2VTab = (
    <WFTab
        label='LTX-2.3'
        value='LTX-2.3 I2V'
        group='I2V'
        receivers={[
            { name: 'image', acceptedTypes: ['images', 'gifs'] },
            { name: 'keyframes', acceptedTypes: ['images', 'gifs'] },
            { name: 'reference_audio', acceptedTypes: 'audio' },
        ]}
        content={<Content />}
    />
);
