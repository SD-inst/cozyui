import { Box } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { mergeType } from '../../api/mergeType';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
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
import { SwapButton } from '../controls/SwapButton';
import { ToggleInput } from '../controls/ToggleInput';
import { VideoResult } from '../controls/VideoResult';
import { WanLengthInput } from '../controls/WanLengthInput';
import { WanRiflexToggle } from '../controls/WanRiflexToggle';
import { WFTab } from '../WFTab';
import { WanNAG } from '../controls/WanNAG';
import { WanSampler } from '../controls/WanSampler';
import { KJWanBlockSwapInput } from '../controls/KJWanBlockSwapInput';

const Content = () => {
    const sflora = useWatch({ name: 'self_forcing_lora', defaultValue: true });
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' sx={{ mb: 3 }} />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize name='width' defaultValue={720} />
                        <HYSize name='height' defaultValue={480} />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <WanLengthInput />
                <SliderInput name='steps' defaultValue={10} min={1} max={50} />
                <FlowShiftInput defaultValue={8} />
                <AdvancedSettings>
                    <ModelSelectAutocomplete
                        name='model'
                        type='wan'
                        extraFilter={(m) => m.includes('T2V')}
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
                    <KJWanBlockSwapInput name='block_swap' />
                </AdvancedSettings>
                <LoraInput
                    name='lora'
                    type='wan'
                    append={
                        sflora
                            ? [
                                  {
                                      id: 'wan/Wan21_T2V_14B_lightx2v_cfg_step_distill_lora_rank32.safetensors',
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

export const WanT2VTab = (
    <WFTab label='Wan T2V' value='Wan T2V' group='T2V' content={<Content />} />
);
