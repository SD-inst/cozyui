import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { HYSize } from '../controls/HYSize';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { VideoResult } from '../controls/VideoResult';
import { WanLengthInput } from '../controls/WanLengthInput';
import { WFTab } from '../WFTab';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <PromptInput name='prompt' sx={{ mb: 3 }} />
                <HYSize name='size' defaultValue={720} />
                <WanLengthInput max={257} />
                <SliderInput
                    name='full_steps'
                    defaultValue={7}
                    min={1}
                    max={20}
                />
                <SliderInput
                    name='refine_steps'
                    defaultValue={5}
                    min={1}
                    max={20}
                />
                <FlowShiftInput defaultValue={8} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='wan'
                        extraFilter={(m) => m.includes('I2V')}
                        previews={false}
                        sx={{ mb: 2 }}
                    />
                    <PromptInput
                        name='neg_prompt'
                        sx={{ mb: 3 }}
                        defaultValue='过曝，静态，细节模糊不清，字幕，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走'
                    />
                    <CFGInput defaultValue={6} />
                    <SamplerSelectInput name='sampler' defaultValue='uni_pc' />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <SliderInput
                        name='max_full_steps'
                        defaultValue={20}
                        min={1}
                        max={50}
                    />
                </AdvancedSettings>
                <LoraInput name='lora' type='wan' sx={{ mt: 1 }} />
                <CompileModelToggle />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoResult rate_override={4} fps={16} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const WanI2V2STab = (
    <WFTab
        label='Wan I2V 2-stage'
        value='Wan I2V 2S'
        group='I2V'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
