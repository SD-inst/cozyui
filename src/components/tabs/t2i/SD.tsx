import { ChatComponent } from '../../chat/ChatComponent';
import { sdSystemPrompt } from '../../chat/prompts/sd';
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
                <ChatComponent systemPrompt={sdSystemPrompt} />
                <PromptInput name='neg_prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={30} min={1} max={40} />
                <CFGInput defaultValue={5} step={0.1} />
                <SamplerSelectInput
                    name='sampler'
                    defaultValue='dpmpp_3m_sde'
                />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={16}
                    defaultValue={1}
                />
                <ModelSelectAutocomplete
                    component='CheckpointLoaderSimple'
                    field='ckpt_name'
                    name='model'
                    type='sd'
                    sx={{ mb: 2 }}
                />
                <LoraInput name='lora' type='sd' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult
                    sendTargetTab='SD Upscale'
                    sendFields={['prompt', 'neg_prompt', 'model', 'lora']}
                />
                <SendBackToI2IButton />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls={['model']} />
            </GridBottom>
        </Layout>
    );
};

export const SDTab = (
    <WFTab
        label='SD'
        value='SD'
        group='T2I'
        receivers={[{ name: 'i2i', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
