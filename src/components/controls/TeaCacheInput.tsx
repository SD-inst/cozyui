import { useCallback, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFreeNodeId } from '../../api/utils';
import { useAPI } from '../../hooks/useConfigTab';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';

export const TeaCacheInput = ({ ...props }) => {
    const { handler_options } = useAPI();
    const { setValue, getValues } = useFormContext();
    const v = useWatch({ name: props.name });
    useEffect(() => {
        if (
            v > 0 &&
            getValues('sampler') === 'SDE-DPMSolverMultistepScheduler'
        ) {
            setValue('sampler', 'DPMSolverMultistepScheduler');
        }
    }, [getValues, setValue, v]);
    const handler = useCallback(
        (api: any, value: number) => {
            if (!value) {
                return;
            }
            const tc_node_idx = getFreeNodeId(api);
            const tc_node = {
                inputs: {
                    rel_l1_thresh: value,
                },
                class_type: 'HyVideoTeaCache',
                _meta: {
                    title: 'HunyuanVideo TeaCache',
                },
            };
            api['' + tc_node_idx] = tc_node;
            api[handler_options.node_params.sampler_id].inputs[
                'teacache_args'
            ] = ['' + tc_node_idx, 0];
        },
        [handler_options.node_params.sampler_id]
    );
    useRegisterHandler({ name: props.name, handler });
    return (
        <SliderInput min={0} max={1} step={0.01} label='Tea Cache' {...props} />
    );
};
