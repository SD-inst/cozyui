import { TextField, TextFieldProps } from '@mui/material';
import { settings } from '../../hooks/settings';
import { useSettingEditor } from '../../hooks/useSetting';
import { useTranslate } from '../../i18n/I18nContext';

export const SettingNumber = ({
    name,
    defaultValue,
    ...props
}: {
    name: settings;
    defaultValue: number;
} & Omit<TextFieldProps, 'label'>) => {
    const tr = useTranslate();
    const [value, updateSetting] = useSettingEditor(name, '' + defaultValue);
    return (
        <TextField
            value={value}
            slotProps={{ input: { type: 'number' } }}
            onChange={(e) => updateSetting(e.target.value)}
            label={tr(`settings.${name}`)}
            aria-label={tr(`settings.${name}`)}
            size='small'
            {...props}
        />
    );
};
