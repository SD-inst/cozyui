import { createContext, Dispatch, useContext, useMemo } from 'react';

export type groupType = { [tab: string]: string };

export type receiverType = { [tab: string]: string[] };

export type WorkflowTabsType = {
    workflowTabs: string[];
    workflowTabGroups: groupType;
    receivers: receiverType;
    setWorkflowTabs: Dispatch<string[]>;
    setWorkflowTabGroups: Dispatch<groupType>;
    setReceivers: Dispatch<receiverType>;
};

export const defaultValue = {
    workflowTabs: [],
    workflowTabGroups: {},
    receivers: {},
    setWorkflowTabs: () => {},
    setWorkflowTabGroups: () => {},
    setReceivers: () => {},
};

export const WorkflowTabsContext = createContext<WorkflowTabsType>(defaultValue);

export const useFilteredTabs = (group: string) => {
    const { workflowTabs, workflowTabGroups } = useContext(WorkflowTabsContext);
    return useMemo(
        () => workflowTabs.filter((t) => workflowTabGroups[t] === group),
        [group, workflowTabGroups, workflowTabs]
    );
};
