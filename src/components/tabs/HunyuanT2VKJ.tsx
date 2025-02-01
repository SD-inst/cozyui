import { Box } from '@mui/system';
import { HYSize } from '../controls/HYSize';
import { KJSchedulerSelectInput } from '../controls/KJSchedulerSelectInput';
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
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { TeaCacheInput } from '../controls/TeaCacheInput';
import { EnhanceVideoInput } from '../controls/EnhanceVideoInput';
import { KJHYCFG } from '../controls/KJHYCFG';
import { BlockSwapInput } from '../controls/BlockSwapInput';
import { KJAttentionSelectInput } from '../controls/KJAttentionSelectInput';

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
            <TextInput name='prompt' multiline sx={{ mb: 2 }} />
            <Box display='flex' flexDirection='row' width='100%'>
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
                    <KJHYCFG name='neg_prompt' />
                    <KJSchedulerSelectInput name='sampler' />
                    <KJAttentionSelectInput name='attention' />
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
                    <EnhanceVideoInput
                        name='enhance_video'
                        label='Enhance-a-Video weight'
                    />
                    <TeaCacheInput name='tea_cache' defaultValue={0.2} />
                    <BlockSwapInput name='block_swap' />
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

export const HunyanT2VTabKJ = (
    <WFTab
        label='Hunyuan T2V Kijai'
        value='Hunyuan T2V KJ'
        content={<Content />}
    />
);
