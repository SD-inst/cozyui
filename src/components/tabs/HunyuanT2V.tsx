import { Box, Grid2 as Grid, SliderProps } from '@mui/material';
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

const HYLength = ({ ...props }: { label?: string } & SliderProps) => {
    return (
        <SliderInput
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
            {...props}
        />
    );
};

const Content = () => (
    <Grid container width='100%' spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
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
            <HYLength
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
            <SeedInput name='seed' />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
            <VideoResult />
        </Grid>
        <Grid
            justifyContent='center'
            size={{ xs: 12, md: 8 }}
            container
            spacing={2}
        >
            <Grid>
                <GenerateButton />
            </Grid>
        </Grid>
    </Grid>
);

export const HunyanT2VTab = (
    <WFTab label='Hunyuan T2V' value='Hunyuan T2V' content={<Content />} />
);
