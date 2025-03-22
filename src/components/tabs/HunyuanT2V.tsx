import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
import { ClipSelectInput } from '../controls/ClipSelectInput';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYModelSelectInput } from '../controls/HYModelSelectInput';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SendToUpscaleButton } from '../controls/SendToUpscaleButton';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { UpscaleToggle } from '../controls/UpscaleToggle';
import { VideoResult } from '../controls/VideoResult';
import { VirtualVRAMSliderInput } from '../controls/VirtualVRAMSliderInput';
import { WaveSpeedInput } from '../controls/WaveSpeedInput';
import { WFTab } from '../WFTab';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize name='width' defaultValue={512} />
                        <HYSize name='height' defaultValue={320} />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <LengthInput
                    min={5}
                    max={201}
                    step={4}
                    fps={24}
                    name='length'
                    defaultValue={85}
                />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <GuidanceInput />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <HYModelSelectInput name='model' />
                        <ClipSelectInput name='clip_model' />
                        <SamplerSelectInput name='sampler' />
                        <SchedulerSelectInput name='scheduler' />
                        <FlowShiftInput />
                        <VirtualVRAMSliderInput name='virtual_vram' />
                        <WaveSpeedInput />
                        <UpscaleToggle name='allow_upscale' />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoResult />
                <ResultOverrideContextProvider value={{ index: 1 }}>
                    <SendToUpscaleButton />
                </ResultOverrideContextProvider>
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const HunyanT2VTab = (
    <WFTab
        label='Hunyuan T2V Native'
        value='Hunyuan T2V'
        content={<Content />}
    />
);
