import { useWatch } from 'react-hook-form';
import { mergeType } from '../../api/mergeType';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { HYSize } from '../controls/HYSize';
import { KJCompileModelToggle } from '../controls/KJCompileModelToggle';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { ToggleInput } from '../controls/ToggleInput';
import { VideoResult } from '../controls/VideoResult';
import { WanEndImage } from '../controls/WanEndImage';
import { WanFLF2V } from '../controls/WanFLF2V';
import { WanLengthInput } from '../controls/WanLengthInput';
import { WanRiflexToggle } from '../controls/WanRiflexToggle';
import { WFTab } from '../WFTab';
import { WanNAG } from '../controls/WanNAG';
import { WanSampler } from '../controls/WanSampler';
import { KJWanBlockSwapInput } from '../controls/KJWanBlockSwapInput';
import { KJWanLoopInput } from '../controls/KJWanLoopInput';
import { VideoInterpolationSlider } from '../controls/VideoInterpolationSlider';
import { KJEasyCacheInput } from '../controls/KJEasyCacheInput';

const Content = () => {
    const sflora = useWatch({ name: 'self_forcing_lora', defaultValue: true });
    const mergeLoras = useWatch({ name: 'merge_loras' });
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <WanEndImage name='use_end_image' />
                <PromptInput name='prompt' sx={{ mb: 3 }} />
                <HYSize name='size' defaultValue={720} />
                <WanLengthInput />
                <SliderInput name='steps' defaultValue={10} min={1} max={50} />
                <FlowShiftInput defaultValue={8} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='wan'
                        extraFilter={(m) =>
                            m.includes('I2V') || m.includes('FLF2V')
                        }
                        previews={false}
                    />
                    <WanSampler name='sampler' />
                    <ToggleInput name='self_forcing_lora' defaultValue={true} />
                    <WanRiflexToggle name='riflex' />
                    <CFGInput defaultValue={1} />
                    <PromptInput
                        name='neg_prompt'
                        sx={{ mb: 3 }}
                        defaultValue='过曝，静态，细节模糊不清，字幕，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走'
                    />
                    <WanNAG name='nag' />
                    <KJEasyCacheInput defaultThreshold={0} defaultStart={6} />
                    <KJWanBlockSwapInput />
                    <KJWanLoopInput name='loop' sx={{ mt: 2, mb: 2 }} />
                    <SliderInput
                        name='aug_strength'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={0}
                    />
                    <SliderInput
                        name='start_strength'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={1}
                    />
                    <SliderInput
                        name='end_strength'
                        min={0}
                        max={1}
                        step={0.01}
                        defaultValue={1}
                    />
                    <VideoInterpolationSlider />
                    <ToggleInput name='merge_loras' />
                </AdvancedSettings>
                <LoraInput
                    name='lora'
                    type='wan'
                    append={
                        sflora
                            ? [
                                  {
                                      id: 'wan/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors',
                                      label: 'Self-forcing lora',
                                      merge: mergeType.FULL,
                                      strength: 1,
                                  },
                              ]
                            : undefined
                    }
                    overrideInputs={
                        mergeLoras ? { merge_loras: true } : undefined
                    }
                    sx={{ mt: 1 }}
                />
                <KJCompileModelToggle classType='WanVideoTorchCompileSettings' />
                <SeedInput name='seed' defaultValue={1024} />
                <WanFLF2V name='flf2v' />
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

export const WanI2VTab = (
    <WFTab
        label='Wan'
        value='Wan I2V'
        group='I2V'
        receivers={[
            { name: 'image', acceptedTypes: 'images', weight: 100 },
            { name: 'image_end', acceptedTypes: 'images', weight: 99 },
        ]}
        content={<Content />}
    />
);
