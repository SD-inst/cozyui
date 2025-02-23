import { MenuItem } from '@mui/material';
import { settings } from '../../hooks/settings';
import { locales } from '../../i18n/locales';
import { SettingSelect } from './SettingSelect';

export const LanguageSelect = () => {
    return (
        <SettingSelect
            label='settings.select_language'
            setting={settings.language}
            defaultValue='en'
        >
            {locales.map((v) => (
                <MenuItem key={v.name} value={v.name}>
                    {v.label}
                </MenuItem>
            ))}
        </SettingSelect>
    );
};
