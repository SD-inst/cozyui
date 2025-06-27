import { Box } from '@mui/material';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYSize } from '../controls/HYSize';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <PromptInput name='prompt' />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize name='width' defaultValue={832} max={2048} />
                        <HYSize name='height' defaultValue={1280} max={2048} />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <SliderInput name='steps' defaultValue={20} min={1} max={40} />
                <GuidanceInput defaultValue={2.5} step={0.1} />
                <SamplerSelectInput name='sampler' defaultValue='dpmpp_2m' />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='flux' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult
                    sendTargetTab='Flux Kontext'
                    sendFields={[]}
                    sendLabel='send_back'
                />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const FluxKontextTab = (
    <WFTab
        label='Flux Kontext'
        value='Flux Kontext'
        group='I2I'
        content={<Content />}
    />
);
