import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { NodeRef, Workflow } from '../../api/graph';
import { getFreeNodeId, insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ArrayInput } from './ArrayInput';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';

type ReferenceType = {
    image: string;
    size: number;
    skip?: boolean;
}[];

const newValue = { size: 1 };

export const ReferenceLatentInput = ({
    name,
    receiverFieldName,
}: {
    name: string;
    receiverFieldName?: string;
}) => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: Workflow, value: ReferenceType, control: controlType) => {
            if (
                !value ||
                !value.length ||
                !control.guider_node_id ||
                !control.vae_node_id
            ) {
                return;
            }
            const positiveField = control.positive_field || 'conditioning';
            const negativeField = control.negative_field;
            const sizeNodeIds = [
                control.empty_latent_node_id,
                control.scheduler_node_id,
            ].filter(Boolean);
            const cfg = getValues('cfg') ?? 1;
            const useNegative = !!negativeField && (cfg as number) > 1;

            // Shared encodes: every reference is LoadImage -> scale -> VAEEncode
            // once, so both the positive and negative chains can reuse the same
            // latent (encoding the reference is the expensive part).
            const encodes: { scaleNode: string; encodeNode: string }[] = [];
            value.forEach((v) => {
                if (!v.size || !v.image || v.skip) {
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
                            resolution_steps: 1,
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
                            vae: [control.vae_node_id, 0],
                        },
                        class_type: 'VAEEncode',
                        _meta: {
                            title: 'VAE Encode',
                        },
                    },
                };
                const base = insertGraph(api, graph);
                encodes.push({ scaleNode: base + ':2', encodeNode: base + ':3' });
            });
            if (!encodes.length) {
                return;
            }

            // Output size follows the first reference (the lazy way: no manual W/H):
            // insert a GetImageSize wired to the first ref's scaled image and repoint
            // the empty latent + scheduler to read from it (instead of the W/H controls).
            if (sizeNodeIds.length) {
                const getSizeBase = insertGraph(api, {
                    ':get_size': {
                        inputs: { image: [encodes[0].scaleNode, 0] },
                        class_type: 'GetImageSize',
                        _meta: { title: 'Get Image Size' },
                    },
                });
                const getSizeId = getSizeBase + ':get_size';
                sizeNodeIds.forEach((nodeId) => {
                    api[nodeId].inputs.width = [getSizeId, 0];
                    api[nodeId].inputs.height = [getSizeId, 1];
                });
            }

            // Positive chain: ReferenceLatent nodes chained from the positive
            // conditioning, each adding one reference latent.
            const chain = (field: string) => {
                let prev = api[control.guider_node_id].inputs[field] as NodeRef;
                encodes.forEach((enc) => {
                    const id = getFreeNodeId(api) + '';
                    api[id] = {
                        inputs: {
                            conditioning: [prev[0], 0],
                            latent: [enc.encodeNode, 0],
                        },
                        class_type: 'ReferenceLatent',
                        _meta: {
                            title: 'ReferenceLatent',
                        },
                    };
                    prev = [id, 0];
                });
                api[control.guider_node_id].inputs[field] = prev;
            };
            chain(positiveField);
            if (useNegative) {
                chain(negativeField);
            }
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <ArrayInput
            name={name}
            newValue={newValue}
            max={10}
            receiverFieldName={receiverFieldName}
            targetFieldName='image'
        >
            <FileUpload name='image' label='image' />
            <SliderInput
                name='size'
                label='size_mp'
                min={0.1}
                max={3}
                defaultValue={1}
                step={0.01}
            />
        </ArrayInput>
    );
};
