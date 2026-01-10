import { Cancel } from '@mui/icons-material';
import { Box, Button, Typography, useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { replaceNodeConnection } from '../../api/utils';
import { useResult } from '../../hooks/useResult';
import { useTranslate } from '../../i18n/I18nContext';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from '../controls/FileUpload';
import { GenerateButton } from '../controls/GenerateButton';
import { GuidanceInput } from '../controls/GuidanceInput';
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

const useLatents = (name: string) => {
    const latents = useResult({ index: 1 });
    const { setValue } = useFormContext();
    const setLatents = useEventCallback(() => {
        if (!latents || latents.length != 1) {
            return;
        }
        setValue(name, latents[0].filename + ' [output]');
    });
    const resetLatents = useEventCallback(() => setValue(name, ''));
    return { setLatents, resetLatents };
};

const AppendImage = ({
    name,
    upload_name,
}: {
    name: string;
    upload_name: string;
}) => {
    const { getValues } = useFormContext();
    const { resetLatents } = useLatents('latents');
    const handler = useEventCallback(
        (api: any, value: boolean, control: controlType) => {
            if (
                !value ||
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
            api[control.image_2_id].inputs.image = getValues(upload_name);
        }
    );
    useRegisterHandler({ name, handler });
    const enabled = useWatch({ name });
    return (
        <Box>
            <ToggleInput name={name} />
            {enabled && (
                <FileUpload name={upload_name} onUpload={resetLatents} />
            )}
        </Box>
    );
};

const LoadLatents = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: boolean, control: controlType) => {
            if (!value || !control.reference_node_id) {
                return;
            }
            const loadLatentNode = {
                inputs: {
                    latent: value,
                },
                class_type: 'LoadLatent',
                _meta: {
                    title: 'LoadLatent',
                },
            };
            replaceNodeConnection(
                api,
                control.reference_node_id,
                'latent',
                loadLatentNode
            );
        }
    );
    useRegisterHandler({ name, handler });
    const { watch, setValue } = useFormContext();
    const tr = useTranslate();
    const latents = watch(name);
    useEffect(() => {
        if (latents === undefined) {
            setValue(name, '');
        }
    }, [latents, name, setValue]);
    if (!latents) {
        return null;
    } else {
        return (
            <Box display='flex' gap={1} alignItems='center'>
                <Typography variant='body2' color='info'>
                    {tr('controls.latents_loaded')}
                </Typography>
                <Button
                    variant='text'
                    size='small'
                    onClick={() => setValue(name, '')}
                >
                    <Cancel />
                </Button>
            </Box>
        );
    }
};

const Content = () => {
    const { setLatents, resetLatents } = useLatents('latents');
    const { setValue } = useFormContext();
    const updateSize = useEventCallback(async (file: File) => {
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
    });
    return (
        <Layout>
            <GridLeft>
                <FileUpload
                    name='image'
                    onUpload={(file: File) => {
                        updateSize(file);
                        resetLatents();
                    }}
                />
                <LoadLatents name='latents' />
                <AppendImage name='append_image' upload_name='second_image' />
                <PromptInput name='prompt' />
                <WidthHeight maxWidth={2048} maxHeight={2048} />
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
                    sendOnClick={setLatents}
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
        receivers={[{ name: 'image', acceptedTypes: 'images' }]}
        content={<Content />}
    />
);
