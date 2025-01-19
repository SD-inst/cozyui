import { Box, SliderProps } from '@mui/material';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LengthInput } from '../controls/LengthSlider';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { GenerateButton } from '../GenerateButton';
import { WFTab } from '../WFTab';
import { LoraInput } from '../controls/LoraInput';
import { SelectInput } from '../controls/SelectInput';

const HYSize = ({ ...props }: SliderProps) => {
    return <SliderInput min={128} max={720} step={16} {...props} />;
};

const Content = () => (
    <Layout>
        <GridLeft>
            <TextInput name='prompt' multiline />
            <SelectInput
                name='model'
                defaultValue='hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors'
                choices={[
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
                        text: 'FP8 (doesn\'t work well with loras)',
                        value: 'hyvid/mp_rank_00_model_states_fp8.pt',
                        alsoSet: [
                            {
                                name: 'quantization',
                                value: 'fp8_scaled',
                            },
                        ],
                    },
                    {
                        text: 'Fast (needs >13 flow shift and guidance)',
                        value: 'hyvid/hunyuan_video_FastVideo_720_fp8_e4m3fn.safetensors',
                        alsoSet: [
                            {
                                name: 'quantization',
                                value: 'fp8_e4m3fn',
                            },
                        ],
                    },
                ]}
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
                fps={16}
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
                defaultValue={6}
            />
            <SeedInput name='seed' defaultValue={1024} />
            <LoraInput name='lora' />
        </GridLeft>
        <GridRight>
            <VideoResult />
        </GridRight>
        <GridBottom>
            <GenerateButton />
        </GridBottom>
    </Layout>
);

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
