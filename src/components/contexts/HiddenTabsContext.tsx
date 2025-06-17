import { createContext, Dispatch, useContext, useMemo } from 'react';

export type groupType = { [tab: string]: string };

export type HiddenTabsType = {
    workflowTabs: string[];
    workflowTabGroups: groupType;
    setWorkflowTabs: Dispatch<string[]>;
    setWorkflowTabGroups: Dispatch<groupType>;
};

export const defaultValue = {
    workflowTabs: [],
    workflowTabGroups: {},
    setWorkflowTabs: () => {},
    setWorkflowTabGroups: () => {},
};

export const HiddenTabsContext = createContext<HiddenTabsType>(defaultValue);

export const useFilteredTabs = (group: string) => {
    const { workflowTabs, workflowTabGroups } = useContext(HiddenTabsContext);
    return useMemo(
        () => workflowTabs.filter((t) => workflowTabGroups[t] === group),
        [group, workflowTabGroups, workflowTabs]
    );
};
