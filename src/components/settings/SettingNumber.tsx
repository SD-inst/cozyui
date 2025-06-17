import { TextField, TextFieldProps } from '@mui/material';
import { settings } from '../../hooks/settings';
import { useNumberSetting } from '../../hooks/useSetting';
import { useTranslate } from '../../i18n/I18nContext';
import { db } from '../history/db';

export const SettingNumber = ({
    name,
    defaultValue,
    ...props
}: {
    name: settings;
    defaultValue: number;
} & Omit<TextFieldProps, 'label'>) => {
    const tr = useTranslate();
    const value = useNumberSetting(name, defaultValue);
    const updateSetting = (c: string) => {
        db.settings.put({ name, value: '' + c });
    };
    return (
        <TextField
            value={value}
            slotProps={{ input: { type: 'number' } }}
            onChange={(e) => updateSetting(e.target.value)}
            label={tr(`settings.${name}`)}
            size='small'
            {...props}
        />
    );
};
