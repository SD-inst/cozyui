import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { FileUpload } from '../controls/FileUpload';
import { UploadType } from '../controls/UploadType';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYModelSelectInput } from '../controls/HYModelSelectInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';
import { VirtualVRAMSliderInput } from '../controls/VirtualVRAMSliderInput';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' type={UploadType.BOTH} />
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
                <SliderInput
                    name='upscale'
                    defaultValue={2}
                    min={1}
                    max={3}
                    step={0.1}
                />
                <SliderInput name='steps' defaultValue={10} min={1} max={50} />
                <SliderInput
                    name='denoise'
                    defaultValue={0.3}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <GuidanceInput />
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <HYModelSelectInput name='model' />
                        <SamplerSelectInput name='sampler' />
                        <SchedulerSelectInput name='scheduler' />
                        <FlowShiftInput />
                        <VirtualVRAMSliderInput name='virtual_vram' />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' type='hunyuan' />
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

export const HunyanUpscale = (
    <WFTab
        label='Hunyuan Upscale'
        value='Hunyuan Upscale'
        content={<Content />}
    />
);
