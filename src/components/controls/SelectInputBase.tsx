import { MenuItem, SelectProps } from '@mui/material';
import { RefCallBack } from 'react-hook-form';
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

export const SelectInputBase = ({
    choices,
    tooltip,
    ...props
}: SelectInputProps & { selectRef?: RefCallBack }) => {
    return (
        <SelectControl
            tooltip={tooltip}
            label={`controls.${props.name}`}
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
