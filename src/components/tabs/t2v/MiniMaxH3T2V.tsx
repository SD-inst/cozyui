import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { GenerateButton } from '../../controls/GenerateButton';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SelectInput } from '../../controls/SelectInput';
import { SliderInput } from '../../controls/SliderInput';
import { TextInput } from '../../controls/TextInput';
import { VideoResult } from '../../controls/VideoResult';
import { WFTab } from '../../WFTab';

const aspectRatioChoices = [
    '1:1 (Square)',
    '2:3 (Portrait Photo)',
    '3:2 (Photo)',
    '3:4 (Portrait Standard)',
    '4:3 (Standard)',
    '9:16 (Portrait Widescreen)',
    '16:9 (Widescreen)',
    '21:9 (Ultrawide)',
];

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <TextInput name='prompt' sx={{ mb: 2 }} multiline />
                <SelectInput
                    name='aspect_ratio'
                    defaultValue='16:9 (Widescreen)'
                    choices={aspectRatioChoices}
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
                    min={0.5}
                    max={30}
                    step={0.5}
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
                </AdvancedSettings>
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
};

export const MiniMaxH3T2VTab = (
    <WFTab
        label='MiniMax H3'
        value='MiniMax H3 T2V'
        group='T2V'
        content={<Content />}
    />
);
