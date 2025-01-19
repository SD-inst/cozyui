import { TextField, TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';

export const TextInput = ({
    defaultValue = '',
    ...props
}: {
    defaultValue?: any;
} & TextFieldProps) => {
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    return (
        <TextField
            sx={{
                mb: 1,
            }}
            label={props.name}
            variant='filled'
            fullWidth
            {...ctl.field}
            {...props}
        />
    );
};
