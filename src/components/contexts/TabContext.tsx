import { cloneDeep } from 'lodash';
import {
    createContext,
    Dispatch,
    KeyboardEvent,
    KeyboardEventHandler,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
} from 'react';

export type handlerType = {
    [control_name: string]: (api: any, value: any[]) => void;
};

export type TabContextValueType = {
    tab_name: string;
    handlers: handlerType;
    setValue: Dispatch<SetStateAction<TabContextValueType>>;
    handleCtrlEnter: KeyboardEventHandler;
};

export const tabContextdefaultValue: TabContextValueType = {
    tab_name: '',
    handlers: {},
    setValue: () => {},
    handleCtrlEnter: () => {},
};

export const TabContext = createContext(tabContextdefaultValue);

export const useCtrlEnter = () => {
    const ctx = useContext(TabContext);
    return useCallback(
        (e: KeyboardEvent) => {
            if (ctx.handleCtrlEnter) {
                ctx.handleCtrlEnter(e);
            }
        },
        [ctx]
    );
};

export const useCurrentTab = (tabOverride?: string) => {
    const { tab_name } = useContext(TabContext);
    if (tabOverride) {
        return tabOverride;
    }
    return tab_name;
};

export const useRegisterHandler = ({
    name,
    handler,
}: {
    name: string;
    handler: (api: any, value: any) => void;
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
