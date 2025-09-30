import { useEventCallback } from '@mui/material';
import { controlType } from '../../redux/config';
import { AdvancedSettings } from '../controls/AdvancedSettings';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { FileUpload } from '../controls/FileUpload';
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
import { TeaCacheInput } from '../controls/TeaCacheInput';
import { WFTab } from '../WFTab';

const Content = () => {
    const handler = useEventCallback(
        (api: any, value: string, control?: controlType) => {
            if (!value || !control || !control.node_id || !control.connect) {
                return;
            }
            (control.connect as string[][]).forEach(
                (n) => (api[n[0]].inputs[n[1]] = [control.node_id, 0])
            );
        }
    );
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <FileUpload name='second_image' extraHandler={handler} />
                <FileUpload name='third_image' extraHandler={handler} />
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' defaultValue='' />
                <SliderInput
                    name='size'
                    label='size_mp'
                    defaultValue={1}
                    min={0.1}
                    max={4}
                    step={0.1}
                />
                <SliderInput name='steps' defaultValue={20} min={1} max={40} />
                <CFGInput defaultValue={4} max={10} />
                <AdvancedSettings>
                    <FlowShiftInput defaultValue={3.1} step={0.1} />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='res_multistep'
                    />
                    <SchedulerSelectInput
                        name='scheduler'
                        defaultValue='simple'
                    />
                    <ModelSelectAutocomplete
                        name='model'
                        type='qwen'
                        extraFilter={(v) => v.includes('_edit_')}
                        defaultValue='qwen/qwen_image_edit_2509_fp8_e4m3fn.safetensors'
                        sx={{ mb: 2, mt: 2 }}
                    />
                    <TeaCacheInput />
                </AdvancedSettings>
                <LoraInput name='lora' type='qwen' />
                <CompileModelToggle />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult
                    sendTargetTab='Qwen Image Edit'
                    sendFields={[]}
                    sendLabel='send_back'
                />
            </GridRight>
            <GridBottom>
                <GenerateButton />
            </GridBottom>
        </Layout>
    );
};

export const QwenImageEditTab = (
    <WFTab
        label='Qwen Image Edit'
        value='Qwen Image Edit'
        group='I2I'
        receivers={[
            { name: 'image', acceptedTypes: 'images', weight: 90 },
            { name: 'second_image', acceptedTypes: 'images', weight: 89 },
            { name: 'third_image', acceptedTypes: 'images', weight: 88 },
        ]}
        content={<Content />}
    />
);
