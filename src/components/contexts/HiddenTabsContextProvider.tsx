import { PropsWithChildren, useCallback, useState } from 'react';
import {
    defaultValue,
    groupType,
    HiddenTabsContext,
    HiddenTabsType,
} from './HiddenTabsContext';

export const HiddenTabsContextProvider = ({
    value,
    ...props
}: {
    value?: HiddenTabsType;
} & PropsWithChildren) => {
    const [state, setState] = useState<HiddenTabsType>(defaultValue);
    const setWorkflowTabs = useCallback(
        (workflowTabs: string[]) => setState((v) => ({ ...v, workflowTabs })),
        []
    );
    const setWorkflowTabGroups = useCallback(
        (workflowTabGroups: groupType) =>
            setState((v) => ({ ...v, workflowTabGroups })),
        []
    );
    return (
        <HiddenTabsContext.Provider
            value={{
                ...state,
                setWorkflowTabs,
                setWorkflowTabGroups,
                ...value,
            }}
        >
            {props.children}
        </HiddenTabsContext.Provider>
    );
};
