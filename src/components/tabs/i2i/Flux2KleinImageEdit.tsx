import { Box } from '@mui/material';
import { CFGInput } from '../../controls/CFGInput';
import { GenerateButton } from '../../controls/GenerateButton';
import { ImageResult } from '../../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PromptInput } from '../../controls/PromptInput';
import { ReferenceLatentInput } from '../../controls/ReferenceLatentInput';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { WFTab } from '../../WFTab';
import { useWatchForm } from '../../../hooks/useWatchForm';

type ReferenceType = {
    image: string;
    size: number;
    enabled: boolean;
    skip?: boolean;
}[];

const Content = () => {
    const images: ReferenceType = useWatchForm('reference_images');
    const hasRefs = !!images && images.some((i) => i.image && i.enabled && !i.skip);
    return (
        <Layout>
            <GridLeft>
                <ReferenceLatentInput
                    name='reference_images'
                    receiverFieldName='image'
                />
                <Box sx={hasRefs ? { display: 'none' } : undefined}>
                    <WidthHeight maxWidth={2048} maxHeight={2048} />
                </Box>
                <PromptInput name='prompt' sx={{ mt: 2 }} />
                <PromptInput name='neg_prompt' defaultValue='' />
                <SliderInput name='steps' defaultValue={8} min={1} max={40} />
                <CFGInput defaultValue={1} max={10} />
                <SamplerSelectInput name='sampler' defaultValue='euler' />
                <ModelSelectAutocomplete
                    name='model'
                    type='flux2_klein'
                    defaultValue='flux2_klein/flux-2-klein-9b-fp8.safetensors'
                    sx={{ mb: 2 }}
                />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='flux2_klein' sx={{ mb: 2 }} />
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

export const Flux2KleinImageEditTab = (
    <WFTab
        label='Flux 2 Klein'
        value='Flux 2 Klein'
        group='T2I'
        receivers={[{ name: 'reference_images', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
