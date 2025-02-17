import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { locales } from '../../i18n/locales';
import { useStringSetting } from '../../hooks/useStringSetting';
import { settings } from '../../hooks/settings';
import { db } from '../history/db';

export const LanguageSelect = () => {
    const tr = useTranslate();
    const language = useStringSetting(settings.language, 'en');
    return (
        <FormControl sx={{ mt: 1 }}>
            <InputLabel>{tr('settings.select_language')}</InputLabel>
            <Select
                label={tr('settings.select_language')}
                value={language}
                onChange={(e) =>
                    db.settings.put({
                        name: settings.language,
                        value: e.target.value,
                    })
                }
                size='small'
                sx={{ width: 150 }}
            >
                {locales.map((v) => (
                    <MenuItem key={v.name} value={v.name}>
                        {v.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};
