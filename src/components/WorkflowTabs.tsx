import { Tab, Tabs } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { get } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import {
    FormProvider,
    useForm,
    useFormContext,
    useWatch,
} from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { actionEnum, setParams, setTab } from '../redux/tab';
import { VerticalBox } from './VerticalBox';
import { useTabName } from './contexts/TabContext';
import { TabContextProvider } from './contexts/TabContextProvider';
import { db } from './history/db';

const ValuesRestore = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { action, tab, values } = useAppSelector((s) => s.tab.params);
    const dispatch = useAppDispatch();
    const tab_name = useTabName();
    const defaults = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'defaults'], null)
    );
    const idb_state_applied = useRef(false);
    const [idb, setIdb] = useState<string | null>(null);
    useLiveQuery(async () => {
        const s = await db.formState.get(tab_name);
        if (!s) {
            setIdb('');
        } else {
            setIdb(s.state);
        }
    }, [tab]);
    const { setValue } = useFormContext();
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
        if (defaults) {
            Object.keys(defaults).forEach((c) => {
                setValue(c, defaults[c]);
            });
        }
        if (idb === '') {
            // no state in database
            idb_state_applied.current = true;
            return;
        }
        if (!idb) {
            // not loaded yet
            return;
        }
        const vals = JSON.parse(idb);
        if (vals) {
            Object.keys(vals).forEach((c) => {
                setValue(c, vals[c]);
            });
        }
        idb_state_applied.current = true;
    }, [defaults, setValue, idb]);
    const vals = useWatch();
    useEffect(() => {
        if (!idb_state_applied.current) {
            return;
        }
        db.formState.put({ tab: tab_name, state: JSON.stringify(vals) });
    }, [vals, tab_name]);
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
