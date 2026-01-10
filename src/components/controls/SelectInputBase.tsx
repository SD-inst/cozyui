import { MenuItem } from '@mui/material';
import { RefCallBack } from 'react-hook-form';
import { Optional } from './optional';
import { SelectControl } from './SelectControl';
import { SelectInputProps } from './SelectInput';

export type CustomSelectInputProps = Optional<
    SelectInputProps,
    'choices' | 'defaultValue'
>;

export const SelectInputBase = ({
    choices,
    tooltip,
    label,
    ...props
}: SelectInputProps & { selectRef?: RefCallBack }) => {
    return (
        <SelectControl
            tooltip={tooltip}
            label={`controls.${label || props.name}`}
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
