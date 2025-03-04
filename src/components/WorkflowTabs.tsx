import { Tab, Tabs } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { get } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FormProvider,
    useForm,
    useFormContext,
    useWatch,
} from 'react-hook-form';
import { useSetDefaults } from '../hooks/useSetDefaults';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { actionEnum, setParams, setTab } from '../redux/tab';
import { VerticalBox } from './VerticalBox';
import { useTabName } from './contexts/TabContext';
import { TabContextProvider } from './contexts/TabContextProvider';
import { db } from './history/db';

const useRestoreValues = () => {
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null)
    );
    const { setValue } = useFormContext();
    return useCallback(
        (key: string, value: any) => {
            if (!api) {
                console.log(
                    `Trying to set ${key} to ${value} but tab ${tab_name} isn't loaded yet`
                );
                return;
            }
            if (api.controls[key]) {
                setValue(key, value, { shouldDirty: false });
            }
        },
        [api, setValue, tab_name]
    );
};

const ValuesRestore = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { action, tab, values } = useAppSelector((s) => s.tab.params);
    const dispatch = useAppDispatch();
    const tab_name = useTabName();
    const defaults = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'defaults'], null)
    );
    const { isLoaded, setDefaults } = useSetDefaults();
    const [initialized, setInitialized] = useState(false);
    const idb = useLiveQuery(
        async () => (await db.formState.get(tab_name)) ?? null,
        [tab]
    );
    const setValue = useRestoreValues();
    useEffect(() => {
        if (tab !== tab_name || action !== actionEnum.RESTORE) {
            return;
        }
        Object.keys(values).forEach((k) => setValue(k, values[k]));
        dispatch(setParams({}));
        dispatch(setTab(tab_name));
        setTimeout(
            () => ref.current?.scrollIntoView({ behavior: 'smooth' }),
            0
        );
    }, [action, dispatch, setValue, tab, tab_name, values]);
    useEffect(() => {
        if (initialized || idb === undefined || !isLoaded) {
            // not loaded yet or already applied
            return;
        }
        setDefaults();
        if (idb === null) {
            // no state in database
            setInitialized(true);
            return;
        }
        const vals = JSON.parse(idb.state);
        if (vals) {
            Object.keys(vals).forEach((c) => {
                setValue(c, vals[c]);
            });
        }
        setInitialized(true);
    }, [defaults, setValue, idb, isLoaded, setDefaults, tab_name, initialized]);
    const vals = useWatch();
    useEffect(() => {
        if (!initialized) {
            return;
        }
        db.formState.put({ tab: tab_name, state: JSON.stringify(vals) });
    }, [vals, tab_name, initialized]);
    return <div ref={ref} style={{ height: 0 }} />;
};

const TabContent = ({ ...props }) => {
    const current_tab = useAppSelector((s) => s.tab.current_tab);
    const form = useForm();
    if (!React.isValidElement(props.children)) {
        return;
    }
    const { value, content } = props.children.props as any;
    return (
        <TabContextProvider value={{ tab_name: value }}>
            <VerticalBox
                mt={3}
                width='100%'
                display={current_tab === value ? 'flex' : 'none'}
            >
                <FormProvider {...form}>
                    <ValuesRestore />
                    {content}
                </FormProvider>
            </VerticalBox>
        </TabContextProvider>
    );
};

export const WorkflowTabs = ({ ...props }: React.PropsWithChildren) => {
    const { current_tab } = useAppSelector((s) => s.tab);
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (!props.children || !(props.children as any).length || current_tab) {
            return;
        }
        dispatch(setTab((props.children as any)[0].props.value));
    }, [dispatch, props.children, current_tab]);
    return (
        <>
            <Tabs
                value={current_tab}
                onChange={(_, v) => dispatch(setTab(v))}
                variant='scrollable'
                sx={{ width: '100%' }}
            >
                {React.Children.map(props.children, (c, i) => {
                    if (!React.isValidElement(c)) {
                        return;
                    }
                    const { label, value } = c.props;
                    return <Tab label={label} value={value || i} />;
                })}
            </Tabs>
            {React.Children.map(props.children, (c) => (
                <TabContent>{c}</TabContent>
            ))}
        </>
    );
};
