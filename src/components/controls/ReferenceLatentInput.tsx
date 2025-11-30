import { Add, Close } from '@mui/icons-material';
import { Box, Button, Typography, useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { insertGraph } from '../../api/utils';
import { useWatchForm } from '../../hooks/useWatchForm';
import { useTranslate } from '../../i18n/I18nContext';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type ReferenceType = {
    image: string;
    size: number;
    enabled: boolean;
}[];

export const ReferenceLatentInput = ({ name }: { name: string }) => {
    const handler = useEventCallback(
        (api: any, value: ReferenceType, control?: controlType) => {
            if (
                !value ||
                !control ||
                !value.length ||
                !control?.guider_node_id ||
                !control?.vae_node_id
            ) {
                return;
            }
            const srcNode = api[control.guider_node_id].inputs.conditioning;
            let prevNode = srcNode[0];
            value.forEach((v) => {
                if (!v.size || !v.image || !v.enabled) {
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
                            title: 'ImageScaleToTotalPixels',
                        },
                    },
                    ':3': {
                        inputs: {
                            pixels: [':2', 0],
                            vae: [control?.vae_node_id, 0],
                        },
                        class_type: 'VAEEncode',
                        _meta: {
                            title: 'VAE Encode',
                        },
                    },
                    ':4': {
                        inputs: {
                            conditioning: [prevNode, 0],
                            latent: [':3', 0],
                        },
                        class_type: 'ReferenceLatent',
                        _meta: {
                            title: 'ReferenceLatent',
                        },
                    },
                };
                const newNodeID = insertGraph(api, graph);
                prevNode = newNodeID + ':4';
            });
            api[control.guider_node_id].inputs.conditioning = [prevNode, 0];
        }
    );
    useRegisterHandler({ name, handler });
    const tr = useTranslate();
    const value: ReferenceType = useWatchForm(name) || [];
    const { setValue } = useFormContext();
    const handleAdd = () => {
        setValue(name, [...value, { size: 1, enabled: true }]);
    };
    const handleDelete = (idx: number) => {
        setValue(name, [...value.slice(0, idx), ...value.slice(idx + 1)]);
    };
    return (
        <Box display='flex' flexDirection='column' alignItems='center' gap={2}>
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
                        <Button onClick={() => handleDelete(idx)}>
                            <Close />
                        </Button>
                    </Box>
                    <SliderInput
                        name={`${name}.${idx}.size`}
                        label='size_mp'
                        min={0.1}
                        max={3}
                        defaultValue={1}
                        step={0.01}
                    />
                    <ToggleInput
                        name={`${name}.${idx}.enabled`}
                        label='enabled'
                    />
                </Box>
            ))}
            <Button onClick={handleAdd}>
                <Add />
            </Button>
        </Box>
    );
};
