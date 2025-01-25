import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { Box } from '@mui/system';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
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
        text: 'FP8 (no lora support)',
        value: 'hyvid/mp_rank_00_model_states_fp8.pt',
        alsoSet: [
            {
                name: 'quantization',
                value: 'fp8_scaled',
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

const Content = () => (
    <Layout>
        <GridLeft>
            <Accordion sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    Kijai's implementation, see notes
                </AccordionSummary>
                <AccordionDetails>
                    Lora support is wonky, it unloads if the model isn't fully
                    reloaded (which happens if another workflow or service is
                    executed, or the lora set or weights are changed).
                    Hopefully, it will be fixed. It's about 15% faster and has
                    more quality improving hacks.
                </AccordionDetails>
            </Accordion>
            <TextInput name='prompt' multiline />
            <SelectInput
                name='model'
                defaultValue='hyvid/hunyuan_video_FastVideo_720_fp8_e4m3fn.safetensors'
                choices={models}
            />
            <Box display='flex' flexDirection='row' width='100%' mt={2}>
                <Box display='flex' flexDirection='column' flex={1}>
                    <HYSize name='width' defaultValue={512} />
                    <HYSize name='height' defaultValue={320} />
                </Box>
                <Box display='flex' alignItems='center'>
                    <SwapButton names={['width', 'height']} sx={{ mt: 3 }} />
                </Box>
            </Box>
            <LengthInput
                min={5}
                max={257}
                step={4}
                fps={24}
                name='length'
                defaultValue={85}
            />
            <SliderInput name='steps' defaultValue={7} min={1} max={30} />
            <SliderInput
                name='flow_shift'
                label='flow shift'
                min={1}
                max={30}
                defaultValue={7}
            />
            <SliderInput
                name='guidance'
                label='guidance scale'
                min={1}
                max={20}
                defaultValue={7}
            />
            <SeedInput name='seed' defaultValue={1024} />
            <SliderInput
                name='enhance'
                label='Enhance-a-Video weight'
                min={0}
                max={8}
                defaultValue={4}
                step={0.1}
            />
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

export const HunyanT2VTabKJ = (
    <WFTab
        label='Hunyuan T2V Kijai'
        value='Hunyuan T2V KJ'
        content={<Content />}
    />
);
