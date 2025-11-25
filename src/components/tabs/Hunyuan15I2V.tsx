import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { HYLengthInput } from '../controls/HYLengthInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TeaCacheInput } from '../controls/TeaCacheInput';
import { UploadType } from '../controls/UploadType';
import { VideoImageOverride } from '../controls/VideoImageOverride';
import { VideoImageResult } from '../controls/VideoImageResult';
import { VideoInterpolationSlider } from '../controls/VideoInterpolationSlider';
import { VirtualVRAMSliderInput } from '../controls/VirtualVRAMSliderInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' type={UploadType.IMAGE} />
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' />
                <SliderInput
                    name='size'
                    label='size_mp'
                    defaultValue={0.4}
                    min={0.1}
                    max={2}
                    step={0.1}
                />
                <HYLengthInput defaultValue={121} max={241} />
                <SliderInput name='steps' defaultValue={50} min={1} max={50} />
                <CFGInput defaultValue={6} />
                <FlowShiftInput defaultValue={7} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='hunyuan'
                        extraFilter={(v) =>
                            v.includes('hunyuanvideo1.5') && v.includes('_i2v_')
                        }
                        defaultValue={
                            'hyvid/hunyuanvideo1.5_720p_i2v_fp16.safetensors'
                        }
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='euler' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <VirtualVRAMSliderInput name='virtual_vram' />
                    <TeaCacheInput
                        defaultThreshold={0.1}
                        defaultStart={0.1}
                        defaultEnd={0.95}
                    />
                    <VideoInterpolationSlider />
                    <CompileModelToggle />
                </AdvancedSettings>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
                <VideoImageOverride />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoImageResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const Hunyan15I2VTab = (
    <WFTab
        label='Hunyuan 1.5'
        value='Hunyuan 1.5 I2V'
        group='I2V'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
