import { useMemo } from 'react';
import { settings } from './settings';
import { useStringSetting } from './useStringSetting';

export const useHiddenTabs = () => {
    const hiddenTabsStr = useStringSetting(settings.hidden_tabs, '[]');
    return useMemo(
        () =>
            hiddenTabsStr
                ? (JSON.parse(hiddenTabsStr) as Array<string>)
                : undefined,
        [hiddenTabsStr]
    );
};
