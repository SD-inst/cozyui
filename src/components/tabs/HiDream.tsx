import { Box } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { CFGInput } from '../controls/CFGInput';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { HYSize } from '../controls/HYSize';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { WFTab } from '../WFTab';

const Content = () => {
    const cfg = useWatch({ name: 'cfg' });
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize name='width' defaultValue={768} max={2048} />
                        <HYSize name='height' defaultValue={1344} max={2048} />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <SliderInput name='steps' defaultValue={28} min={1} max={50} />
                <FlowShiftInput defaultValue={6} />
                <CFGInput defaultValue={1} max={5} />
                <PromptInput
                    name='neg_prompt'
                    sx={{ display: cfg > 1 ? 'block' : 'none' }}
                />
                <SamplerSelectInput name='sampler' defaultValue='dpmpp_2m' />
                <SchedulerSelectInput name='scheduler' defaultValue='beta' />
                <SliderInput name='batch_size' min={1} max={9} defaultValue={1} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const HiDreamTab = (
    <WFTab label='HiDream' value='HiDream' content={<Content />} />
);
