import { TextField, TextFieldProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { useCtrlEnter } from '../contexts/TabContext';
import { useTranslate } from '../../i18n/I18nContext';

export const TextInput = ({
    defaultValue = '',
    ...props
}: {
    defaultValue?: any;
    name: string;
} & TextFieldProps) => {
    const ctl = useController({
        name: props.name,
        defaultValue: defaultValue,
    });
    const tr = useTranslate();
    const tr_key = `controls.${props.name}`;
    const ceHanler = useCtrlEnter();
    return (
        <TextField
            sx={{
                mb: 1,
            }}
            label={tr(tr_key)}
            variant='filled'
            fullWidth
            onKeyUp={ceHanler}
            {...ctl.field}
            {...props}
        />
    );
};
