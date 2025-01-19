import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectProps,
} from '@mui/material';
import { useController } from 'react-hook-form';

export const SelectInput = ({
    defaultValue = '',
    choices,
    ...props
}: {
    defaultValue?: any;
    choices: (string | { text: string; value: string })[];
} & SelectProps) => {
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });

    return (
        <FormControl fullWidth>
            <InputLabel>{props.label}</InputLabel>
            <Select {...ctl.field} {...props}>
                {choices.map((c) => (
                    <MenuItem value={typeof c === 'object' ? c.value : c}>
                        {typeof c === 'object' ? c.text : c}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};
