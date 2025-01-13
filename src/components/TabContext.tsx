import { createContext, useContext } from 'react';

export const TabContext = createContext<TabBinding>({
    workflow: '',
    api: '',
    controls: {},
    result: {
        id: '',
        type: '',
    },
});

type TabBinding = {
    workflow: string;
    api: string;
    controls: {
        [control: string]: {
            id: string;
            field: string;
        };
    };
    result: {
        id: string;
        type: string;
    };
};

export const useTabContext = () => useContext<TabBinding>(TabContext);
