import { useEventCallback } from '@mui/material';
import { PropsWithChildren, useState } from 'react';
import {
    defaultValue,
    groupType,
    receiverType,
    WorkflowTabsContext,
    WorkflowTabsType,
} from './WorkflowTabsContext';

export const WorkflowTabsContextProvider = ({
    value,
    ...props
}: {
    value?: WorkflowTabsType;
} & PropsWithChildren) => {
    const [state, setState] = useState<WorkflowTabsType>(defaultValue);
    const setWorkflowTabs = useEventCallback((workflowTabs: string[]) =>
        setState((v) => ({ ...v, workflowTabs }))
    );
    const setWorkflowTabGroups = useEventCallback(
        (workflowTabGroups: groupType) =>
            setState((v) => ({ ...v, workflowTabGroups }))
    );
    const setReceivers = useEventCallback((receivers: receiverType) => {
        setState((v) => ({
            ...v,
            receivers,
        }));
    });
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
