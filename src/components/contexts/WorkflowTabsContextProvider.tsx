import { PropsWithChildren, useCallback, useState } from 'react';
import {
    defaultValue,
    groupType,
    WorkflowTabsContext,
    WorkflowTabsType,
    receiverType
} from './WorkflowTabsContext';

export const WorkflowTabsContextProvider = ({
    value,
    ...props
}: {
    value?: WorkflowTabsType;
} & PropsWithChildren) => {
    const [state, setState] = useState<WorkflowTabsType>(defaultValue);
    const setWorkflowTabs = useCallback(
        (workflowTabs: string[]) => setState((v) => ({ ...v, workflowTabs })),
        []
    );
    const setWorkflowTabGroups = useCallback(
        (workflowTabGroups: groupType) =>
            setState((v) => ({ ...v, workflowTabGroups })),
        []
    );
    const setReceivers = useCallback((receivers: receiverType) => {
        setState((v) => ({
            ...v,
            receivers,
        }));
    }, []);
    return (
        <WorkflowTabsContext.Provider
            value={{
                ...state,
                setWorkflowTabs,
                setWorkflowTabGroups,
                setReceivers,
                ...value,
            }}
        >
            {props.children}
        </WorkflowTabsContext.Provider>
    );
};
