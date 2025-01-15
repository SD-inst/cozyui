import { Box, Grid2, SliderProps } from '@mui/material';
import { Mark } from '@mui/material/Slider/useSlider.types';
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
    <Grid2 container width='100%' spacing={2}>
        <Grid2 size={{ xs: 12, md: 8 }}>
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
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}>
            <VideoResult />
        </Grid2>
        <Grid2
            justifyContent='center'
            size={{ xs: 12, md: 8 }}
            container
            spacing={2}
        >
            <Grid2>
                <GenerateButton />
            </Grid2>
        </Grid2>
    </Grid2>
);

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
