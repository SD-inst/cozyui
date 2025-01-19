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

const HYSize = ({ ...props }: SliderProps) => {
    return <SliderInput min={128} max={720} step={16} {...props} />;
};

const Content = () => (
    <Layout>
        <GridLeft>
            <TextInput name='prompt' multiline />
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
