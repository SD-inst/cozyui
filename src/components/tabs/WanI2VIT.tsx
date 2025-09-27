import { useWatch } from 'react-hook-form';
import { mergeType } from '../../api/mergeType';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { HYSize } from '../controls/HYSize';
import { KJCompileModelToggle } from '../controls/KJCompileModelToggle';
import { KJWanBlockSwapInput } from '../controls/KJWanBlockSwapInput';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { ToggleInput } from '../controls/ToggleInput';
import { UploadType } from '../controls/UploadType';
import { VideoResult } from '../controls/VideoResult';
import { WanSampler } from '../controls/WanSampler';
import { WFTab } from '../WFTab';
import { VideoInterpolationSlider } from '../controls/VideoInterpolationSlider';

const Content = () => {
    const sflora = useWatch({ name: 'self_forcing_lora', defaultValue: true });
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <FileUpload name='audio' type={UploadType.AUDIO} />
                <PromptInput name='prompt' sx={{ mb: 3 }} />
                <HYSize name='size' defaultValue={720} />
                <SliderInput name='steps' defaultValue={8} min={1} max={50} />
                <SliderInput name='fps' min={8} max={30} defaultValue={25} />
                <FlowShiftInput defaultValue={11} />
                <SliderInput
                    name='audio_scale'
                    tooltip='audio_scale'
                    defaultValue={1}
                    min={1}
                    max={10}
                    step={0.01}
                />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='wan'
                        extraFilter={(m) => m.includes('I2V')}
                        previews={false}
                        sx={{ mb: 2 }}
                    />
                    <ModelSelectAutocomplete
                        name='model_it'
                        type='infinitetalk'
                        previews={false}
                        sx={{ mb: 2 }}
                    />
                    <WanSampler name='sampler' defaultValue='res_multistep' />
                    <ToggleInput name='self_forcing_lora' defaultValue={true} />
                    <CFGInput defaultValue={1} />
                    <CFGInput
                        defaultValue={1}
                        name='audio_cfg_scale'
                        tooltip='audio_cfg_scale'
                    />
                    <PromptInput
                        name='neg_prompt'
                        sx={{ mb: 3 }}
                        defaultValue='过曝，静态，细节模糊不清，字幕，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走'
                    />
                    <KJWanBlockSwapInput name='block_swap' mb={2} />
                    <VideoInterpolationSlider />
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
                <VideoResult rate_override={4} fps={16} />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const WanI2VITTab = (
    <WFTab
        label='Wan I2V InfiniteTalk'
        value='Wan I2V InfiniteTalk'
        group='I2V'
        receivers={[
            { name: 'image', acceptedTypes: 'images', weight: 100 },
            { name: 'audio', acceptedTypes: 'audio', weight: 99 },
        ]}
        content={<Content />}
    />
);
