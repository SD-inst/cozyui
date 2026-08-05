import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { MiniMaxH3ResolutionSelector } from '../../controls/MiniMaxH3ResolutionSelector';
import { VideoInterpolationSlider } from '../../controls/VideoInterpolationSlider';
import { MiniMaxH3SpectrumControls } from '../../controls/MiniMaxH3SpectrumControls';
import { MiniMaxH3SigmaShiftControls } from '../../controls/MiniMaxH3SigmaShiftControls';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { LoraInput } from '../../controls/LoraInput';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' sx={{ mb: 2 }} multiline />
                <MiniMaxH3ResolutionSelector
                    name='aspect_ratio'
                    defaultValue='16:9 (Widescreen)'
                />
                <SliderInput
                    name='megapixels'
                    label='size_mp'
                    defaultValue={0.4}
                    min={0.1}
                    max={2}
                    step={0.1}
                />
                <SliderInput
                    name='length'
                    label='length'
                    defaultValue={5}
                    min={1}
                    max={30}
                    step={0.1}
                />
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='minimax_h3'
                        component='UNETLoader'
                        field='unet_name'
                        sx={{ mb: 2 }}
                    />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='res_multistep'
                    />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <MiniMaxH3SigmaShiftControls />
                    <MiniMaxH3SpectrumControls />
                    <VideoInterpolationSlider />
                </AdvancedSettings>
                <LoraInput name='lora' type='minimax_h3' sx={{ mt: 1 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight>
                <VideoResult rate_override={4} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const MiniMaxH3T2VTab = (
    <WFTab
        label='MiniMax H3'
        value='MiniMax H3 T2V'
        group='T2V'
        content={<Content />}
    />
);
