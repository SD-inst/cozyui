import { useEventCallback } from '@mui/material';
import { insertGraph } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { ArrayInput } from './ArrayInput';
import { FileUpload } from './FileUpload';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type ReferenceType = {
    image: string;
    size: number;
    enabled: boolean;
}[];

export const ReferenceLatentInput = ({
    name,
    receiverFieldName,
}: {
    name: string;
    receiverFieldName?: string;
}) => {
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
    return (
        <ArrayInput
            name={name}
            newValue={{ size: 1, enabled: true }}
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
            <ToggleInput name='enabled' label='enabled' />
        </ArrayInput>
    );
};
