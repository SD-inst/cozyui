import { useEventCallback } from '@mui/material';
import { insertNode } from '../../api/utils';
import { useWatchFormMany } from '../../hooks/useWatchForm';
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
    const [start_percent, end_percent] = useWatchFormMany([
        'start_percent',
        'end_percent',
    ]);
    const handler = useEventCallback(
        (api: any, value: string, control?: controlType) => {
            if (!value || !control || !control.node_id) {
                return;
            }
            const node = {
                inputs: {
                    reuse_threshold: value,
                    start_percent,
                    end_percent,
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
                max={1}
                step={0.05}
                defaultValue={defaultStart}
                name='start_percent'
                tooltip='tea_cache_start'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={defaultEnd}
                name='end_percent'
                tooltip='tea_cache_end'
            />
        </>
    );
};
