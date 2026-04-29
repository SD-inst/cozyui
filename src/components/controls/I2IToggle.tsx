import { Box, useEventCallback } from '@mui/material';
import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { insertGraph } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useImageURL } from '../../hooks/useImageURL';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { useResultParam } from '../../hooks/useResult';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { FileUpload } from './FileUpload';
import { InpaintCropSettings } from './InpaintCropSettings';
import { MaskEditor } from './mask_editor/MaskEditor';
import { SliderInput } from './SliderInput';
import { ToggleInput, ToggleInputProps } from './ToggleInput';
import { UploadType } from './UploadType';

type TValue = {
    enabled: boolean;
    image: string;
    denoise: number;
    mask: Uint8Array;
    inpainting: boolean;
    inpaint_crop_enabled: boolean;
    mask_expand_pixels: number;
    mask_blend_pixels: number;
    context_expand_factor: number;
    target_width: number;
    target_height: number;
    output_padding: string;
};

const defaultValue: TValue = {
    enabled: false,
    image: '',
    denoise: 0.3,
    mask: new Uint8Array(0),
    inpainting: false,
    inpaint_crop_enabled: true,
    mask_expand_pixels: 2,
    mask_blend_pixels: 32,
    context_expand_factor: 1.2,
    target_width: 1024,
    target_height: 1024,
    output_padding: '32',
};

/**
 * Create a grayscale mask canvas from mask data.
 * Where mask is 1 → white (255, 255, 255) — this is the inpaint region.
 * Where mask is 0 → black (0, 0, 0) — this is the preserved region.
 */
const createMaskCanvas = (
    mask: Uint8Array,
    width: number,
    height: number,
): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    const maskData = Array.from(mask);

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < maskData.length; i++) {
        const v = maskData[i] === 1 ? 255 : 0;
        imageData.data[i * 4] = v; // R
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
    ...props
}: ToggleInputProps & { name: string }) => {
    const apiUrl = useApiURL();
    const setValue = useRestoreValues();
    const value = useWatch({ name });
    const imageURL = useImageURL(
        typeof value === 'object' && value ? (value as any).image : value,
    );
    const resultParam = useResultParam();

    // Track mask timestamps to avoid re-uploading unchanged masks
    const [lastMaskModifiedAt, setLastMaskModifiedAt] = useState(0);
    const [lastMaskUploadAt, setLastMaskUploadAt] = useState(0);
    const [lastUploadedMaskName, setLastUploadedMaskName] = useState<
        string | null
    >(null);

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
        defaultValue: false,
    });
    const inpainting = useWatch({
        name: `${name}.inpainting`,
        defaultValue: false,
    });

    // Helper: update sampler connections to point to InpaintModelConditioning output
    const connectInpaintToSampler = (
        api: any,
        samplerId: string,
        inpaintConditioningId: string,
    ) => {
        api[samplerId].inputs.positive = [inpaintConditioningId, 0];
        api[samplerId].inputs.negative = [inpaintConditioningId, 1];
        api[samplerId].inputs.latent_image = [inpaintConditioningId, 2];
    };

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

            // Build base graph for insertGraph (LoadImage)
            const graph: Record<string, any> = {
                ':load_image': {
                    inputs: { image: value.image },
                    class_type: 'LoadImage',
                    _meta: { title: 'Load Image' },
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
                if (
                    lastUploadedMaskName &&
                    lastMaskModifiedAt <= lastMaskUploadAt
                ) {
                    // mask hasn't been modified since last upload
                    maskFilename = lastUploadedMaskName;
                } else {
                    maskFilename = await uploadMaskImage(
                        maskCanvas,
                        apiUrl,
                        originalImageFilename,
                    );
                    setLastUploadedMaskName(maskFilename);
                    setLastMaskUploadAt(Date.now());
                }

                graph[':load_image'].inputs.image = originalImageFilename;

                // Get positive/negative sources from sampler
                const positiveLink = samplerNode.inputs.positive; // e.g., ['6', 0]
                const negativeLink = samplerNode.inputs.negative; // e.g., ['7', 0]

                // Add mask upload (common to both modes)
                graph[':mask_upload'] = {
                    inputs: { image: maskFilename, channel: 'red' },
                    class_type: 'LoadImageMask',
                    _meta: { title: 'Load Image (as Mask)' },
                };

                if (value.inpaint_crop_enabled) {
                    // === INPAINT CROP MODE ===

                    // Add InpaintCropImproved
                    graph[':inpaint_crop'] = {
                        inputs: {
                            downscale_algorithm: 'bilinear',
                            upscale_algorithm: 'lanczos',
                            preresize: false,
                            preresize_mode: 'ensure minimum resolution',
                            preresize_min_width: 1024,
                            preresize_min_height: 1024,
                            preresize_max_width: 16384,
                            preresize_max_height: 16384,
                            mask_fill_holes: true,
                            mask_expand_pixels: value.mask_expand_pixels,
                            mask_invert: false,
                            mask_blend_pixels: value.mask_blend_pixels,
                            mask_hipass_filter: 0.1,
                            extend_for_outpainting: false,
                            extend_up_factor: 1,
                            extend_down_factor: 1,
                            extend_left_factor: 1,
                            extend_right_factor: 1,
                            context_from_mask_extend_factor:
                                value.context_expand_factor,
                            output_resize_to_target_size: true,
                            output_target_width: value.target_width,
                            output_target_height: value.target_height,
                            output_padding: value.output_padding,
                            image: [':load_image', 0],
                            mask: [':mask_upload', 0],
                        },
                        class_type: 'InpaintCropImproved',
                        _meta: { title: '✂️ Inpaint Crop (Improved)' },
                    };

                    // Add InpaintModelConditioning with cropped inputs
                    graph[':inpaint_conditioning'] = {
                        inputs: {
                            noise_mask: true,
                            positive: positiveLink,
                            negative: negativeLink,
                            vae: [vae_loader_id, vaeOutputIdx],
                            pixels: [':inpaint_crop', 1], // cropped image
                            mask: [':inpaint_crop', 2], // cropped mask
                        },
                        class_type: 'InpaintModelConditioning',
                        _meta: { title: 'InpaintModelConditioning' },
                    };

                    // Find VAEDecode ID from result node (before insertGraph)
                    const resultNodeId = resultParam.id;
                    const resultNode = api[resultNodeId];
                    const imagesInput = resultNode?.inputs?.images;
                    const vaeDecodeNodeId = Array.isArray(imagesInput)
                        ? imagesInput[0]
                        : null;

                    // Add InpaintStitchImproved
                    graph[':inpaint_stitch'] = {
                        inputs: {
                            stitcher: [':inpaint_crop', 0],
                            inpainted_image: vaeDecodeNodeId
                                ? [vaeDecodeNodeId, 0]
                                : null,
                        },
                        class_type: 'InpaintStitchImproved',
                        _meta: { title: '✂️ Inpaint Stitch (Improved)' },
                    };

                    // Insert graph
                    const baseNodeId = insertGraph(api, graph);

                    // Modify result node to use InpaintStitchImproved output
                    if (vaeDecodeNodeId) {
                        api[resultNodeId].inputs.images = [
                            `${baseNodeId}:inpaint_stitch`,
                            0,
                        ];
                    }

                    // Update sampler connections (deduplicated)
                    connectInpaintToSampler(
                        api,
                        sampler_id,
                        `${baseNodeId}:inpaint_conditioning`,
                    );
                } else {
                    // === EXISTING INPAINT MODE (no crop) ===
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

                    const baseNodeId = insertGraph(api, graph);

                    // Update sampler connections (deduplicated)
                    connectInpaintToSampler(
                        api,
                        sampler_id,
                        `${baseNodeId}:inpaint_conditioning`,
                    );
                }
            } else {
                // === PLAIN I2I MODE ===
                graph[':vae_encode'] = {
                    inputs: {
                        pixels: [':load_image', 0],
                        vae: [vae_loader_id, vaeOutputIdx],
                    },
                    class_type: 'VAEEncode',
                    _meta: { title: 'VAE Encode' },
                };

                const baseNodeId = insertGraph(api, graph);
                api[sampler_id].inputs.latent_image = [
                    `${baseNodeId}:vae_encode`,
                    0,
                ];
            }

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
                    <ToggleInput
                        name={`${name}.inpainting`}
                        label='inpainting'
                        {...props}
                    />
                    {inpainting && (
                        <>
                            <MaskEditor
                                name={`${name}.mask`}
                                imageSrc={imageURL}
                                defaultBrushSize={30}
                                maskColor='#ff0000'
                                maskOpacity={0.5}
                            />
                            <InpaintCropSettings name={name} />
                        </>
                    )}
                </Box>
            )}
        </Box>
    );
};
