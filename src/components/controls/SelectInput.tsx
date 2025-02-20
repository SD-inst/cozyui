import { MenuItem, SelectProps } from '@mui/material';
import { useCallback, useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Optional } from './optional';
import { SelectControl } from './SelectControl';

export type SelectInputProps = {
    defaultValue?: any;
    choices: (
        | string
        | {
              text: string;
              value: string;
              alsoSet?: { name: string; value: string }[];
          }
    )[];
    tooltip?: string;
    name: string;
} & SelectProps;

export type CustomSelectInputProps = Optional<
    SelectInputProps,
    'choices' | 'defaultValue'
>;

export const SelectInput = ({
    defaultValue = '',
    choices,
    tooltip,
    ...props
}: SelectInputProps) => {
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
        [choices, setValue]
    );
    useEffect(() => {
        alsoSet(defaultValue);
    }, [defaultValue, alsoSet]);
    const { ref, ...field } = ctl.field;
    return (
        <SelectControl
            tooltip={tooltip}
            label={`controls.${props.name}`}
            selectRef={ref}
            {...field}
            onChange={(e) => {
                ctl.field.onChange(e);
                alsoSet(e.target.value as string);
            }}
        >
            {choices.map((c) => (
                <MenuItem
                    sx={{ whiteSpace: 'normal' }}
                    key={JSON.stringify(c)}
                    value={typeof c === 'object' ? c.value : c}
                >
                    {typeof c === 'object' ? c.text : c}
                </MenuItem>
            ))}
        </SelectControl>
    );
};
