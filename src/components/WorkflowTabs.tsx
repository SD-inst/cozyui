import { Tab, Tabs } from '@mui/material';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { GenerateButton } from './GenerateButton';
import { VerticalBox } from './VerticalBox';

export const WorkflowTabs = ({
    id,
    disabled,
    setDisabled,
    ...props
}: {
    id: string;
    disabled: boolean;
    setDisabled: (disabled: boolean) => void;
} & React.PropsWithChildren) => {
    const [currentTab, setCurrentTab] = useState(
        (React.Children.toArray(props.children)[0] as React.ReactElement).props
            .value || 0
    );
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
                        <FormProvider {...form}>
                            {content}
                            <GenerateButton
                                id={id}
                                disabled={disabled}
                                setDisabled={setDisabled}
                                tab={value}
                            />
                        </FormProvider>
                    </VerticalBox>
                );
            })}
        </>
    );
};
