import { Box, BoxProps } from '@mui/material';
import { useCallback } from 'react';
import { useController } from 'react-hook-form';
import { replaceNodeConnection } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { TextInputBase } from './TextInputBase';
import { ToggleInputBase } from './ToggleInputBase';

type valueType = {
    enabled: boolean;
    blocks_to_swap: number;
    vace_blocks_to_swap: number;
    offload_txt_emb: boolean;
    offload_img_emb: boolean;
};

export const KJWanBlockSwapInput = ({
    name,
    ...props
}: BoxProps & { name: string }) => {
    const handler = useCallback(
        (api: any, value: valueType, control?: controlType) => {
            const { enabled, ...inputs } = value;
            if (!enabled || !control || !control.loader_node_id) {
                return;
            }
            const block_swap_node = {
                inputs: {
                    ...inputs,
                    use_non_blocking: true,
                },
                class_type: 'WanVideoBlockSwap',
                _meta: {
                    title: 'WanVideo BlockSwap',
                },
            };
            replaceNodeConnection(
                api,
                control.loader_node_id,
                'block_swap_args',
                block_swap_node
            );
        },
        []
    );
    useRegisterHandler({ name, handler });
    const {
        field: { value, onChange },
    } = useController({
        name: name,
        defaultValue: {
            enabled: false,
            blocks_to_swap: 20,
            vace_blocks_to_swap: 0,
            offload_txt_emb: true,
            offload_img_emb: true,
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
                    <Box display='flex' flexDirection='row' gap={2}>
                        <TextInputBase
                            type='number'
                            name='blocks_to_swap'
                            slotProps={{ htmlInput: { min: 0, max: 40 } }}
                            value={value.blocks_to_swap}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    blocks_to_swap: parseInt(e.target.value),
                                })
                            }
                            fullWidth
                        />
                        <TextInputBase
                            type='number'
                            name='vace_blocks_to_swap'
                            slotProps={{ htmlInput: { min: 0, max: 15 } }}
                            value={value.vace_blocks_to_swap}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    vace_blocks_to_swap: parseInt(
                                        e.target.value
                                    ),
                                })
                            }
                            fullWidth
                        />
                    </Box>
                    <Box
                        display='flex'
                        flexDirection='row'
                        flexWrap='wrap'
                        gap={2}
                    >
                        <ToggleInputBase
                            name='offload_txt_emb'
                            value={value.offload_txt_emb}
                            onChange={(_, offload_txt_emb) =>
                                onChange({
                                    ...value,
                                    offload_txt_emb,
                                })
                            }
                        />
                        <ToggleInputBase
                            name='offload_img_emb'
                            value={value.offload_img_emb}
                            onChange={(_, offload_img_emb) =>
                                onChange({
                                    ...value,
                                    offload_img_emb,
                                })
                            }
                        />
                    </Box>
                </>
            )}
        </Box>
    );
};
