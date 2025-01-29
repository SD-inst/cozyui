import { Box, TextField, TextFieldProps } from '@mui/material';
import { useCallback } from 'react';
import { useController } from 'react-hook-form';
import { getFreeNodeId } from '../../api/utils';
import { useConfigTab } from '../../hooks/useConfigTab';
import { useRegisterHandler } from '../contexts/TabContext';

type negType = { neg_prompt: string; cfg: number };

export const KJHYCFG = ({
    defaultValue = { cfg: 0, neg_prompt: '' },
    label = 'Negative prompt (halves speed)',
    ...props
}: {
    defaultValue?: negType;
    name: string;
} & TextFieldProps) => {
    const { handler_options } = useConfigTab();
    const handler = useCallback(
        (api: any, value: { neg_prompt: string; cfg: string }) => {
            const cfg = parseFloat(value.cfg);
            if (!cfg) {
                return;
            }
            const hycfg_node_idx = getFreeNodeId(api);
            const hycfg_node = {
                inputs: {
                    negative_prompt: value.neg_prompt,
                    cfg,
                    start_percent: 0,
                    end_percent: 1,
                },
                class_type: 'HyVideoCFG',
                _meta: {
                    title: 'HunyuanVideo CFG',
                },
            };
            api['' + hycfg_node_idx] = hycfg_node;
            api[handler_options.node_params.text_encode_id].inputs[
                'hyvid_cfg'
            ] = ['' + hycfg_node_idx, 0];
        },
        [handler_options.node_params.text_encode_id]
    );
    useRegisterHandler({ name: props.name, handler });
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    return (
        <Box display='flex' gap={1} sx={{ mb: 2 }}>
            <TextField
                multiline
                fullWidth
                label={label || props.name}
                value={ctl.field.value.neg_prompt}
                onChange={(e) => {
                    ctl.field.onChange({
                        ...ctl.field.value,
                        neg_prompt: e.target.value,
                    });
                }}
                {...props}
            />
            <TextField
                type='number'
                label='CFG'
                name={props.name + '_cfg'}
                value={ctl.field.value.cfg}
                slotProps={{ htmlInput: { min: 0, max: 8, step: 0.1 } }}
                onChange={(e) => {
                    ctl.field.onChange({
                        ...ctl.field.value,
                        cfg: e.target.value,
                    });
                }}
            />
        </Box>
    );
};
