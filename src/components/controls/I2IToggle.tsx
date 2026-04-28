import { Box, useEventCallback } from '@mui/material';
import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { useApiURL } from '../../hooks/useApiURL';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ToggleInput, ToggleInputProps } from './ToggleInput';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';
import { UploadType } from './UploadType';
import { MaskEditor } from './mask_editor/MaskEditor';
import { useImageURL } from '../../hooks/useImageURL';

type TValue = {
    enabled: boolean;
    image: string;
    denoise: number;
    mask: Uint8Array | number[][];
    inpainting: boolean;
};

const defaultValue: TValue = {
    enabled: false,
    image: '',
    denoise: 0.3,
    mask: new Uint8Array(0),
    inpainting: false,
};

/**
 * Create a grayscale mask canvas from mask data.
 * Where mask is 1 → white (255, 255, 255) — this is the inpaint region.
 * Where mask is 0 → black (0, 0, 0) — this is the preserved region.
 */
const createMaskCanvas = (
    mask: Uint8Array | number[][],
    width: number,
    height: number,
): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    // Convert mask to flat array
    let maskData: number[];
    if (Array.isArray(mask)) {
        if (Array.isArray(mask[0])) {
            const flat: number[] = [];
            for (const row of mask) flat.push(...row);
            maskData = flat;
        } else {
            maskData = (mask as unknown as number[]) as number[];
        }
    } else {
        maskData = Array.from(mask);
    }

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < maskData.length; i++) {
        const v = maskData[i] === 1 ? 255 : 0;
        imageData.data[i * 4] = v;     // R
        imageData.data[i * 4 + 1] = v; // G
        imageData.data[i * 4 + 2] = v; // B
        imageData.data[i * 4 + 3] = 255; // A
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

/**
 * Upload a mask (grayscale) image to ComfyUI server.
 */
const uploadMaskImage = async (
    maskCanvas: HTMLCanvasElement,
    apiUrl: string,
    imageFilename: string, // e.g., 'my_image.png' → mask_my_image.png
): Promise<string> => {
    return new Promise((resolve, reject) => {
        maskCanvas.toBlob(async (blob) => {
            if (!blob) return reject('No blob');
            const baseName = imageFilename.replace(/\.[^.]+$/, '');
            const filename = `mask_${baseName}.png`;
            const file = new File([blob], filename, { type: 'image/png' });
            const formData = new FormData();
            formData.append('image', file);
            try {
                const r = await fetch(`${apiUrl}/api/upload/image`, {
                    method: 'POST',
                    body: formData,
                });
                const j = await r.json();
                resolve(j.name);
            } catch (e) {
                reject(e);
            }
        }, 'image/png');
    });
};

export const I2IToggle = ({
    name,
    defaultValue: defaultEnabled = false,
    ...props
}: ToggleInputProps & { name: string }) => {
    const apiUrl = useApiURL();
    const setValue = useRestoreValues();
    const value = useWatch({ name });
    const imageURL = useImageURL(
        typeof value === 'object' && value ? (value as any).image : value,
    );

    // Track mask timestamps to avoid re-uploading unchanged masks
    const [lastMaskModifiedAt, setLastMaskModifiedAt] = useState(0);
    const [lastMaskUploadAt, setLastMaskUploadAt] = useState(0);
    const [lastUploadedMaskName, setLastUploadedMaskName] = useState<string | null>(null);

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

    // Track mask changes — update timestamp whenever mask data changes
    useEffect(() => {
        if (value?.mask && (value.mask as Uint8Array).length > 0) {
            setLastMaskModifiedAt(Date.now());
        }
    }, [value?.mask]);

    const enabled = useWatch({
        name: `${name}.enabled`,
        defaultValue: defaultEnabled,
    });
    const inpainting = useWatch({
        name: `${name}.inpainting`,
        defaultValue: false,
    });

    const handler = useEventCallback(
        async (api: any, value: TValue, control: controlType) => {
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

            // Build base graph for insertGraph (LoadImage + VAEEncode)
            const graph: Record<string, any> = {
                ':load_image': {
                    inputs: { image: value.image },
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

            if (value.inpainting && imageURL) {
                const originalImageFilename = graph[':load_image'].inputs.image;

                // Load image to get dimensions
                const img = new Image();
                img.src = imageURL;
                await new Promise<void>((resolve) => {
                    if (img.complete && img.naturalWidth > 0) {
                        resolve();
                    } else {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                    }
                });

                // Create mask canvas
                const maskCanvas = createMaskCanvas(
                    value.mask,
                    img.naturalWidth,
                    img.naturalHeight,
                );

                // Avoid re-uploading unchanged mask — compare timestamps
                let maskFilename: string;
                if (lastUploadedMaskName && lastMaskModifiedAt <= lastMaskUploadAt) {
                    // mask hasn't been modified since last upload
                    maskFilename = lastUploadedMaskName;
                } else {
                    maskFilename = await uploadMaskImage(maskCanvas, apiUrl, originalImageFilename);
                    setLastUploadedMaskName(maskFilename);
                    setLastMaskUploadAt(Date.now());
                }

                graph[':load_image'].inputs.image = originalImageFilename;

                // Get positive/negative sources from sampler
                const positiveLink = samplerNode.inputs.positive; // e.g., ['6', 0]
                const negativeLink = samplerNode.inputs.negative; // e.g., ['7', 0]

                // Add InpaintModelConditioning node — use separate mask file
                graph[':inpaint_conditioning'] = {
                    inputs: {
                        noise_mask: true,
                        positive: positiveLink,
                        negative: negativeLink,
                        vae: [vae_loader_id, vaeOutputIdx],
                        pixels: [':load_image', 0],
                        mask: [':mask_upload', 0],
                    },
                    class_type: 'InpaintModelConditioning',
                    _meta: { title: 'InpaintModelConditioning' },
                };
                graph[':mask_upload'] = {
                    inputs: { image: maskFilename },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Mask' },
                };
                graph[':mask_to_mask'] = {
                    inputs: { image: [':mask_upload', 0], channel: 'red' },
                    class_type: 'ImageToMask',
                    _meta: { title: 'Image to Mask' },
                };
                // Update inpaint_conditioning to use the converted mask
                graph[':inpaint_conditioning'].inputs.mask = [':mask_to_mask', 0];
                delete(graph[':vae_encode'])
            }

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

            // Redirect positive/negative through InpaintModelConditioning if inpainting
            if (value.inpainting) {
                const inpaintNodeId = `${baseNodeId}:inpaint_conditioning`;
                api[sampler_id].inputs.positive = [inpaintNodeId, 0];
                api[sampler_id].inputs.negative = [inpaintNodeId, 1];
                api[sampler_id].inputs.latent_image = [inpaintNodeId, 2];
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
                    <ToggleInput
                        name={`${name}.inpainting`}
                        label='inpainting'
                        {...props}
                    />
                    {inpainting && (
                        <MaskEditor
                            name={`${name}.mask`}
                            imageSrc={imageURL}
                            defaultBrushSize={30}
                            maskColor='#ff0000'
                            maskOpacity={0.5}
                        />
                    )}
                </Box>
            )}
        </Box>
    );
};
