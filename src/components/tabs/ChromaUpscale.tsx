import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { GenerateButton } from '../controls/GenerateButton';
import { HYSize } from '../controls/HYSize';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { WFTab } from '../WFTab';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { LoraInput } from '../controls/LoraInput';
import { FileUpload } from '../controls/FileUpload';
import { ExpandMore } from '@mui/icons-material';
import { useTranslate } from '../../i18n/I18nContext';

const Content = () => {
    const tr = useTranslate();
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <PromptInput name='prompt' />
                <PromptInput
                    name='neg_prompt'
                    defaultValue='low quality, jpeg, 3d, realistic'
                />
                <SliderInput
                    name='upscale'
                    min={1}
                    max={5}
                    step={0.1}
                    defaultValue={2}
                />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize
                            name='tile_width'
                            defaultValue={1024}
                            max={2048}
                        />
                        <HYSize
                            name='tile_height'
                            defaultValue={1280}
                            max={2048}
                        />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['tile_width', 'tile_height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <SliderInput name='steps' defaultValue={10} min={1} max={50} />
                <SliderInput
                    name='denoise'
                    defaultValue={0.3}
                    min={0}
                    max={1}
                    step={0.01}
                />
                <Accordion sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        {tr('controls.advanced_parameters')}
                    </AccordionSummary>
                    <AccordionDetails>
                        <CFGInput defaultValue={3} max={10} />
                        <SliderInput
                            name='rescale_cfg'
                            defaultValue={0}
                            min={0}
                            max={1}
                            step={0.01}
                        />
                        <SliderInput
                            name='padding'
                            min={0}
                            max={256}
                            step={1}
                            defaultValue={64}
                        />
                        <SliderInput
                            name='mask_blur'
                            min={0}
                            max={128}
                            step={1}
                            defaultValue={8}
                        />
                        <SamplerSelectInput
                            name='sampler'
                            defaultValue='res_multistep'
                        />
                        <SchedulerSelectInput
                            name='scheduler'
                            defaultValue='simple'
                        />
                        <ModelSelectAutocomplete
                            name='upscale_model'
                            type=''
                            component='UpscaleModelLoader'
                            field='model_name'
                            previews={false}
                            sx={{ mt: 2 }}
                        />
                    </AccordionDetails>
                </Accordion>
                <ModelSelectAutocomplete name='model' type='chroma' />
                <LoraInput name='lora' type='flux' sx={{ mt: 2 }} />
                <CompileModelToggle />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const ChromaUpscaleTab = (
    <WFTab
        label='Chroma Upscale'
        value='Chroma Upscale'
        group='Upscale'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
