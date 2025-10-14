import { useEventCallback } from '@mui/material';
import { replaceNodeConnection } from '../../api/utils';
import { useWatchFormMany } from '../../hooks/useWatchForm';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';

export const KJEasyCacheInput = ({
    defaultThreshold = 0.05,
    defaultStart = 10,
    defaultEnd = -1,
}: {
    defaultThreshold?: number;
    defaultStart?: number;
    defaultEnd?: number;
}) => {
    const [start_step, end_step] = useWatchFormMany([
        'start_step',
        'end_step',
    ]);
    const handler = useEventCallback(
        (api: any, value: string, control?: controlType) => {
            if (!value || !control || !control.node_id) {
                return;
            }
            const node = {
                inputs: {
                    easycache_thresh: value,
                    start_step,
                    end_step,
                    cache_device: 'offload_device',
                },
                class_type: 'WanVideoEasyCache',
                _meta: {
                    title: 'WanVideo EasyCache',
                },
            };
            replaceNodeConnection(api, control.node_id, 'cache_args', node);
        }
    );
    useRegisterHandler({ name: 'reuse_threshold', handler });
    return (
        <>
            <SliderInput
                min={0}
                max={1}
                step={0.01}
                defaultValue={defaultThreshold}
                name='reuse_threshold'
                tooltip='tea_cache'
            />
            <SliderInput
                min={0}
                max={100}
                step={1}
                defaultValue={defaultStart}
                name='start_step'
                tooltip='tea_cache_start'
            />
            <SliderInput
                min={-1}
                max={100}
                step={1}
                defaultValue={defaultEnd}
                name='end_step'
                tooltip='tea_cache_end'
            />
        </>
    );
};
