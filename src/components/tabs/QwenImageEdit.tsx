import { Box } from '@mui/material';
import { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { replaceNodeConnection } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { CFGInput } from '../controls/CFGInput';
import { CompileModelToggle } from '../controls/CompileModelToggle';
import { FileUpload } from '../controls/FileUpload';
import { FlowShiftInput } from '../controls/FlowShiftInput';
import { GenerateButton } from '../controls/GenerateButton';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { ToggleInput } from '../controls/ToggleInput';
import { WidthHeight } from '../controls/WidthHeightInput';
import { WFTab } from '../WFTab';

const AppendImage = ({
    name,
    upload_name,
}: {
    name: string;
    upload_name: string;
}) => {
    const { getValues } = useFormContext();
    const handler = useCallback(
        (api: any, value: boolean, control?: controlType) => {
            if (
                !value ||
                !control ||
                !control.image_1_id ||
                !control.image_2_id ||
                !control.output_ids
            ) {
                return;
            }
            const concatNode = {
                inputs: {
                    direction: 'right',
                    match_image_size: true,
                    spacing_width: 0,
                    spacing_color: 'white',
                    image1: [control.image_1_id, 0],
                    image2: [control.image_2_id, 0],
                },
                class_type: 'ImageStitch',
                _meta: {
                    title: 'Image Stitch',
                },
            };
            (control.output_ids as string[]).forEach((id) =>
                replaceNodeConnection(api, id, 'image', concatNode)
            );
            api[control.image_2_id].inputs.image = getValues(upload_name);
        },
        [getValues, upload_name]
    );
    useRegisterHandler({ name, handler });
    const enabled = useWatch({ name });
    return (
        <Box>
            <ToggleInput name={name} />
            {enabled && <FileUpload name={upload_name} />}
        </Box>
    );
};

const Content = () => {
    const { setValue } = useFormContext();
    const updateSize = useCallback(
        async (file: File) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                const size = width * height;
                if (size > 1500000 || size < 1000000) {
                    [width, height] = [
                        (width / Math.sqrt(size)) * Math.sqrt(1000000),
                        (height / Math.sqrt(size)) * Math.sqrt(1000000),
                    ];
                }
                setValue('width', Math.ceil(width - (width % 16)));
                setValue('height', Math.ceil(height - (height % 16)));
            };
        },
        [setValue]
    );
    return (
        <Layout>
            <GridLeft>
                <FileUpload
                    name='image'
                    onUpload={(file: File) => {
                        updateSize(file);
                    }}
                />
                <AppendImage name='append_image' upload_name='second_image' />
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' defaultValue='' />
                <WidthHeight />
                <SliderInput name='steps' defaultValue={20} min={1} max={40} />
                <CFGInput defaultValue={4} max={10} />
                <FlowShiftInput defaultValue={2} step={0.1} />
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
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
