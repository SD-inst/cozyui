import {
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    useEventCallback,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useState } from 'react';
import { useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';
import { UploadType } from './UploadType';
import { MaskEditor } from './MaskEditor';
import { useImageURL } from '../../hooks/useImageURL';
import { useTranslate } from '../../i18n/I18nContext';

type TValue = {
    enabled: boolean;
    image: string;
    denoise: number;
    mask: Uint8Array | number[][];
};

const defaultValue: TValue = {
    enabled: false,
    image: '',
    denoise: 0.3,
    mask: new Uint8Array(0),
};

export const I2IToggle = ({
    name,
    defaultValue: defaultEnabled = false,
    ...props
}: ToggleInputProps & { name: string }) => {
    const tr = useTranslate();
    const setValue = useRestoreValues();
    const value = useWatch({ name });
    const imageURL = useImageURL(
        typeof value === 'object' && value ? (value as any).image : value,
    );
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        if (typeof value === 'string') {
            // received image file name from another tab/history
            setValue(name, {
                ...defaultValue,
                enabled: true,
                image: value,
            });
        }
    }, [name, setValue, value]);
    const enabled = useWatch({
        name: `${name}.enabled`,
        defaultValue: defaultEnabled,
    });

    const handler = useEventCallback(
        (api: any, value: TValue, control: controlType) => {
            if (!value?.enabled || !value?.image) {
                return;
            }

            const { sampler_id, vae_loader_id } = control;
            if (!sampler_id || !vae_loader_id) {
                return;
            }

            const samplerNode = api[sampler_id];
            if (!samplerNode) {
                return;
            }

            // Auto-detect VAE source by checking class_type
            const vaeNode = api[vae_loader_id];
            const vaeOutputIdx =
                vaeNode?.class_type === 'CheckpointLoaderSimple' ? 2 : 0;

            // Build graph for insertGraph (LoadImage + VAEEncode)
            const graph = {
                ':load_image': {
                    inputs: { image: value.image, alternative_image: '' },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Image' },
                },
                ':vae_encode': {
                    inputs: {
                        pixels: [':load_image', 0],
                        vae: [vae_loader_id, vaeOutputIdx],
                    },
                    class_type: 'VAEEncode',
                    _meta: { title: 'VAE Encode' },
                },
            };

            const baseNodeId = insertGraph(api, graph);
            const vaeEncodeRef = [`${baseNodeId}:vae_encode`, 0];

            // Replace latent_image on sampler
            api[sampler_id].inputs.latent_image = vaeEncodeRef;

            // Set denoise based on sampler type
            if (samplerNode?.class_type === 'KSampler') {
                api[sampler_id].inputs.denoise = value.denoise;
            } else if (samplerNode?.class_type === 'SamplerCustomAdvanced') {
                const sigmasLink = samplerNode.inputs.sigmas; // [schedulerNodeId, 0]
                if (sigmasLink && Array.isArray(sigmasLink)) {
                    const schedulerNodeId = sigmasLink[0];
                    api[schedulerNodeId].inputs.denoise = value.denoise;
                }
            }
        },
    );

    useRegisterHandler({ name, handler });

    return (
        <Box>
            <ToggleInput name={`${name}.enabled`} label='i2i' {...props} />
            {enabled && (
                <Box
                    mt={1}
                    display='flex'
                    flexDirection='column'
                    gap={2}
                    sx={{ mb: 2 }}
                >
                    <FileUpload
                        name={`${name}.image`}
                        label='image'
                        type={UploadType.IMAGE}
                    />
                    <SliderInput
                        name={`${name}.denoise`}
                        label='denoise'
                        defaultValue={0.3}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                    <Accordion
                        expanded={expanded}
                        onChange={() => setExpanded(!expanded)}
                    >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            {tr('controls.mask_editor.title')}
                        </AccordionSummary>
                        <AccordionDetails>
                            <MaskEditor
                                name={`${name}.mask`}
                                imageSrc={imageURL}
                                defaultBrushSize={30}
                                maskColor='#ff0000'
                                maskOpacity={0.5}
                            />
                        </AccordionDetails>
                    </Accordion>
                </Box>
            )}
        </Box>
    );
};
