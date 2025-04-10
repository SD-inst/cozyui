import { TextField, TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { useCtrlEnter } from '../contexts/TabContext';
import { useTranslate } from '../../i18n/I18nContext';

export type TextInputProps = {
    defaultValue?: any;
    name: string;
} & TextFieldProps;

export const TextInput = ({ defaultValue = '', ...props }: TextInputProps) => {
    const ctl = useController({
        name: props.name,
        defaultValue: defaultValue,
    });
    const tr = useTranslate();
    const tr_key = `controls.${props.name}`;
    const ceHandler = useCtrlEnter();
    return (
        <TextField
            sx={{
                mb: 1,
            }}
            label={tr(tr_key)}
            variant='filled'
            fullWidth
            onKeyUp={(e) => {
                if (props.onKeyUp) {
                    props.onKeyUp(e);
                }
                ceHandler(e);
            }}
            {...ctl.field}
            {...props}
        />
    );
};
