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
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import { getFreeNodeId } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useConfigTab } from '../../hooks/useConfigTab';
import { useListChoices } from '../../hooks/useListChoices';
import { useRegisterHandler } from '../contexts/TabContext';
import { mergeType } from '../../api/mergeType';

type valueType = {
    id: string;
    label: string;
    strength: number;
    merge: mergeType;
};

const LoraChip = ({
    getTagProps,
    index,
    value,
    onOK,
}: {
    getTagProps: AutocompleteRenderGetTagProps;
    index: number;
    value: valueType;
    onOK: (strength: number, merge: mergeType) => void;
}) => {
    const { key, ...tagProps } = getTagProps({ index });
    const [open, setOpen] = useState(false);
    const [strength, setStrength] = useState('' + value.strength);
    const [merge, setMerge] = useState(value.merge);
    const ref = useRef<HTMLInputElement>(null);
    const handleOK = () => {
        onOK(parseFloat(strength) || 1, merge);
        setOpen(false);
    };
    useEffect(() => {
        if (!open) {
            return;
        }
        setStrength('' + value.strength);
        setMerge(value.merge);
        setTimeout(() => ref.current?.focus(), 100);
    }, [open, value.merge, value.strength]);
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
                <DialogContent
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                >
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
                    <FormControl fullWidth>
                        <InputLabel>Merge type</InputLabel>
                        <Select
                            label='Merge type'
                            value={merge}
                            onChange={(e) =>
                                setMerge(e.target.value as mergeType)
                            }
                        >
                            <MenuItem value={mergeType.SINGLE}>
                                Single only
                            </MenuItem>
                            <MenuItem value={mergeType.DOUBLE}>
                                Double only
                            </MenuItem>
                            <MenuItem value={mergeType.FULL}>Full</MenuItem>
                        </Select>
                    </FormControl>
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
    sx,
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
    const disable_lora_filter = localStorage.getItem('disable_lora_filter');
    const qc = useQueryClient();
    const apiUrl = useApiURL();
    const { setValue } = useFormContext();
    const {
        handler_options: {
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
            if (class_name === 'HunyuanVideoLoraLoader') {
                loraNodes.forEach((n, i) => {
                    n.inputs.blocks_type =
                        values[i].merge === mergeType.DOUBLE
                            ? 'double_blocks'
                            : values[i].merge === mergeType.SINGLE
                            ? 'single_blocks'
                            : 'all';
                });
            }
            output_node_ids.forEach(
                (id) =>
                    (api[id].inputs[api_input_name] = [
                        '' + last_node_id,
                        output_idx,
                    ])
            );

            loraNodes.forEach((n, i) => {
                api['' + (last_node_id + i)] = n;
                if (i < loraNodes.length - 1) {
                    (n.inputs as any)[lora_input_name] = [
                        '' + (last_node_id + i + 1),
                        output_idx,
                    ];
                }
            });

            const block_edit_idx = getFreeNodeId(api);
            if (class_name === 'HyVideoLoraSelect') {
                const createBlockEdit = (
                    block_edit_idx: number,
                    name: string,
                    single: boolean,
                    double: boolean
                ) => {
                    const block_edit = {
                        ['' + block_edit_idx]: {
                            inputs: {} as any,
                            class_type: 'HyVideoLoraBlockEdit',
                            _meta: {
                                title: name,
                            },
                        },
                    };
                    for (let i = 0; i <= 19; i++) {
                        block_edit['' + block_edit_idx].inputs[
                            `double_blocks.${i}.`
                        ] = double;
                    }
                    for (let i = 0; i <= 39; i++) {
                        block_edit['' + block_edit_idx].inputs[
                            `single_blocks.${i}.`
                        ] = single;
                    }
                    return block_edit;
                };
                const single_only = createBlockEdit(
                    block_edit_idx,
                    'Single only',
                    true,
                    false
                );
                const double_only = createBlockEdit(
                    block_edit_idx + 1,
                    'Double only',
                    false,
                    true
                );
                Object.assign(api, single_only, double_only);
                loraNodes.forEach((n, i) => {
                    if (values[i].merge < mergeType.FULL) {
                        (n.inputs as any).blocks = [
                            '' + (block_edit_idx + values[i].merge),
                            0,
                        ];
                    }
                });
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
        .filter((l) =>
            filter && !disable_lora_filter ? l.includes(filter) : true
        )
        .map((l) => ({
            label: l.slice(
                l.lastIndexOf('/') + 1,
                l.lastIndexOf('.safetensors')
            ),
            id: l,
            strength: 1,
            merge: mergeType.DOUBLE,
        }));
    return (
        <Box display='flex' gap={1} sx={sx}>
            <Autocomplete
                renderTags={(values, getTagProps) =>
                    values.map((v, i) => (
                        <LoraChip
                            key={getTagProps({ index: i }).key}
                            getTagProps={getTagProps}
                            index={i}
                            value={v}
                            onOK={(strength: number, merge: mergeType) => {
                                setValue(props.name, [
                                    ...values.slice(0, i),
                                    { ...values[i], strength, merge },
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
