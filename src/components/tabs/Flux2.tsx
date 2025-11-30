import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { ReferenceLatentInput } from '../controls/ReferenceLatentInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <ReferenceLatentInput name='reference_images' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={20} min={1} max={40} />
                <GuidanceInput defaultValue={4} step={0.1} />
                <SamplerSelectInput name='sampler' defaultValue='uni_pc_bh2' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <ModelSelectAutocomplete
                    name='model'
                    type='flux2'
                    sx={{ mb: 2 }}
                    defaultValue={'flux2/flux2_dev_fp8mixed.safetensors'}
                />
                <LoraInput name='lora' type='flux' />
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

export const Flux2Tab = (
    <WFTab label='Flux 2' value='Flux 2' group='T2I' content={<Content />} />
);
