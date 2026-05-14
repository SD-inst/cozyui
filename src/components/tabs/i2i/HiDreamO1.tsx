import { useEventCallback } from '@mui/material';
import { getFreeNodeId, insertGraph } from '../../../api/utils';
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
            if (!value || !value.length || !control.sampler_id) {
                return;
            }

            const referenceGraph = {
                ':reference': {
                    inputs: {},
                    class_type: 'HiDreamO1ReferenceImages',
                    _meta: { title: 'HiDream-O1 Reference Images' },
                },
            };
            const refBaseID = insertGraph(api, referenceGraph);
            const refNodeID = refBaseID + ':reference';

            value.forEach((v, idx) => {
                if (!v.enabled) {
                    return;
                }
                const imageNodeID = getFreeNodeId(api) + '';
                api[imageNodeID] = {
                    inputs: { image: v.image },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Image' },
                };
                api[refNodeID].inputs['images.image_' + (idx + 1)] = [
                    imageNodeID,
                    0,
                ];
            });

            api[control.sampler_id].inputs.positive = [refNodeID, 0];
            api[control.sampler_id].inputs.negative = [refNodeID, 1];
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={newValue}
            max={7}
            receiverFieldName='image'
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' />
            <ToggleInput name='enabled' label='enabled' />
        </ArrayInput>
    );
};

const modelHandler = (api: any, value: string, control: controlType) => {
    if (!value) return;

    const isDev = value.includes('_dev_');

    if (!isDev) {
        // Base model - insert smoothing node between noise_scale and sampler
        const smoothingNodeID = getFreeNodeId(api) + '';
        api[smoothingNodeID] = {
            inputs: {
                start_percent: 0.8,
                end_percent: 1,
                pattern: 'single_shift',
                passes: 'ramp_2_4',
                blend: 'median',
                strength: 1,
                model: [control.noise_scale_id, 0],
            },
            class_type: 'HiDreamO1PatchSeamSmoothing',
            _meta: { title: 'HiDream-O1 Patch Seam Smoothing' },
        };
        api[control.sampler_id].inputs.model = [smoothingNodeID, 0];
    }
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
                <CFGInput defaultValue={1} />
                <SamplerSelectInput name='sampler' defaultValue='lcm' />
                <ModelSelectAutocomplete
                    name='model'
                    type='hidream'
                    component='CheckpointLoaderSimple'
                    field='ckpt_name'
                    defaultValue='hidream/hidream_o1_image_dev_mxfp8.safetensors'
                    customHandler={modelHandler}
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
        group='T2I'
        content={<Content />}
    />
);
