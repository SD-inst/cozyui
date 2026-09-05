import { useEventCallback } from '@mui/material';
import { isNodeRef, Workflow } from '../../api/graph';
import { insertNode } from '../../api/utils';
import { useResultParam } from '../../hooks/useResult';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';
import { SliderInputProps } from './SliderInputBase';
import { Optional } from './optional';
import { useFormContext } from 'react-hook-form';

export const VideoInterpolationSlider = ({
    name = 'interpolation_multiplier',
    sx,
    ...props
}: Optional<SliderInputProps, 'name'>) => {
    const { id, create_video_node_id } = useResultParam();
    const { getValues } = useFormContext();
    const handler = useEventCallback((api: Workflow, value: number) => {
        if (value === 1 || getValues('length') < 2) {
            return;
        }
        const videoNodeId = create_video_node_id || id;
        const rifeNode = {
            inputs: {
                ckpt_name: 'rife_v4.26.safetensors',
                clear_cache_after_n_frames: 10,
                multiplier: value,
                ensemble: true,
                scale_factor: 1,
            },
            class_type: 'RIFE_VFI_Opt',
            _meta: {
                title: '🐇 RIFE VFI Interpolate by Multiple',
            },
        };
        insertNode(api, videoNodeId, 'images', rifeNode, 0, 'frames');
        let currentFps = api[videoNodeId].inputs.fps;
        if (isNodeRef(currentFps)) {
            currentFps = api[currentFps[0]].inputs.value;
        }
        api[videoNodeId].inputs.fps = (currentFps as number) * value;
    });
    useRegisterHandler({ name, handler });
    return (
        <SliderInput
            name={name}
            min={1}
            max={5}
            defaultValue={1}
            sx={{ mt: 2, ...sx }}
            {...props}
        />
    );
};
