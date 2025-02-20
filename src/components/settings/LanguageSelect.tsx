import { MenuItem } from '@mui/material';
import { settings } from '../../hooks/settings';
import { useStringSetting } from '../../hooks/useStringSetting';
import { locales } from '../../i18n/locales';
import { SelectControl } from '../controls/SelectControl';
import { db } from '../history/db';

export const LanguageSelect = () => {
    const language = useStringSetting(settings.language, 'en');
    return (
        <SelectControl
            sx={{ mt: 1, width: 150 }}
            label='settings.select_language'
            value={language}
            onChange={(e) =>
                db.settings.put({
                    name: settings.language,
                    value: e.target.value,
                })
            }
            size='small'
        >
            {locales.map((v) => (
                <MenuItem key={v.name} value={v.name}>
                    {v.label}
                </MenuItem>
            ))}
        </SelectControl>
    );
};
