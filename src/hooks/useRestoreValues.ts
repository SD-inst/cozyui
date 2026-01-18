import { useFormContext } from 'react-hook-form';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';
import { useEventCallback } from '@mui/material';
import { get } from 'lodash';
import { useCallback } from 'react';

export const useRestoreValues = () => {
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null),
    );
    const { setValue } = useFormContext();
    const setObjectValues = useCallback(
        (key: string, value: any) => {
            if (!value) {
                return;
            }
            Object.keys(value).forEach((c) => {
                const field = key ? key + '.' + c : c;
                if (typeof value[c] === 'object') {
                    if (Array.isArray(value[c])) {
                        setValue(field, value[c], { shouldDirty: false });
                    } else {
                        setObjectValues(field, value[c]);
                    }
                } else {
                    setValue(field, value[c], { shouldDirty: false });
                }
            });
        },
        [setValue],
    );
    return useEventCallback((key: string, value: any) => {
        if (!api) {
            console.log(
                `Trying to set ${key} to ${value} but tab ${tab_name} isn't loaded yet`,
            );
            return;
        }
        const apiKey = key.split('.')[0]; // use the first name component for API lookups
        if (key === '' || api.controls[apiKey]) {
            if (
                typeof value === 'string' &&
                key !== '' &&
                api.controls[apiKey].set_field
            ) {
                // only use the set_field parameter for string values that are
                // used with send/receive
                setValue(api.controls[apiKey].set_field, value, {
                    shouldDirty: false,
                });
            } else {
                setObjectValues(key, value);
            }
        }
    });
};
