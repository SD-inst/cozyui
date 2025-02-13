import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectProps
} from '@mui/material';
import { useCallback, useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Optional } from './optional';
import { HelpButton } from './HelpButton';

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
    return (
        <FormControl
            fullWidth
            sx={{
                mb: 2,
                wordWrap: 'normal',
                display: 'flex',
                flexDirection: 'row',
            }}
        >
            <InputLabel>{props.label || props.name}</InputLabel>
            <Select
                label={props.label || props.name}
                {...ctl.field}
                onChange={(e) => {
                    ctl.field.onChange(e);
                    alsoSet(e.target.value as string);
                }}
                sx={{
                    '& .MuiSelect-select': {
                        whiteSpace: 'normal !important',
                    },
                    flex: 1,
                }}
                {...props}
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
            </Select>
            {tooltip && (
                <HelpButton
                    title={tooltip}
                    sx={{ position: 'relative', top: 15 }}
                />
            )}
        </FormControl>
    );
};
