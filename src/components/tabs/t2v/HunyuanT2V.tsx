import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { ClipSelectInput } from '../../controls/ClipSelectInput';
import { CompileModelToggle } from '../../controls/CompileModelToggle';
import { DoublePromptInput } from '../../controls/DoublePromptInput';
import { FlowShiftInput } from '../../controls/FlowShiftInput';
import { GenerateButton } from '../../controls/GenerateButton';
import { GuidanceInput } from '../../controls/GuidanceInput';
import { HYLengthInput } from '../../controls/hyv/HYLengthInput';
import { HYNAG } from '../../controls/hyv/HYNAG';
import { HYRiflexInput } from '../../controls/hyv/HYRiflexInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TeaCacheInput } from '../../controls/TeaCacheInput';
import { VideoImageOverride } from '../../controls/VideoImageOverride';
import { VideoImageResult } from '../../controls/VideoImageResult';
import { VideoInterpolationSlider } from '../../controls/VideoInterpolationSlider';
import { VirtualVRAMSliderInput } from '../../controls/VirtualVRAMSliderInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { WFTab } from '../../WFTab';
import { ChatComponent } from '../../chat/ChatComponent';
import { hunyuanT2VSystemPrompt } from '../../chat/prompts/hunyuanT2V';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <DoublePromptInput name='prompt' />
                <ChatComponent systemPrompt={hunyuanT2VSystemPrompt} />
                <WidthHeight defaultWidth={848} defaultHeight={480} />
                <HYLengthInput />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <GuidanceInput />
                <FlowShiftInput />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        type='hunyuan'
                        name='model'
                        sx={{ mb: 2 }}
                    />
                    <ClipSelectInput name='clip_model' />
                    <SamplerSelectInput name='sampler' />
                    <SchedulerSelectInput name='scheduler' />
                    <VirtualVRAMSliderInput name='virtual_vram' />
                    <TeaCacheInput />
                    <HYNAG name='nag' />
                    <HYRiflexInput name='riflex' />
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
                <VideoImageResult
                    sendTargetTab='Hunyuan Upscale'
                    sendFields={['prompt', 'model', 'lora']}
                />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const HunyanT2VTab = (
    <WFTab
        label='Hunyuan'
        value='Hunyuan T2V'
        group='T2V'
        content={<Content />}
    />
);
