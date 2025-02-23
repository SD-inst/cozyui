import { get } from 'lodash';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';
import { useFormContext } from 'react-hook-form';

export const useSetDefaults = () => {
    const tab_name = useTabName();
    const defaults = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'defaults'], null)
    );
    const isLoaded = useAppSelector((s) => s.config.loaded.every((s) => s));
    const { setValue } = useFormContext();
    return {
        isLoaded,
        setDefaults: () => {
            if (!defaults) {
                return;
            }
            Object.keys(defaults).forEach((c) => {
                setValue(c, defaults[c], { shouldDirty: false });
            });
        },
    };
};
