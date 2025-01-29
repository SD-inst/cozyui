import { Box, FormControlLabel, Switch, TextField } from '@mui/material';
import { useController } from 'react-hook-form';
import { useRegisterHandler } from '../contexts/TabContext';
import { useCallback } from 'react';
import { getFreeNodeId } from '../../api/utils';
import { useConfigTab } from '../../hooks/useConfigTab';

type valueType = {
    enabled: boolean;
    double_blocks_to_swap: number;
    single_blocks_to_swap: number;
    offload_txt_in: boolean;
    offload_img_in: boolean;
};

export const BlockSwapInput = ({ ...props }) => {
    const { handler_options } = useConfigTab();
    const handler = useCallback(
        (api: any, value: valueType) => {
            const { enabled, ...inputs } = value;
            if (!enabled) {
                return;
            }
            const block_swap_node = {
                inputs,
                class_type: 'HyVideoBlockSwap',
                _meta: {
                    title: 'HunyuanVideo BlockSwap',
                },
            };
            const idx = getFreeNodeId(api);
            api[idx] = block_swap_node;
            api[handler_options.node_params.loader_id].inputs.block_swap_args =
                ['' + idx, 0];
        },
        [handler_options.node_params.loader_id]
    );
    useRegisterHandler({ name: props.name, handler });
    const {
        field: { value, onChange },
    } = useController({
        name: props.name,
        defaultValue: {
            enabled: false,
            double_blocks_to_swap: 20,
            single_blocks_to_swap: 0,
            offload_txt_in: true,
            offload_img_in: true,
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
            <FormControlLabel
                label='Enable block switch (saves VRAM, slow)'
                control={
                    <Switch
                        checked={value.enabled}
                        onChange={(_, enabled) =>
                            onChange({ ...value, enabled })
                        }
                    />
                }
            />
            <Box display='flex' flexDirection='row' gap={2}>
                <TextField
                    type='number'
                    label='single blocks'
                    slotProps={{ htmlInput: { min: 0, max: 40 } }}
                    value={value.single_blocks_to_swap}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            single_blocks_to_swap: e.target.value,
                        })
                    }
                    fullWidth
                />
                <TextField
                    type='number'
                    label='double blocks'
                    slotProps={{ htmlInput: { min: 0, max: 20 } }}
                    value={value.double_blocks_to_swap}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            double_blocks_to_swap: e.target.value,
                        })
                    }
                    fullWidth
                />
            </Box>
            <Box display='flex' flexDirection='row' gap={2}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={value.offload_txt_in}
                            onChange={(_, offload_txt_in) =>
                                onChange({
                                    ...value,
                                    offload_txt_in,
                                })
                            }
                        />
                    }
                    label='Offload txt in'
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={value.offload_img_in}
                            onChange={(_, offload_img_in) =>
                                onChange({
                                    ...value,
                                    offload_img_in,
                                })
                            }
                        />
                    }
                    label='Offload img in'
                />
            </Box>
        </Box>
    );
};
