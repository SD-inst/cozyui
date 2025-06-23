import { TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { TextInputBase } from './TextInputBase';

export type TextInputProps = {
    defaultValue?: any;
    name: string;
    tooltip?: string;
} & TextFieldProps;

export const TextInput = ({ defaultValue = '', ...props }: TextInputProps) => {
    const ctl = useController({
        name: props.name,
        defaultValue: defaultValue,
    });
    return (
        <TextInputBase
            sx={{
                mb: 1,
            }}
            variant='filled'
            fullWidth
            {...ctl.field}
            {...props}
        />
    );
};
