import { TextField, TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { useCtrlEnter } from '../contexts/TabContext';

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
    const ceHanler = useCtrlEnter();
    return (
        <TextField
            sx={{
                mb: 1,
            }}
            label={props.name}
            variant='filled'
            fullWidth
            onKeyUp={ceHanler}
            {...ctl.field}
            {...props}
        />
    );
};
