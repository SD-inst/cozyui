import { TextField, TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';

export const TextInput = ({
    defaultValue,
    onChange,
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
            sx={{ width: 500 }}
            {...promptCtl.field}
            {...props}
        />
    );
};
