import { Box, useEventCallback } from '@mui/material';
import { Workflow } from '../../../api/graph';
import { getFreeNodeId } from '../../../api/utils';
import { controlType } from '../../../redux/config';
import { useRegisterHandler } from '../../contexts/TabContext';
import { ArrayInput } from '../../controls/ArrayInput';
import { CFGInput } from '../../controls/CFGInput';
import { FileUpload } from '../../controls/FileUpload';
import { GenerateButton } from '../../controls/GenerateButton';
import { ImageResult } from '../../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../../controls/Layout';
import { LoraInput } from '../../controls/LoraInput';
import { ModelSelectAutocomplete } from '../../controls/ModelSelectAutocomplete';
import { PromptInput } from '../../controls/PromptInput';
import { SamplerSelectInput } from '../../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { ToggleInput } from '../../controls/ToggleInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { WFTab } from '../../WFTab';
import { useWatchForm } from '../../../hooks/useWatchForm';
import { ChatComponent } from '../../chat/ChatComponent';
import { qwenImage21SystemPrompt } from '../../chat/prompts/qwenImage21';

type ReferenceType = {
    image: string;
    enabled: boolean;
    skip?: boolean;
}[];

const newValue = { enabled: true };

const ReferenceImages = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: Workflow, value: ReferenceType, control: controlType) => {
            if (!value || !value.length || !control.node_id) {
                return;
            }
            const node = api[control.node_id];
            value.forEach((v, idx) => {
                if (!v.image || !v.enabled || v.skip) {
                    return;
                }
                const imageNodeID = getFreeNodeId(api) + '';
                api[imageNodeID] = {
                    inputs: { image: v.image },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Image' },
                };
                node.inputs['images.image_' + (idx + 1)] = [imageNodeID, 0];
            });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={newValue}
            max={10}
            receiverFieldName='image'
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' />
            <ToggleInput name='enabled' label='enabled' />
        </ArrayInput>
    );
};

const Content = () => {
    const resolution = useWatchForm('custom_output_resolution');
    return (
        <Layout>
            <GridLeft>
                <ReferenceImages name='reference_images' />
                <SliderInput
                    name='reference_resolution'
                    defaultValue={1024}
                    min={0}
                    max={2048}
                    step={32}
                    sx={{ mt: 2 }}
                />
                <ToggleInput
                    name='custom_output_resolution'
                    defaultValue={false}
                />
                <Box sx={resolution ? undefined : { display: 'none' }}>
                    <WidthHeight
                        defaultWidth={1024}
                        defaultHeight={1024}
                        maxWidth={2048}
                        maxHeight={2048}
                    />
                </Box>
                <PromptInput name='prompt' sx={{ mt: 2 }} />
                <ChatComponent
                    systemPrompt={qwenImage21SystemPrompt}
                    mediaFields={[
                        {
                            name: 'reference_images',
                            kind: 'image',
                            itemField: 'image',
                        },
                    ]}
                />
                <PromptInput name='neg_prompt' defaultValue='' />
                <SliderInput name='steps' defaultValue={25} min={1} max={50} />
                <CFGInput defaultValue={1} max={10} />
                <SamplerSelectInput name='sampler' defaultValue='er_sde' />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <ModelSelectAutocomplete
                    name='model'
                    type='qwen21'
                    defaultValue='qwen21/qwen_image_2.1_bf16.safetensors'
                    sx={{ mb: 2 }}
                />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='qwen21' sx={{ mb: 2 }} />
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

export const QwenImage21Tab = (
    <WFTab
        label='Qwen Image 2.1'
        value='Qwen Image 2.1'
        group='T2I'
        receivers={[{ name: 'reference_images', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
