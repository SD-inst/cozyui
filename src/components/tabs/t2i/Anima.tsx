import { ChatComponent } from '../../chat/ChatComponent';
import { animaSystemPrompt } from '../../chat/prompts/anima';
import { AdvancedSettings } from '../../controls/AdvancedSettings';
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
                <ChatComponent systemPrompt={animaSystemPrompt} />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={30} min={1} max={40} />
                <AdvancedSettings>
                    <PromptInput
                        name='neg_prompt'
                        defaultValue='worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia'
                    />
                    <CFGInput defaultValue={4} step={0.1} sx={{ mb: 2 }} />
                    <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <ModelSelectAutocomplete
                        name='model'
                        type='anima'
                        defaultValue='anima/anima-preview.safetensors'
                        sx={{ mb: 2 }}
                    />
                </AdvancedSettings>
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={16}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='anima' />
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

export const AnimaTab = (
    <WFTab
        label='Anima'
        value='Anima'
        group='T2I'
        receivers={[{ name: 'i2i', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
