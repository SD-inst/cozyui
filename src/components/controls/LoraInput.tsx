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
                wf: any,
                values: { id: string; label: string }[]
            ) => {
                if (!values.length) {
                    return;
                }
                const last_node_id = wf.last_node_id + 1;
                const loraNodes = values.map((v) => ({
                    inputs: {
                        lora_name: v.id,
                        strength_model: 1,
                        model: ['13', 0],
                    },
                    class_type: 'LoraLoaderModelOnly',
                    _meta: {
                        title: 'LoraLoaderModelOnly',
                    },
                }));
                api['12'].inputs.model = ['' + last_node_id, 0];
                api['6'].inputs.model = ['' + last_node_id, 0];

                loraNodes.forEach((n, i) => {
                    api['' + (last_node_id + i)] = n;
                    if (i < loraNodes.length - 1) {
                        (n.inputs as any).model = [
                            '' + (last_node_id + i + 1),
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
        .filter((l) => l.includes('/hunyuan/'))
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
