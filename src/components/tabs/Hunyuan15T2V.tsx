import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
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
import { VideoImageOverride } from '../controls/VideoImageOverride';
import { VideoImageResult } from '../controls/VideoImageResult';
import { VideoInterpolationSlider } from '../controls/VideoInterpolationSlider';
import { VirtualVRAMSliderInput } from '../controls/VirtualVRAMSliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' />
                <WidthHeight defaultWidth={848} defaultHeight={480} />
                <HYLengthInput defaultValue={121} max={241} />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <CFGInput defaultValue={3} />
                <FlowShiftInput defaultValue={9} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='hunyuan'
                        extraFilter={(v) =>
                            v.includes('hunyuanvideo1.5') && v.includes('_t2v_')
                        }
                        defaultValue={
                            'hyvid/hunyuanvideo1.5_720p_t2v_fp16.safetensors'
                        }
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput name='sampler' defaultValue='uni_pc' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <VirtualVRAMSliderInput name='virtual_vram' />
                    <TeaCacheInput />
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

export const Hunyan15T2VTab = (
    <WFTab
        label='Hunyuan 1.5'
        value='Hunyuan15 T2V'
        group='T2V'
        content={<Content />}
    />
);
