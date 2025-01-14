import { TextField, TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';

export const TextInput = ({
    defaultValue,
    ...props
}: {
    defaultValue?: any;
} & TextFieldProps) => {
    const promptCtl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    return (
        <TextField
            label={props.name}
            variant='filled'
            fullWidth
            {...promptCtl.field}
            {...props}
        />
    );
};
