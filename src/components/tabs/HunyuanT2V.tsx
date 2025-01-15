import { Mark } from '@mui/material/Slider/useSlider.types';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { TextInput } from '../controls/TextInput';
import { VideoResult } from '../controls/VideoResult';
import { WFTab } from '../WFTab';
import { Box, SliderProps } from '@mui/material';
import { SwapButton } from '../controls/SwapButton';

const HYSize = ({ ...props }: SliderProps) => {
    return <SliderInput min={128} max={720} step={16} {...props} />;
};

const Content = () => (
    <>
        <TextInput name='prompt' multiline />
        <Box display='flex' flexDirection='row' width='100%'>
            <Box display='flex' flexDirection='column' flex={1}>
                <HYSize name='width' defaultValue={512} />
                <HYSize name='height' defaultValue={320} />
            </Box>
            <Box display='flex' alignItems='center'>
                <SwapButton names={['width', 'height']} sx={{ mt: 3 }} />
            </Box>
        </Box>
        <SliderInput
            name='length'
            defaultValue={85}
            min={5}
            max={257}
            marks={(() => {
                const result: Mark[] = [];
                for (let i = 1; i <= 64; i++) {
                    result.push({ value: i * 4 + 1 });
                }
                return result;
            })()}
            step={null}
            track={false}
        />
        <SliderInput name='steps' defaultValue={7} min={1} max={30} />
        <SeedInput name='seed' />
        <VideoResult />
    </>
);

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
