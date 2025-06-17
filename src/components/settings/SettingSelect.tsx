import { settings } from '../../hooks/settings';
import { useStringSetting } from '../../hooks/useSetting';
import { SelectControl, SelectControlProps } from '../controls/SelectControl';
import { db } from '../history/db';

export const SettingSelect = ({
    setting,
    defaultValue,
    ...props
}: { setting: settings } & SelectControlProps<string>) => {
    const value = useStringSetting(setting, defaultValue);
    const { onChange, ...rest } = props;
    return (
        <SelectControl
            sx={{ width: 220 }}
            value={value}
            size='small'
            onChange={(e, c) => {
                db.settings.put({
                    name: setting,
                    value: e.target.value,
                });
                if (onChange) {
                    onChange(e, c);
                }
            }}
            {...rest}
        >
            {props.children}
        </SelectControl>
    );
};
