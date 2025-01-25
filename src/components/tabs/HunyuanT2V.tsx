import { Box } from '@mui/material';
import { useState } from 'react';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { LoraInput } from '../controls/LoraInput';
import { SeedInput } from '../controls/SeedInput';
import { SelectInput } from '../controls/SelectInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { TextInput } from '../controls/TextInput';
import { UpscaleToggle } from '../controls/UpscaleToggle';
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
    const [upscaledVideo, setUpscaledVideo] = useState<React.JSX.Element>();
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' multiline sx={{ mb: 3 }} />
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
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
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
                <LoraInput name='lora' filter='/hunyuan/' />
                <UpscaleToggle
                    name='upscale'
                    setUpscaledVideo={setUpscaledVideo}
                    image_id='4'
                    fps={48}
                />
            </GridLeft>
            <GridRight>
                <VideoResult />
                {upscaledVideo}
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
