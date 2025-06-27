import { Box } from '@mui/material';
import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { replaceNodeConnection } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
import { HYSize } from '../controls/HYSize';
import { ImageResult } from '../controls/ImageResult';
import { GridBottom, GridLeft, GridRight, Layout } from '../controls/Layout';
import { LoraInput } from '../controls/LoraInput';
import { PromptInput } from '../controls/PromptInput';
import { SamplerSelectInput } from '../controls/SamplerSelectInput';
import { SchedulerSelectInput } from '../controls/SchedulerSelectInput';
import { SeedInput } from '../controls/SeedInput';
import { SliderInput } from '../controls/SliderInput';
import { SwapButton } from '../controls/SwapButton';
import { ToggleInput } from '../controls/ToggleInput';
import { WFTab } from '../WFTab';

const AppendImage = ({
    name,
    upload_name,
}: {
    name: string;
    upload_name: string;
}) => {
    const handler = useCallback(
        (api: any, value: boolean, control?: controlType) => {
            if (
                !value ||
                !control ||
                !control.image_1_id ||
                !control.image_2_id ||
                !control.scale_id
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
            replaceNodeConnection(api, control.scale_id, 'image', concatNode);
        },
        []
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
    return (
        <Layout>
            <GridLeft>
                <FileUpload name='image' />
                <AppendImage name='append_image' upload_name='second_image' />
                <PromptInput name='prompt' />
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
                <SliderInput name='steps' defaultValue={20} min={1} max={40} />
                <GuidanceInput defaultValue={2.5} step={0.1} />
                <SamplerSelectInput name='sampler' defaultValue='dpmpp_2m' />
                <SchedulerSelectInput name='scheduler' defaultValue='simple' />
                <SliderInput
                    name='batch_size'
                    min={1}
                    max={9}
                    defaultValue={1}
                />
                <LoraInput name='lora' type='flux' />
                <SeedInput name='seed' defaultValue={1024} />
            </GridLeft>
            <GridRight
                display='flex'
                gap={2}
                flexDirection='column'
                alignItems='center'
            >
                <ImageResult
                    sendTargetTab='Flux Kontext'
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

export const FluxKontextTab = (
    <WFTab
        label='Flux Kontext'
        value='Flux Kontext'
        group='I2I'
        content={<Content />}
    />
);
