import { Tab, Tabs } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { GenerateButton } from './GenerateButton';
import { TabContext } from './TabContext';
import { VerticalBox } from './VerticalBox';

export const WorkflowTabs = ({
    id,
    ...props
}: {
    id: string;
} & React.PropsWithChildren) => {
    const [currentTab, setCurrentTab] = useState(
        (React.Children.toArray(props.children)[0] as React.ReactElement).props
            .value || 0
    );
    const { data, error, isError, isSuccess } = useGet('tabs.json');
    useEffect(() => {
        if (isSuccess) {
            toast.success('Got tabs');
            return;
        }
        if (!isError) {
            return;
        }
        toast.error('Error getting tabs: ' + error);
    }, [isError, error, isSuccess]);
    return (
        <>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
                {React.Children.map(props.children, (c, i) => {
                    if (!React.isValidElement(c)) {
                        return;
                    }
                    const { label, value } = c.props;
                    return <Tab label={label} value={value || i} />;
                })}
            </Tabs>
            {React.Children.map(props.children, (c, i) => {
                if (!React.isValidElement(c)) {
                    return;
                }
                const { value, content } = c.props;
                if (currentTab !== (value || i)) {
                    return null;
                }
                const form = useForm();
                return (
                    <VerticalBox mt={3}>
                        <TabContext.Provider
                            value={isSuccess && data[value] ? data[value] : {}}
                        >
                            <FormProvider {...form}>
                                {content}
                                <GenerateButton />
                            </FormProvider>
                        </TabContext.Provider>
                    </VerticalBox>
                );
            })}
        </>
    );
};
