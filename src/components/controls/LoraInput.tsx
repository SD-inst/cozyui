import { Refresh } from '@mui/icons-material';
import {
    Autocomplete,
    AutocompleteProps,
    AutocompleteRenderGetTagProps,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { getFreeNodeId } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useConfigTab } from '../../hooks/useConfigTab';
import { useListChoices } from '../../hooks/useListChoices';
import { useRegisterHandler } from '../contexts/TabContext';
import toast from 'react-hot-toast';

type valueType = { id: string; label: string; strength: number };

const LoraChip = ({
    getTagProps,
    index,
    value,
    onOK,
}: {
    getTagProps: AutocompleteRenderGetTagProps;
    index: number;
    value: valueType;
    onOK: (strength: number) => void;
}) => {
    const { key, ...tagProps } = getTagProps({ index });
    const [open, setOpen] = useState(false);
    const [strength, setStrength] = useState('' + value.strength);
    const ref = useRef<HTMLInputElement>(null);
    const handleOK = () => {
        onOK(parseFloat(strength) || 1);
        setOpen(false);
    };
    useEffect(() => {
        if (!open) {
            return;
        }
        setStrength('' + value.strength);
        setTimeout(() => ref.current?.focus(), 100);
    }, [open, value.strength]);
    return (
        <>
            <Chip
                variant='outlined'
                label={`${value.label}:${value.strength}`}
                key={key}
                onClick={() => setOpen(true)}
                sx={{
                    height: 'auto',
                    '& .MuiChip-label': {
                        display: 'block',
                        whiteSpace: 'normal',
                        wordBreak: 'break-all',
                    },
                }}
                {...tagProps}
            />
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Change lora weight</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        value={strength}
                        type='number'
                        slotProps={{
                            htmlInput: { step: 0.05, min: 0, max: 3 },
                        }}
                        inputRef={ref}
                        onChange={(e) => setStrength(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleOK();
                            }
                            e.stopPropagation();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>OK</Button>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export const LoraInput = ({
    filter,
    append,
    ...props
}: {
    name: string;
    label?: string;
    filter?: string;
    append?: valueType[];
} & Omit<
    AutocompleteProps<valueType, true, any, any>,
    'renderInput' | 'options'
>) => {
    const qc = useQueryClient();
    const apiUrl = useApiURL();
    const { setValue } = useFormContext();
    const {
        lora_params: {
            api_input_name,
            lora_input_name,
            input_node_id,
            output_idx,
            output_node_ids,
            class_name,
            strength_field_name,
            name_field_name,
        },
    } = useConfigTab();
    const handler = useCallback(
        (api: any, values: valueType[]) => {
            if (append) {
                values = values.concat(append);
            }
            if (!values.length) {
                return;
            }
            const last_node_id = getFreeNodeId(api);
            const additional_fields = {} as any;
            if (class_name === 'HunyuanVideoLoraLoader') {
                additional_fields.blocks_type = 'double_blocks';
            }
            if (input_node_id) {
                additional_fields[lora_input_name] = [
                    input_node_id,
                    output_idx,
                ];
            }
            const loraNodes = values.map((v) => ({
                inputs: {
                    [name_field_name]: v.id,
                    [strength_field_name]: v.strength,
                    ...additional_fields,
                },
                class_type: class_name,
                _meta: {
                    title: class_name,
                },
            }));
            output_node_ids.forEach(
                (id) =>
                    (api[id].inputs[api_input_name] = [
                        '' + last_node_id,
                        output_idx,
                    ])
            );

            loraNodes.forEach((n, i) => {
                if (
                    n.class_type === 'HyVideoLoraSelect' &&
                    append?.every((an) => an.id !== n.inputs[name_field_name])
                ) {
                    (n.inputs as any).blocks = ['1000', 0];
                }

                api['' + (last_node_id + i)] = n;
                if (i < loraNodes.length - 1) {
                    (n.inputs as any)[lora_input_name] = [
                        '' + (last_node_id + i + 1),
                        output_idx,
                    ];
                }
            });

            if (class_name === 'HyVideoLoraSelect') {
                const block_edit = {
                    '1000': {
                        inputs: {} as any,
                        class_type: 'HyVideoLoraBlockEdit',
                        _meta: {
                            title: 'HunyuanVideo Lora Block Edit',
                        },
                    },
                };
                Object.assign(api, block_edit);
                for (let i = 0; i <= 19; i++) {
                    block_edit['1000'].inputs[`double_blocks.${i}.`] = true;
                }
                for (let i = 0; i <= 39; i++) {
                    block_edit['1000'].inputs[`single_blocks.${i}.`] = false;
                }
            }
        },
        [
            api_input_name,
            lora_input_name,
            input_node_id,
            output_idx,
            output_node_ids,
            class_name,
            name_field_name,
            strength_field_name,
            append,
        ]
    );
    useRegisterHandler({ name: props.name, handler });
    const ctl = useController({
        name: props.name,
        defaultValue: [],
    });
    const loras = useListChoices({
        component: 'LoraLoaderModelOnly',
        field: 'lora_name',
        index: 0,
    });
    const opts = loras
        .filter((l) => (filter ? l.includes(filter) : true))
        .map((l) => ({
            label: l.slice(
                l.lastIndexOf('/') + 1,
                l.lastIndexOf('.safetensors')
            ),
            id: l,
            strength: 1,
        }));
    return (
        <Box display='flex' gap={1}>
            <Autocomplete
                renderTags={(values, getTagProps) =>
                    values.map((v, i) => (
                        <LoraChip
                            key={getTagProps({ index: i }).key}
                            getTagProps={getTagProps}
                            index={i}
                            value={v}
                            onOK={(strength: number) => {
                                setValue(props.name, [
                                    ...values.slice(0, i),
                                    { ...values[i], strength },
                                    ...values.slice(i + 1),
                                ]);
                            }}
                        />
                    ))
                }
                fullWidth
                {...ctl.field}
                onChange={(_, v) => ctl.field.onChange(v)}
                multiple
                {...props}
                options={opts}
                renderInput={(params) => (
                    <TextField label={props.label || props.name} {...params} />
                )}
            />
            <Button
                variant='outlined'
                onClick={() =>
                    qc
                        .invalidateQueries({
                            queryKey: [apiUrl + '/api/object_info'],
                        })
                        .then(() => toast.success('Reloaded objects'))
                }
            >
                <Refresh />
            </Button>
        </Box>
    );
};
