import {
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from '@mui/material';
import { useStringSetting } from '../../hooks/useSetting';
import { settings } from '../../hooks/settings';
import { db } from '../history/db';
import { useTranslate } from '../../i18n/I18nContext';

/**
 * A tri-state setting: empty = not set (falls back to the config value),
 * 'true'/'false' = explicit override. Used for the LLM media capability
 * overrides, where the default lives in config.json but the user may pick
 * a model with different capabilities.
 */
export const SettingTriState = ({ name }: { name: settings }) => {
    const tr = useTranslate();
    const value = useStringSetting(name, '');
    const label = tr(`settings.${name}`);
    const choices = [
        { value: '', label: tr('settings.override_auto') },
        { value: 'true', label: tr('settings.override_on') },
        { value: 'false', label: tr('settings.override_off') },
    ];
    return (
        <FormControl size='small' sx={{ flex: 1, minWidth: 200 }}>
            <InputLabel>{label}</InputLabel>
            <Select
                fullWidth
                value={value}
                label={label}
                onChange={(e) =>
                    db.settings.put({ name, value: e.target.value })
                }
            >
                {choices.map((c) => (
                    <MenuItem key={c.value || 'auto'} value={c.value}>
                        {c.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};
