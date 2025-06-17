import { Checkbox, ListItemText, MenuItem, SelectProps } from '@mui/material';
import { settings } from '../../hooks/settings';
import { useMultiSetting } from '../../hooks/useSetting';
import { SelectControl } from '../controls/SelectControl';
import { db } from '../history/db';

export const SettingMultichoice = ({
    name,
    values,
    defaultValue,
    label,
    ...props
}: {
    name: settings;
    values: string[];
    defaultValue?: string[];
    label?: string;
} & Omit<SelectProps, 'label'>) => {
    const selected = useMultiSetting(name, defaultValue);
    const updateSetting = (c: string[]) => {
        db.settings.put({ name, value: JSON.stringify(c) });
    };
    return (
        <SelectControl
            multiple
            label={label || 'settings.' + name}
            value={selected}
            size='small'
            onChange={(e) =>
                updateSetting(
                    typeof e.target.value === 'string'
                        ? e.target.value.split(',')
                        : (e.target.value as string[])
                )
            }
            renderValue={(v) =>
                typeof v === 'string' ? v : (v as string[]).join(', ')
            }
            {...props}
        >
            {values.map((v) => (
                <MenuItem value={v} key={v}>
                    <Checkbox checked={selected?.includes(v)} />
                    <ListItemText primary={v} />
                </MenuItem>
            ))}
        </SelectControl>
    );
};
