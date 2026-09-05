import { useEventCallback } from '@mui/material';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useResultParam } from '../../hooks/useResult';
import { Workflow } from '../../api/graph';
import { useRegisterHandler } from '../contexts/TabContext';

export const VideoImageOverride = ({
    name = 'video_image_override',
}: {
    name?: string;
}) => {
    const { id, create_video_node_id } = useResultParam();
    const { setValue } = useFormContext();
    const length = useWatch({ name: 'length' });
    const handler = useEventCallback((api: Workflow, value: boolean) => {
        if (!value) {
            return;
        }
        const videoNodeId = create_video_node_id || id;
        const node = {
            inputs: {
                filename_prefix: api[id].inputs.filename_prefix,
                images: api[videoNodeId].inputs.images,
            },
            class_type: 'SaveImage',
            _meta: {
                title: 'Save Image',
            },
        };
        api[id] = node;
    });
    useRegisterHandler({ name, handler });
    useEffect(() => {
        setValue(name, length === 1);
    }, [length, name, setValue]);
    return null;
};
