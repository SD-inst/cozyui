import { createContext, useContext } from 'react';

export const TabContext = createContext('');

export const useCurrentTab = (tabOverride?: string) => {
    const current_tab = useContext(TabContext);
    if (tabOverride) {
        return tabOverride;
    }
    return current_tab;
};
