import { CFGInput } from '../../controls/CFGInput';
import { GenerateButton } from '../../controls/GenerateButton';
import { I2IToggle } from '../../controls/I2IToggle';
import { ImageResult } from '../../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PromptInput } from '../../controls/PromptInput';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { WFTab } from '../../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <I2IToggle name='i2i' />
                <PromptInput name='neg_prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={10} min={1} max={40} />
                <CFGInput defaultValue={1} />
                <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <ModelSelectAutocomplete
                    name='model'
                    type='krea2'
                    sx={{ mb: 2 }}
                />
                <SliderInput name='batch_size' min={1} max={16} defaultValue={1} />
                <LoraInput name='lora' type='krea2' sx={{ mb: 2 }} />
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

export const Krea2Tab = (
    <WFTab
        label='Krea2'
        value='Krea2'
        group='T2I'
        receivers={[{ name: 'i2i', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
