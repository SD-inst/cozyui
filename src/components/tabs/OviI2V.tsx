import { useWatch } from 'react-hook-form';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { KJCompileModelToggle } from '../controls/KJCompileModelToggle';
import { KJWanBlockSwapInput } from '../controls/KJWanBlockSwapInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { ToggleInput } from '../controls/ToggleInput';
import { VideoInterpolationSlider } from '../controls/VideoInterpolationSlider';
import { VideoResult } from '../controls/VideoResult';
import { WanSampler } from '../controls/WanSampler';
import { WFTab } from '../WFTab';
import { KJEasyCacheInput } from '../controls/KJEasyCacheInput';
import { OviPromptInput } from '../controls/OviPromptInput';
import { OviLengthInput } from '../controls/OviLengthInput';
import { OviVersionInput } from '../controls/OviVersionInput';

const Content = () => {
    const mergeLoras = useWatch({ name: 'merge_loras' });
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <OviPromptInput name='prompt' sx={{ mb: 2 }} />
                <SliderInput
                    name='size'
                    label='size_mp'
                    defaultValue={0.6}
                    min={0.1}
                    max={2}
                    step={0.1}
                />
                <SliderInput name='steps' defaultValue={30} min={1} max={50} />
                <OviLengthInput />
                <AdvancedSettings>
                    <OviVersionInput />
                    <WanSampler name='sampler' />
                    <CFGInput defaultValue={4} />
                    <CFGInput defaultValue={4} name='audio_cfg' />
                    <FlowShiftInput defaultValue={5} />
                    <PromptInput
                        name='neg_prompt'
                        sx={{ mb: 3 }}
                        defaultValue='过曝，静态，细节模糊不清，字幕，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走'
                    />
                    <PromptInput name='audio_neg_prompt' sx={{ mb: 3 }} />
                    <KJEasyCacheInput />
                    <KJWanBlockSwapInput name='block_swap' />
                    <VideoInterpolationSlider />
                    <ToggleInput name='merge_loras' />
                </AdvancedSettings>
                <LoraInput
                    name='lora'
                    type='wan'
                    overrideInputs={
                        mergeLoras ? { merge_loras: true } : undefined
                    }
                    sx={{ mt: 1 }}
                />
                <KJCompileModelToggle classType='WanVideoTorchCompileSettings' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <VideoResult fps={32} />
            </GridRight>
            <GridBottom>
                <GenerateButton requiredControls={['image']} />
            </GridBottom>
        </Layout>
    );
};

export const OviI2VTab = (
    <WFTab
        label='Ovi'
        value='Ovi I2V'
        group='I2V'
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
