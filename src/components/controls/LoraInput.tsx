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
import { useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useListChoices } from '../../hooks/useListChoices';

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
    }, [open]);
    const slashIdx = value.label.lastIndexOf('/');
    const sftIdx = value.label.lastIndexOf('.safetensors');
    const labelTrimmed = value.label.substring(slashIdx + 1, sftIdx);
    return (
        <>
            <Chip
                variant='outlined'
                label={`${labelTrimmed}:${value.strength}`}
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
    input_node_id,
    output_node_ids,
    filter,
    ...props
}: {
    name: string;
    label?: string;
    input_node_id: string;
    output_node_ids: string[];
    filter?: string;
}) => {
    const { setValue } = useFormContext();
    const ctl = useController({
        name: props.name,
        defaultValue: {
            ctl_value: [],
            handler: (api: any, wf: any, values: valueType[]) => {
                if (!values.length) {
                    return;
                }
                const last_node_id = wf.last_node_id + 1;
                const loraNodes = values.map((v) => ({
                    inputs: {
                        lora_name: v.id,
                        strength_model: v.strength,
                        model: [input_node_id, 0],
                    },
                    class_type: 'LoraLoaderModelOnly',
                    _meta: {
                        title: 'LoraLoaderModelOnly',
                    },
                }));
                output_node_ids.forEach(
                    (id) => (api[id].inputs.model = ['' + last_node_id, 0])
                );

                loraNodes.forEach((n, i) => {
                    api['' + (last_node_id + i)] = n;
                    if (i < loraNodes.length - 1) {
                        (n.inputs as any).model = [
                            '' + (last_node_id + i + 1),
                            0,
                        ];
                    }
                });
            },
        },
    });
    const loras = useListChoices({
        component: 'LoraLoaderModelOnly',
        field: 'lora_name',
        index: 0,
    });
    const opts = loras
        .filter((l) => (filter ? l.includes('/hunyuan/') : true))
        .map((l) => ({ label: l, id: l, strength: 1 }));
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
                            setValue(props.name, {
                                ...ctl.field.value,
                                ctl_value: [
                                    ...values.slice(0, i),
                                    { ...values[i], strength },
                                    ...values.slice(i + 1),
                                ],
                            });
                        }}
                    />
                ))
            }
            fullWidth
            {...ctl.field}
            value={ctl.field.value.ctl_value}
            onChange={(_, v) => {
                ctl.field.onChange({ ...ctl.field.value, ctl_value: v });
            }}
            multiple
            {...props}
        />
    );
};
