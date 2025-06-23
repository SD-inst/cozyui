import { MenuItem, SelectProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { Optional } from './optional';
import { SelectControl } from './SelectControl';

export type SelectInputProps = {
    defaultValue?: any;
    choices: (
        | string
        | {
              text: string;
              value: string | number;
          }
    )[];
    tooltip?: string;
    name: string;
} & Omit<SelectProps, 'label'>;

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
    const { ref, ...field } = ctl.field;
    return (
        <SelectControl
            tooltip={tooltip}
            label={`controls.${props.name}`}
            selectRef={ref}
            {...field}
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
        </SelectControl>
    );
};
