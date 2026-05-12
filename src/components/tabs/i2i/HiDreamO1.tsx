import { useEventCallback } from '@mui/material';
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
import { SchedulerSelectInput } from '../../controls/SchedulerSelectInput';
import { SeedInput } from '../../controls/SeedInput';
import { SliderInput } from '../../controls/SliderInput';
import { ToggleInput } from '../../controls/ToggleInput';
import { WidthHeight } from '../../controls/WidthHeightInput';
import { WFTab } from '../../WFTab';

type ReferenceType = {
    image: string;
    enabled: boolean;
}[];

const newValue = { enabled: true };

const ReferenceImages = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: ReferenceType, control: controlType) => {
            if (!value || !value.length || !control.reference_node_id) {
                return;
            }
            const referenceNode = control.reference_node_id + '';
            value.forEach((v, idx) => {
                if (!v.enabled) {
                    return;
                }
                const nodeID = Object.keys(api).length + 1 + '';
                api[nodeID] = {
                    inputs: { image: v.image },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Image' },
                };
                api[referenceNode].inputs['images.image_' + (idx + 1)] = [
                    nodeID,
                    0,
                ];
            });
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={newValue}
            min={1}
            max={7}
            receiverFieldName='image'
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' />
            <ToggleInput name='enabled' label='enabled' />
        </ArrayInput>
    );
};

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <ReferenceImages name='reference_images' />
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' defaultValue='' />
                <WidthHeight
                    defaultWidth={2048}
                    defaultHeight={2048}
                    maxWidth={4096}
                    maxHeight={4096}
                    step={32}
                />
                <SliderInput name='steps' defaultValue={10} min={1} max={50} />
                <SliderInput
                    name='noise_scale'
                    defaultValue={7.5}
                    min={1}
                    max={20}
                    step={0.1}
                />
                <CFGInput defaultValue={1} max={5} />
                <SchedulerSelectInput name='scheduler' defaultValue='normal' />
                <ModelSelectAutocomplete
                    name='model'
                    type='hidream'
                    component='CheckpointLoaderSimple'
                    field='ckpt_name'
                    defaultValue='hidream/hidream_o1_image_dev_mxfp8.safetensors'
                    sx={{ mb: 2 }}
                />
                <LoraInput name='lora' type='hidream' />
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

export const HiDreamO1Tab = (
    <WFTab
        label='HiDream-O1'
        value='HiDream-O1'
        group='I2I'
        receivers={[{ name: 'reference_images', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
