import { useFormContext } from 'react-hook-form';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';
import { useEventCallback } from '@mui/material';
import { get } from 'lodash';
import { useCallback } from 'react';
import { hasRegisteredField } from '../utils/registeredFields';

export const useRestoreValues = () => {
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null),
    );
    const { setValue, control } = useFormContext();
    const setObjectValues = useCallback(
        (key: string, value: any) => {
            if (!value) {
                return;
            }
            Object.keys(value).forEach((c) => {
                const field = key ? key + '.' + c : c;
                // Skip leftover values for controls that no longer exist —
                // neither a config binding nor a mounted control remains, so
                // restoring them would only trigger "Missing API bindings"
                // on the next generation.
                if (
                    key === '' &&
                    !api?.controls[c] &&
                    !hasRegisteredField(control, c)
                ) {
                    return;
                }
                if (typeof value[c] === 'object') {
                    if (Array.isArray(value[c])) {
                        setValue(field, value[c], { shouldDirty: false });
                    } else {
                        setObjectValues(field, value[c]);
                    }
                } else {
                    setValue(
                        api?.controls[field]?.set_field || field,
                        value[c],
                        {
                            shouldDirty: false,
                        },
                    );
                }
            });
        },
        [api?.controls, control, setValue],
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
            setObjectValues(key, value);
        }
    });
};
