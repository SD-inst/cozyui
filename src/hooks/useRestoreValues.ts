import { useFormContext } from 'react-hook-form';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';
import { useEventCallback } from '@mui/material';
import { get } from 'lodash';

export const useRestoreValues = () => {
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null),
    );
    const { setValue } = useFormContext();
    return useEventCallback((key: string, value: any) => {
        if (!api) {
            console.log(
                `Trying to set ${key} to ${value} but tab ${tab_name} isn't loaded yet`,
            );
            return;
        }
        const apiKey = key.split('.')[0]; // use the first name component for API lookups
        if (api.controls[apiKey]) {
            if (typeof value === 'string' && api.controls[apiKey].set_field) {
                // only use the set_field parameter for string values that are
                // used with send/receive
                setValue(api.controls[apiKey].set_field, value, {
                    shouldDirty: false,
                });
            } else {
                setValue(key, value, { shouldDirty: false });
            }
        }
    });
};
