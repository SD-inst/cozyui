import { Box, BoxProps } from '@mui/material';
import { useCallback } from 'react';
import { useController } from 'react-hook-form';
import { insertNode, replaceNodeConnection } from '../../api/utils';
import { useResultParam } from '../../hooks/useResult';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SelectInputBase } from './SelectInputBase';
import { SliderInputBase } from './SliderInputBase';
import { ToggleInputBase } from './ToggleInputBase';

type valueType = {
    enabled: boolean;
    shift_skip: number;
    start_percent: number;
    end_percent: number;
    color_correction: string;
};

export const KJWanLoopInput = ({
    name,
    ...props
}: BoxProps & { name: string }) => {
    const { id } = useResultParam();
    const handler = useCallback(
        (api: any, value: valueType, control?: controlType) => {
            const { enabled, color_correction, ...inputs } = value;
            if (!enabled || !control || !control.sampler_node_id) {
                return;
            }
            if (color_correction != 'off') {
                const decode_node_id = api[id].inputs['images'][0];
                const selectNode = {
                    inputs: {
                        indexes: '-9',
                        err_if_missing: true,
                        err_if_empty: true,
                        image: [decode_node_id, 0],
                    },
                    class_type: 'VHS_SelectImages',
                    _meta: {
                        title: 'Select Images 🎥🅥🅗🅢',
                    },
                };
                const selectNodeId = insertNode(api, [], '', selectNode);
                const colorMatchNode = {
                    inputs: {
                        method: color_correction,
                        strength: 1,
                        image_ref: [selectNodeId, 0],
                        image_target: [decode_node_id, 0],
                    },
                    class_type: 'ColorMatch',
                    _meta: {
                        title: 'Color Match',
                    },
                };
                replaceNodeConnection(api, id, 'images', colorMatchNode);
            }
            const loopArgsNode = {
                inputs,
                class_type: 'WanVideoLoopArgs',
                _meta: {
                    title: 'WanVideo Loop Args',
                },
            };
            replaceNodeConnection(
                api,
                control.sampler_node_id,
                'loop_args',
                loopArgsNode
            );
        },
        [id]
    );
    useRegisterHandler({ name: name, handler });
    const {
        field: { value, onChange },
    } = useController({
        name: name,
        defaultValue: {
            enabled: false,
            shift_skip: 6,
            start_percent: 0,
            end_percent: 1,
            color_correction: 'mkl',
        } as valueType,
    });
    return (
        <Box
            display='flex'
            flexDirection='column'
            gap={2}
            border='1px gray solid'
            borderRadius={3}
            p={2}
            {...props}
        >
            <ToggleInputBase
                name={name}
                value={value.enabled}
                onChange={(_, enabled) => onChange({ ...value, enabled })}
            />
            {value.enabled && (
                <>
                    <Box display='flex' flexDirection='column' gap={2}>
                        <SliderInputBase
                            name='shift_skip'
                            value={value.shift_skip}
                            min={0}
                            max={20}
                            onChange={(shift_skip) =>
                                onChange({ ...value, shift_skip })
                            }
                        />
                        <SliderInputBase
                            name='loop_start_percent'
                            value={value.start_percent}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(start_percent) =>
                                onChange({ ...value, start_percent })
                            }
                        />
                        <SliderInputBase
                            name='loop_end_percent'
                            value={value.end_percent}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(end_percent) =>
                                onChange({ ...value, end_percent })
                            }
                        />
                        <SelectInputBase
                            name='color_correction'
                            choices={[
                                'off',
                                'mkl',
                                'hm',
                                'reinhard',
                                'mvgd',
                                'hm-mvgd-hm',
                                'hm-mkl-hm',
                            ]}
                            value={value.color_correction}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    color_correction: e.target.value,
                                })
                            }
                        />
                    </Box>
                </>
            )}
        </Box>
    );
};
