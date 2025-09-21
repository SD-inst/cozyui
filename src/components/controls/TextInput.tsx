import { TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { TextInputBase } from './TextInputBase';

export type TextInputProps = {
    defaultValue?: any;
    name: string;
    tooltip?: string;
} & TextFieldProps;

export const TextInput = ({ defaultValue = '', sx, ...props }: TextInputProps) => {
    const {
        field: { ref, ...rest },
    } = useController({
        name: props.name,
        defaultValue: defaultValue,
    });
    return (
        <TextInputBase
            sx={{
                mb: 1,
                ...sx
            }}
            baseRef={ref}
            variant='filled'
            fullWidth
            {...rest}
            {...props}
        />
    );
};
