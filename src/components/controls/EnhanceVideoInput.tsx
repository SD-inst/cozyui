import { useCallback } from 'react';
import { getFreeNodeId } from '../../api/utils';
import { useConfigTab } from '../../hooks/useConfigTab';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';

export const EnhanceVideoInput = ({ ...props }) => {
    const { handler_options } = useConfigTab();
    const handler = useCallback(
        (api: any, value: number) => {
            if (!value) {
                return;
            }
            const ev_node_idx = getFreeNodeId(api);
            const ev_node = {
                inputs: {
                    weight: value,
                    single_blocks: true,
                    double_blocks: true,
                    start_percent: 0,
                    end_percent: 0.8,
                },
                class_type: 'HyVideoEnhanceAVideo',
                _meta: {
                    title: 'HunyuanVideo Enhance A Video',
                },
            };
            api['' + ev_node_idx] = ev_node;
            api[handler_options.enhance_video_params.node_id].inputs[
                'feta_args'
            ] = ['' + ev_node_idx, 0];
        },
        [handler_options.enhance_video_params.node_id]
    );
    useRegisterHandler({ name: props.name, handler });
    return (
        <SliderInput min={0} max={8} step={0.1} defaultValue={4} {...props} />
    );
};
