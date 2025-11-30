import { useEventCallback } from '@mui/material';
import { insertNode } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';

export const TeaCacheInput = ({
    defaultThreshold = 0.1,
    defaultStart = 0.3,
    defaultEnd = 0.8,
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
                    verbose: false,
                    model: null,
                },
                class_type: 'EasyCache',
                _meta: {
                    title: 'Easy Cache',
                },
            };
            insertNode(api, control.node_id, 'model', node);
        }
    );
    useRegisterHandler({ name: 'easy_cache', handler });
    return (
        <>
            <SliderInput
                min={0}
                max={1}
                step={0.01}
                defaultValue={defaultThreshold}
                name='easy_cache.reuse_threshold'
                label='reuse_threshold'
                tooltip='tea_cache'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={defaultStart}
                name='easy_cache.start_percent'
                label='start_percent'
                tooltip='tea_cache_start'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={defaultEnd}
                name='easy_cache.end_percent'
                label='end_percent'
                tooltip='tea_cache_end'
            />
        </>
    );
};
