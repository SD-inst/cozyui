import { Tab, Tabs } from '@mui/material';
import React, { createContext, useContext } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setTab } from '../redux/tab';
import { VerticalBox } from './VerticalBox';

const TabContext = createContext('');

export const useCurrentTab = (tabOverride?: string) => {
    const current_tab = useContext(TabContext);
    if (tabOverride) {
        return tabOverride;
    }
    return current_tab;
};

const TabContent = ({ ...props }) => {
    const current_tab = useAppSelector((s) => s.tab.current_tab);
    const form = useForm();
    if (
        !React.isValidElement(props.children) ||
        (props.children.type as any).name !== 'WFTab'
    ) {
        return;
    }
    const { value, content } = props.children.props as any;
    return (
        <TabContext.Provider value={value}>
            <VerticalBox
                mt={3}
                width='100%'
                display={current_tab === value ? 'flex' : 'none'}
            >
                <FormProvider {...form}>{content}</FormProvider>
            </VerticalBox>
        </TabContext.Provider>
    );
};

export const WorkflowTabs = ({ ...props }: React.PropsWithChildren) => {
    const { current_tab } = useAppSelector((s) => s.tab);
    const dispatch = useAppDispatch();
    return (
        <>
            <Tabs
                value={current_tab}
                onChange={(_, v) => {
                    dispatch(setTab(v));
                }}
                variant='scrollable'
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
