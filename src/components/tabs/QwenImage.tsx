import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' defaultValue='' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
                <CFGInput defaultValue={4} max={10} />
                <FlowShiftInput defaultValue={2} step={0.1} />
                <SamplerSelectInput
                    name='sampler'
                    defaultValue='res_multistep'
                />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <ModelSelectAutocomplete
                    name='model'
                    type='qwen'
                    defaultValue='qwen/qwen_image_fp8_e4m3fn.safetensors'
                />
                <LoraInput name='lora' type='qwen' sx={{ mt: 2 }} />
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

export const QwenImageTab = (
    <WFTab
        label='Qwen Image'
        value='Qwen Image'
        group='T2I'
        content={<Content />}
    />
);
