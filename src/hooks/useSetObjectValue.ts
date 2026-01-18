import { useCallback } from 'react';
import { useRestoreValues } from './useRestoreValues';

export const useSetObjectValue = () => {
    const setValue = useRestoreValues();
    const setObjectValues = useCallback(
        (vals: any, prefix = '') => {
            if (!vals) {
                return;
            }
            Object.keys(vals).forEach((c) => {
                if (typeof vals[c] === 'object') {
                    setObjectValues(vals[c], c + '.');
                } else {
                    setValue(prefix + c, vals[c]);
                }
            });
        },
        [setValue],
    );
    return setObjectValues;
};
