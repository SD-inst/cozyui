import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectProps,
} from '@mui/material';
import { useCallback, useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';

export const SelectInput = ({
    defaultValue = '',
    choices,
    ...props
}: {
    defaultValue?: any;
    choices: (
        | string
        | {
              text: string;
              value: string;
              alsoSet?: [{ name: string; value: string }];
          }
    )[];
} & SelectProps) => {
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    const { setValue } = useFormContext();
    const alsoSet = useCallback(
        (value: string) => {
            const c = choices.find(
                (v) => typeof v === 'object' && v.value === value && v.alsoSet
            );
            if (c !== undefined) {
                (c as any).alsoSet.map((v: any) => setValue(v.name, v.value));
            }
        },
        [choices]
    );
    useEffect(() => {
        alsoSet(defaultValue);
    }, [defaultValue]);
    return (
        <FormControl fullWidth>
            <InputLabel>{props.label || props.name}</InputLabel>
            <Select
                label={props.label || props.name}
                {...ctl.field}
                onChange={(e) => {
                    ctl.field.onChange(e);
                    alsoSet(e.target.value as string);
                }}
                {...props}
            >
                {choices.map((c) => (
                    <MenuItem
                        key={c.toString()}
                        value={typeof c === 'object' ? c.value : c}
                    >
                        {typeof c === 'object' ? c.text : c}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};
