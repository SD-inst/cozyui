import { useEventCallback } from '@mui/material';
import { replaceNodeConnection } from '../../api/utils';
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
    const handler = useEventCallback(
        (api: any, value: any, control?: controlType) => {
            if (!value || !control || !control.node_id) {
                return;
            }
            const node = {
                inputs: {
                    ...value,
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
    useRegisterHandler({ name: 'tea_cache', handler });
    return (
        <>
            <SliderInput
                min={0}
                max={1}
                step={0.01}
                defaultValue={defaultThreshold}
                name='tea_cache.easycache_thresh'
                label='reuse_threshold'
                tooltip='tea_cache'
            />
            <SliderInput
                min={0}
                max={100}
                step={1}
                defaultValue={defaultStart}
                name='tea_cache.start_step'
                label='start_step'
                tooltip='tea_cache_start'
            />
            <SliderInput
                min={-1}
                max={100}
                step={1}
                defaultValue={defaultEnd}
                name='tea_cache.end_step'
                label='end_step'
                tooltip='tea_cache_end'
            />
        </>
    );
};
