import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { insertNode } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type TValue = {
    enabled: boolean;
    video_budget: number;
    denser_early_late_steps: boolean;
};

const defaultValue: TValue = {
    enabled: false,
    video_budget: 0.3,
    denser_early_late_steps: true,
};

export const H3SparseAttention = ({
    name = 'sparse_attention',
    ...props
}: { name?: string } & BoxProps) => {
    const value = useWatch({ name, defaultValue });
    const handler = useEventCallback(
        (api: any, value: TValue, control: controlType) => {
            if (!value?.enabled) {
                return;
            }
            const { sigma_shift_node_id } = control;
            if (!sigma_shift_node_id) {
                return;
            }
            insertNode(
                api,
                sigma_shift_node_id,
                'model',
                {
                    inputs: {
                        video_budget: value.video_budget,
                        denser_early_late_steps: value.denser_early_late_steps,
                    },
                    class_type: 'H3SparseAttention',
                    _meta: { title: 'H3 Sparse Attention' },
                },
            );
        },
    );
    useRegisterHandler({ name, handler });
    return (
        <Box {...props}>
            <ToggleInput
                name={`${name}.enabled`}
                label='sparse_attention'
                defaultValue={defaultValue.enabled}
            />
            {value?.enabled && (
                <Box display='flex' flexDirection='column' gap={2}>
                    <SliderInput
                        name={`${name}.video_budget`}
                        label='sparse_attention_video_budget'
                        defaultValue={defaultValue.video_budget}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                    <ToggleInput
                        name={`${name}.denser_early_late_steps`}
                        label='sparse_attention_denser_early_late_steps'
                        defaultValue={defaultValue.denser_early_late_steps}
                    />
                </Box>
            )}
        </Box>
    );
};
