import { Tab, Tabs } from '@mui/material';
import { get } from 'lodash';
import React, { useEffect, useRef } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { actionEnum, setParams, setTab } from '../redux/tab';
import { VerticalBox } from './VerticalBox';
import { useCurrentTab } from './contexts/TabContext';
import { TabContextProvider } from './contexts/TabContextProvider';

const ValuesRestore = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { action, tab, values } = useAppSelector((s) => s.tab.params);
    const dispatch = useAppDispatch();
    const tab_name = useCurrentTab();
    const defaults = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name, 'defaults'], null)
    );
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
        if (!defaults) {
            return;
        }
        Object.keys(defaults).forEach((c) => {
            setValue(c, defaults[c]);
        });
    }, [defaults, setValue]);
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
                    <ValuesRestore /> {content}
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
