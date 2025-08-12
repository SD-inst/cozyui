import { Box } from '@mui/material';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { GenerateButton } from '../controls/GenerateButton';
import { HYSize } from '../controls/HYSize';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { ModelSelectAutocomplete } from '../controls/ModelSelectAutocomplete';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { WFTab } from '../WFTab';
import { FlowShiftInput } from '../controls/FlowShiftInput';

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' defaultValue='' />
                <Box display='flex' flexDirection='row' width='100%'>
                    <Box display='flex' flexDirection='column' flex={1}>
                        <HYSize name='width' defaultValue={832} max={2048} />
                        <HYSize name='height' defaultValue={1280} max={2048} />
                    </Box>
                    <Box display='flex' alignItems='center'>
                        <SwapButton
                            names={['width', 'height']}
                            sx={{ mt: 3 }}
                        />
                    </Box>
                </Box>
                <SliderInput name='steps' defaultValue={20} min={1} max={50} />
                <CFGInput defaultValue={4} max={10} />
                <FlowShiftInput defaultValue={3.1} step={0.1} />
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
