import { Box, BoxProps, useEventCallback } from '@mui/material';
import { useController } from 'react-hook-form';
import { getFreeNodeId } from '../../api/utils';
import { useAPI } from '../../hooks/useAPI';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type valueType = {
    enabled: boolean;
    double_blocks_to_swap: number;
    single_blocks_to_swap: number;
    offload_txt_in: boolean;
    offload_img_in: boolean;
};

export const KJHYBlockSwapInput = ({
    name,
    ...props
}: { name: string } & BoxProps) => {
    const { handler_options } = useAPI();
    const handler = useEventCallback((api: any, value: valueType) => {
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
        api[handler_options.node_params.loader_id].inputs.block_swap_args = [
            '' + idx,
            0,
        ];
    });
    useRegisterHandler({ name, handler });
    const {
        field: { value },
    } = useController({
        name,
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
            <ToggleInput name={name + '.enabled'} />
            {value.enabled && (
                <>
                    <Box display='flex' flexDirection='row' gap={2}>
                        <SliderInput
                            name={name + '.single_blocks_to_swap'}
                            label='single_blocks'
                            max={40}
                            min={0}
                        />
                        <SliderInput
                            name={name + '.double_blocks_to_swap'}
                            label='double_blocks'
                            max={20}
                            min={0}
                        />
                    </Box>
                    <Box
                        display='flex'
                        flexDirection='row'
                        flexWrap='wrap'
                        gap={2}
                    >
                        <ToggleInput
                            name={name + '.offload_txt_in'}
                            label='offload_txt_in'
                        />
                        <ToggleInput
                            name={name + '.offload_img_in'}
                            label='offload_img_in'
                        />
                    </Box>
                </>
            )}
        </Box>
    );
};
