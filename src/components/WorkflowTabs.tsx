import { Tab, Tabs } from '@mui/material';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setTab } from '../redux/tab';
import { VerticalBox } from './VerticalBox';

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
            >
                {React.Children.map(props.children, (c, i) => {
                    if (!React.isValidElement(c)) {
                        return;
                    }
                    const { label, value } = c.props;
                    return <Tab label={label} value={value || i} />;
                })}
            </Tabs>
            {React.Children.map(props.children, (c, i) => {
                const form = useForm();
                if (!React.isValidElement(c)) {
                    return;
                }
                const { value, content } = c.props;
                return (
                    <VerticalBox
                        mt={3}
                        width='100%'
                        display={current_tab === (value || i) ? 'flex' : 'none'}
                    >
                        <FormProvider {...form}>{content}</FormProvider>
                    </VerticalBox>
                );
            })}
        </>
    );
};
