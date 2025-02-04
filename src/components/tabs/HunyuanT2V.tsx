import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../GenerateButton';
import { WFTab } from '../WFTab';

const models = [
    {
        text: 'Original',
        value: 'hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors',
        alsoSet: [
            {
                name: 'quantization',
                value: 'fp8_e4m3fn',
            },
        ],
    },
    {
        text: 'Fast (lower quality, fewer steps)',
        value: 'hyvid/hunyuan_video_FastVideo_720_fp8_e4m3fn.safetensors',
        alsoSet: [
            {
                name: 'quantization',
                value: 'fp8_e4m3fn',
            },
        ],
    },
];

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 2 }} />
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
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        Advanced parameters
                    </AccordionSummary>
                    <AccordionDetails>
                        <SelectInput
                            name='model'
                            defaultValue='hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors'
                            choices={models}
                        />
                        <SamplerSelectInput name='sampler' />
                        <SchedulerSelectInput name='scheduler' />
                        <SliderInput
                            name='flow_shift'
                            label='flow shift'
                            min={1}
                            max={20}
                            defaultValue={7}
                        />
                        <SliderInput
                            name='guidance'
                            label='guidance scale'
                            min={1}
                            max={20}
                            defaultValue={7}
                        />
                        <SliderInput
                            min={0}
                            max={1}
                            step={0.01}
                            defaultValue={0.1}
                            name='wave_speed'
                            label='WaveSpeed cache'
                        />
                        <SliderInput
                            min={-1}
                            max={10}
                            step={1}
                            defaultValue={2}
                            name='wave_speed_maxhit'
                            label='WaveSpeed max hits'
                        />
                    </AccordionDetails>
                </Accordion>
                <SeedInput name='seed' defaultValue={1024} />
                <LoraInput name='lora' filter='/hunyuan/' />
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

export const HunyanT2VTab = (
    <WFTab
        label='Hunyuan T2V Stock'
        value='Hunyuan T2V'
        content={<Content />}
    />
);
