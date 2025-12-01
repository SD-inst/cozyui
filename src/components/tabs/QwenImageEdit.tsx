import { Box, Button, Typography, useEventCallback } from '@mui/material';
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
import { Add, Close } from '@mui/icons-material';
import { ToggleInput } from '../controls/ToggleInput';
import { useTranslate } from '../../i18n/I18nContext';
import { useFormContext } from 'react-hook-form';
import { useWatchForm } from '../../hooks/useWatchForm';
import { useEffect } from 'react';
import { useRegisterHandler } from '../contexts/TabContext';
import { insertGraph } from '../../api/utils';

type ReferenceType = {
    image: string;
    size: number;
    enabled: boolean;
}[];

const ReferenceImages = ({ name }: { name: string }) => {
    const tr = useTranslate();
    const value: ReferenceType = useWatchForm(name) || [];
    const { setValue, getValues } = useFormContext();
    useEffect(() => {
        const values = getValues(name);
        if (!values || !values.length) {
            setValue(name, [{ size: 1, enabled: true }]);
        }
    }, [getValues, name, setValue]);
    const handleAdd = () => {
        if (value.length > 2) {
            return;
        }
        setValue(name, [...value, { size: 1, enabled: true }]);
    };
    const handleDelete = (idx: number) => {
        if (value.length < 2) {
            return;
        }
        setValue(name, [...value.slice(0, idx), ...value.slice(idx + 1)]);
    };
    const handler = useEventCallback(
        (api: any, value: ReferenceType, control?: controlType) => {
            if (
                !value ||
                !control ||
                !value.length ||
                !control?.positive_node_id ||
                !control?.negative_node_id ||
                !control?.vae_encode_node_id
            ) {
                return;
            }
            value.forEach((v, idx) => {
                if (!v.enabled) {
                    return;
                }
                const graph = {
                    ':1': {
                        inputs: {
                            image: v.image,
                        },
                        class_type: 'LoadImage',
                        _meta: {
                            title: 'Load Image',
                        },
                    },
                    ':2': {
                        inputs: {
                            upscale_method: 'lanczos',
                            megapixels: v.size,
                            image: [':1', 0],
                        },
                        class_type: 'ImageScaleToTotalPixels',
                        _meta: {
                            title: 'Scale Image to Total Pixels',
                        },
                    },
                };
                const nodeID = insertGraph(api, graph);
                const outputNode = [nodeID + ':2', 0];
                api[control.positive_node_id].inputs['image' + (idx + 1)] =
                    outputNode;
                api[control.negative_node_id].inputs['image' + (idx + 1)] =
                    outputNode;
                if (idx === 0) {
                    api[control.vae_encode_node_id].inputs.pixels = outputNode;
                }
            });
        }
    );
    useRegisterHandler({ name, handler });
    return (
        <Box
            display='flex'
            flexDirection='column'
            alignItems='center'
            gap={2}
            mb={2}
        >
            {tr('controls.reference_images')}
            {value?.map((img, idx) => (
                <Box
                    display='flex'
                    flexDirection='column'
                    gap={1}
                    width='100%'
                    key={`${idx}_${img.image}`}
                >
                    <Typography variant='body2' align='center'>
                        {idx + 1}
                    </Typography>
                    <Box
                        display='flex'
                        gap={2}
                        width='100%'
                        alignItems='flex-start'
                        justifyContent='space-between'
                    >
                        <Box flex={1}>
                            <FileUpload
                                name={`${name}.${idx}.image`}
                                label='image'
                            />
                        </Box>
                        {value.length > 1 && (
                            <Button onClick={() => handleDelete(idx)}>
                                <Close />
                            </Button>
                        )}
                    </Box>
                    <SliderInput
                        name={`${name}.${idx}.size`}
                        label='size_mp'
                        min={0.1}
                        max={4}
                        defaultValue={1}
                        step={0.01}
                    />
                    {idx > 0 && (
                        <ToggleInput
                            name={`${name}.${idx}.enabled`}
                            label='enabled'
                        />
                    )}
                </Box>
            ))}
            {value.length < 3 && (
                <Button onClick={handleAdd}>
                    <Add />
                </Button>
            )}
        </Box>
    );
};

const Content = () => {
    return (
        <Layout>
            <GridLeft>
                <ReferenceImages name='reference_images' />
                <PromptInput name='prompt' />
                <PromptInput name='neg_prompt' defaultValue='' />
                <SliderInput name='steps' defaultValue={20} min={1} max={40} />
                <CFGInput defaultValue={4} max={10} />
                <AdvancedSettings>
                    <FlowShiftInput defaultValue={3.1} step={0.1} />
                    <SamplerSelectInput
                        name='sampler'
                        defaultValue='uni_pc_bh2'
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
