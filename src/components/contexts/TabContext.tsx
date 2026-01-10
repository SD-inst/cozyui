import { useEventCallback } from '@mui/material';
import { cloneDeep } from 'lodash';
import {
    createContext,
    Dispatch,
    KeyboardEvent,
    KeyboardEventHandler,
    SetStateAction,
    useContext,
    useEffect,
} from 'react';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { controlType } from '../../redux/config';

export type handlerType = {
    [control_name: string]: (
        api: any,
        value: any[],
        control: controlType
    ) => void;
};

/**
 * Sets execution and result parameters for a tab (workflow), also allows overriding these parameters for special cases
 * @param tab_name the result branch to store the output
 * @param api which API graph to use, if empty then @see tab_name is used for this
 */
export type TabContextValueType = {
    tab_name: string;
    api: string;
    handlers: handlerType;
    setValue: Dispatch<SetStateAction<TabContextValueType>>;
    handleCtrlEnter: KeyboardEventHandler;
};

export const tabContextdefaultValue: TabContextValueType = {
    tab_name: '',
    api: '',
    handlers: {},
    setValue: () => {},
    handleCtrlEnter: () => {},
};

export const TabContext = createContext(tabContextdefaultValue);

export const useCtrlEnter = () => {
    const ctx = useContext(TabContext);
    return useEventCallback((e: KeyboardEvent) => {
        if (ctx.handleCtrlEnter) {
            ctx.handleCtrlEnter(e);
        }
    });
};

export const useTabName = () => {
    const { tab_name } = useContext(TabContext);
    return tab_name;
};

export const useIsCurrentTab = () => {
    const { tab_name } = useContext(TabContext);
    const current_tab = useCurrentTab();
    return tab_name === current_tab;
};

export const useRegisterHandler = ({
    name,
    handler,
}: {
    name: string;
    handler: (api: any, value: any, control: controlType) => void;
}) => {
    const { setValue } = useContext(TabContext);
    useEffect(() => {
        setValue((s: any) => ({
            ...s,
            handlers: { ...s.handlers, [name]: handler },
        }));
        return () =>
            setValue((s: any) => {
                const handlers = cloneDeep(s.handlers);
                delete handlers[name];
                return {
                    ...s,
                    handlers,
                };
            }); // remove handler on unmount
    }, [name, handler, setValue]);
};

export const useHandlers = () => {
    const { handlers } = useContext(TabContext);
    return handlers;
};
