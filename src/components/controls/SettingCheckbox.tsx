import {
    Checkbox,
    FormControlLabel,
    FormControlLabelProps,
} from '@mui/material';
import { settings, useBooleanSetting } from '../../hooks/useSaveOutputsLocally';
import { db } from '../history/db';

export const SettingCheckbox = ({
    name,
    label,
    ...props
}: {
    name: settings;
    label: string;
} & Omit<FormControlLabelProps, 'control'>) => {
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
            label={label}
            {...props}
        />
    );
};
