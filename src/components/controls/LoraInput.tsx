import { Autocomplete, TextField } from '@mui/material';
import { useListChoices } from '../../hooks/useListChoices';
import { useController } from 'react-hook-form';

export const LoraInput = ({ ...props }: { name: string; label?: string }) => {
    const ctl = useController({
        name: props.name,
        defaultValue: {
            ctl_value: [],
            handler: (
                api: any,
                values: { id: string; label: string }[]
            ) => {
                if (!values.length) {
                    return;
                }
                const loraNodes = values.map((v) => ({
                    inputs: {
                        lora: v.id,
                        strength: 1,
                    },
                    class_type: 'HyVideoLoraSelect',
                    _meta: {
                        title: 'HunyuanVideo Lora Select',
                    },
                }));
                api['1'].inputs.lora = ['1000', 0];
                loraNodes.forEach((n, i) => {
                    api['' + (1000 + i)] = n;
                    if (i < loraNodes.length - 1) {
                        (n.inputs as any).prev_lora = ['' + (1001 + i)];
                    }
                });
            },
        },
    });
    const loras = useListChoices({
        component: 'HyVideoLoraSelect',
        field: 'lora',
        index: 0,
    });
    const opts = loras
        .filter((l) => l.startsWith('comfy/hunyuan/'))
        .map((l) => ({ label: l, id: l }));
    return (
        <Autocomplete
            options={opts}
            renderInput={(params) => (
                <TextField label={props.label || props.name} {...params} />
            )}
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
