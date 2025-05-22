import { createContext, Dispatch, SetStateAction } from 'react';

export type HiddenTabsType = {
    workflowTabs: string[];
    setWorkflowTabs: Dispatch<SetStateAction<HiddenTabsType>>;
};

export const defaultValue = {
    workflowTabs: [],
    setWorkflowTabs: () => {},
};

export const HiddenTabsContext = createContext<HiddenTabsType>(defaultValue);
