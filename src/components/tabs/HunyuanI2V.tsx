import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { mergeType } from '../../api/mergeType';
import { useTranslate } from '../../i18n/I18nContext';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { ClipSelectInput } from '../controls/ClipSelectInput';
import { DescribeButton } from '../controls/DescribeButton';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYLengthInput } from '../controls/HYLengthInput';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LLMSelectInput } from '../controls/LLMSelectInput';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SendResultButton } from '../controls/SendResultButton';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { UpscaleToggle } from '../controls/UpscaleToggle';
import { VideoResult } from '../controls/VideoResult';
import { VirtualVRAMSliderInput } from '../controls/VirtualVRAMSliderInput';
import { WaveSpeedInput } from '../controls/WaveSpeedInput';
import { WFTab } from '../WFTab';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { HYModelSelectInput } from '../controls/HYModelSelectInput';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <TextInput
                    name='suffix'
                    defaultValue=''
                    sx={{ display: 'none' }}
                />
                <LLMSelectInput name='llm' />
                <DescribeButton />
                <PromptInput name='prompt' sx={{ mb: 3 }} />
                <HYSize name='size' defaultValue={544} />
                <HYLengthInput />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <GuidanceInput defaultValue={10} />
                <FlowShiftInput defaultValue={10} />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <HYModelSelectInput name='model' />
                        <ClipSelectInput name='clip_model' />
                        <SamplerSelectInput name='sampler' />
                        <SchedulerSelectInput name='scheduler' />
                        <SliderInput
                            name='aug_strength'
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={0}
                        />
                        <SliderInput
                            name='latent_strength'
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={1}
                        />
                        <WaveSpeedInput />
                        <VirtualVRAMSliderInput name='virtual_vram' />
                        <UpscaleToggle name='allow_upscale' />
                        <CompileModelToggle />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput
                    name='lora'
                    type='hunyuan'
                    sx={{ mb: 2 }}
                    append={[
                        {
                            id: 'comfy/img2vid544p.safetensors',
                            label: 'img2vid',
                            strength: 1,
                            merge: mergeType.FULL,
                        },
                    ]}
                />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoResult />
                <ResultOverrideContextProvider value={{ index: 1 }}>
                    <SendResultButton
                        targetTab='Hunyuan Upscale'
                        fields={['prompt', 'model', 'lora']}
                    />
                </ResultOverrideContextProvider>
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const HunyanI2VTab = (
    <WFTab
        label='Hunyuan I2V Native'
        value='Hunyuan I2V'
        group='I2V'
        receivers={['image']}
        content={<Content />}
    />
);
