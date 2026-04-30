import { AdvancedSettings } from '../../controls/AdvancedSettings';
import { CFGInput } from '../../controls/CFGInput';
import { FlowShiftInput } from '../../controls/FlowShiftInput';
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
import { SendBackToI2IButton } from '../../controls/SendBackToI2I';
import { SliderInput } from '../../controls/SliderInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { WFTab } from '../../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <I2IToggle name='i2i' />
                <WidthHeight maxWidth={4096} maxHeight={4096} />
                <SliderInput name='steps' defaultValue={10} min={1} max={40} />
                <AdvancedSettings>
                    <PromptInput name='neg_prompt' />
                    <CFGInput defaultValue={1} sx={{ mb: 2 }} />
                    <FlowShiftInput defaultValue={3} />
                    <SamplerSelectInput name='sampler' defaultValue='uni_pc' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <ModelSelectAutocomplete
                        name='model'
                        type='zimage'
                        defaultValue='zimage/z_image_turbo_bf16.safetensors'
                        sx={{ mb: 2 }}
                    />
                </AdvancedSettings>
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={16}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='zimage' sx={{ mb: 2 }} />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult />
                <SendBackToI2IButton />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const ZImageTab = (
    <WFTab
        label='Z-Image'
        value='Z-Image'
        group='T2I'
        receivers={[{ name: 'i2i', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
