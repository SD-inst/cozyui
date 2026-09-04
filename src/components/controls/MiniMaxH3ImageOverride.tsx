import { useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useResultParam } from '../../hooks/useResult';
import { Workflow } from '../../api/graph';
import { insertGraph } from '../../api/utils';
import { useRegisterHandler } from '../contexts/TabContext';

/**
 * MiniMax H3 single-frame output.
 *
 * Mirrors {@link VideoImageOverride} (auto-toggles the image mode at a given
 * length and swaps the result node for a `SaveImage`). The MiniMax H3 length
 * is in seconds; at the minimum (`imageThreshold`, default 0.1 s) the output
 * is a single image. The video VAE still decodes at least 5 frames even there,
 * so one frame is carved out of the batch with an `ImageFromBatch`
 * (`batch_index = 0`, `length = 1`) before it is saved as an image.
 */
export const MiniMaxH3ImageOverride = ({
    name = 'video_image_override',
    imageThreshold = 0.1,
}: {
    name?: string;
    imageThreshold?: number;
}) => {
    const { id } = useResultParam();
    const { setValue } = useFormContext();
    const length = useWatch({ name: 'length' });
    const handler = useEventCallback((api: Workflow, value: boolean) => {
        if (!value) {
            return;
        }
        const videoNode = api[id];
        const extractBaseId = insertGraph(api, {
            ':extract_frame': {
                inputs: {
                    batch_index: 0,
                    length: 1,
                    image: videoNode.inputs.images,
                },
                class_type: 'ImageFromBatch',
                _meta: { title: 'Extract Single Frame' },
            },
        });
        api[id] = {
            inputs: {
                filename_prefix: videoNode.inputs.filename_prefix,
                images: [extractBaseId + ':extract_frame', 0],
            },
            class_type: 'SaveImage',
            _meta: { title: 'Save Image' },
        };
    });
    useRegisterHandler({ name, handler });
    const rawValue = useWatch({ name });
    useEffect(() => {
        setValue(name, length <= imageThreshold);
    }, [rawValue, length, imageThreshold, name, setValue]);
    return null;
};
