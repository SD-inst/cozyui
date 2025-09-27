import { useEventCallback } from '@mui/material';
import { insertNode } from '../../api/utils';
import { useResultParam } from '../../hooks/useResult';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';
import { SliderInputProps } from './SliderInputBase';
import { Optional } from './optional';

export const VideoInterpolationSlider = ({
    name = 'interpolation_multiplier',
    sx,
    ...props
}: Optional<SliderInputProps, 'name'>) => {
    const { id } = useResultParam();
    const handler = useEventCallback((api: any, value: number) => {
        if (value === 1) {
            return;
        }
        const rifeNode = {
            inputs: {
                ckpt_name: 'rife49.pth',
                clear_cache_after_n_frames: 10,
                multiplier: value,
                fast_mode: true,
                ensemble: true,
                scale_factor: 1,
            },
            class_type: 'RIFE VFI',
            _meta: {
                title: 'RIFE VFI (recommend rife47 and rife49)',
            },
        };
        insertNode(api, id, 'images', rifeNode, 0, 'frames');
        let currentFps = api[id].inputs.frame_rate;
        if (Array.isArray(currentFps)) {
            currentFps = api[currentFps[0]].inputs.value;
        }
        api[id].inputs.frame_rate = currentFps * value;
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
