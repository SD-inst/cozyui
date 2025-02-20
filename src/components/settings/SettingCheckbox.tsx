import {
    Checkbox,
    FormControlLabel,
    FormControlLabelProps,
} from '@mui/material';
import { useBooleanSetting } from '../../hooks/useBooleanSetting';
import { settings } from '../../hooks/settings';
import { db } from '../history/db';
import { useTranslate } from '../../i18n/I18nContext';

export const SettingCheckbox = ({
    name,
    ...props
}: {
    name: settings;
} & Omit<FormControlLabelProps, 'control' | 'label'>) => {
    const tr = useTranslate();
    const value = useBooleanSetting(name);
    const updateSetting = (c: boolean) => {
        db.settings.put({ name, value: '' + c });
    };
    return (
        <FormControlLabel
            control={
                <Checkbox
                    checked={value}
                    onChange={(_, c) => updateSetting(c)}
                />
            }
            label={tr(`settings.${name}`)}
            {...props}
        />
    );
};
