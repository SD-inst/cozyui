import { useWatch } from 'react-hook-form';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    const cfg = useWatch({ name: 'cfg' });
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={28} min={1} max={50} />
                <FlowShiftInput defaultValue={6} />
                <CFGInput defaultValue={1} max={5} />
                <PromptInput
                    name='neg_prompt'
                    sx={{ display: cfg > 1 ? 'block' : 'none' }}
                />
                <SamplerSelectInput name='sampler' defaultValue='dpmpp_2m' />
                <SchedulerSelectInput name='scheduler' defaultValue='beta' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='hidream' />
                <CompileModelToggle />
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
    <WFTab label='HiDream' value='HiDream' group='T2I' content={<Content />} />
);
