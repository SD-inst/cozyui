import { Box, BoxProps, useEventCallback } from '@mui/material';
import { replaceNodeConnection } from '../../api/utils';
import { useWatchForm } from '../../hooks/useWatchForm';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

type valueType = {
    enabled: boolean;
    blocks_to_swap: number;
    vace_blocks_to_swap: number;
    offload_txt_emb: boolean;
    offload_img_emb: boolean;
};

export const KJWanBlockSwapInput = ({
    name = 'block_swap',
    ...props
}: BoxProps & { name?: string }) => {
    const handler = useEventCallback(
        (api: any, value: valueType, control: controlType) => {
            const { enabled, ...inputs } = value;
            if (!enabled || !control.loader_node_id) {
                return;
            }
            const block_swap_node = {
                inputs: {
                    ...inputs,
                    use_non_blocking: true,
                    prefetch_blocks: 1,
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
        }
    );
    useRegisterHandler({ name, handler });
    const enabled = useWatchForm(name + '.enabled');
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
            <ToggleInput name={name + '.enabled'} label='block_swap' />
            {enabled && (
                <>
                    <Box display='flex' flexDirection='row' gap={2}>
                        <SliderInput
                            name={name + '.blocks_to_swap'}
                            label='blocks_to_swap'
                            min={0}
                            max={40}
                            defaultValue={20}
                        />
                        <SliderInput
                            name={name + '.vace_blocks_to_swap'}
                            label='vace_blocks_to_swap'
                            min={0}
                            max={15}
                        />
                    </Box>
                    <Box
                        display='flex'
                        flexDirection='row'
                        flexWrap='wrap'
                        gap={2}
                    >
                        <ToggleInput
                            name={name + '.offload_txt_emb'}
                            label='offload_txt_emb'
                            defaultValue={true}
                        />
                        <ToggleInput
                            name={name + '.offload_img_emb'}
                            label='offload_img_emb'
                            defaultValue={true}
                        />
                    </Box>
                </>
            )}
        </Box>
    );
};
