import {
    Autocomplete,
    AutocompleteRenderGetTagProps,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useConfigTab } from '../../hooks/useConfigTab';
import { useListChoices } from '../../hooks/useListChoices';
import { useRegisterHandler } from '../../hooks/useRegisterHandler';
import { getFreeNodeId } from '../../api/utils';

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
    ...props
}: {
    name: string;
    label?: string;
    filter?: string;
}) => {
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
                api['' + (last_node_id + i)] = n;
                if (i < loraNodes.length - 1) {
                    (n.inputs as any)[lora_input_name] = [
                        '' + (last_node_id + i + 1),
                        output_idx,
                    ];
                }
            });
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
        .filter((l) => (filter ? l.includes('/hunyuan/') : true))
        .map((l) => ({
            label: l.slice(
                l.lastIndexOf('/') + 1,
                l.lastIndexOf('.safetensors')
            ),
            id: l,
            strength: 1,
        }));
    return (
        <Autocomplete
            options={opts}
            renderInput={(params) => (
                <TextField label={props.label || props.name} {...params} />
            )}
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
        />
    );
};
