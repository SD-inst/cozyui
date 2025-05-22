import { PropsWithChildren, useState } from 'react';
import {
    defaultValue,
    HiddenTabsContext,
    HiddenTabsType,
} from './HiddenTabsContext';

export const HiddenTabsContextProvider = ({
    value,
    ...props
}: {
    value?: HiddenTabsType;
} & PropsWithChildren) => {
    const [workflowTabs, setWorkflowTabs] =
        useState<HiddenTabsType>(defaultValue);
    return (
        <HiddenTabsContext.Provider
            value={{
                ...workflowTabs,
                setWorkflowTabs,
                ...value,
            }}
        >
            {props.children}
        </HiddenTabsContext.Provider>
    );
};
