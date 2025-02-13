import { useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useResult, useResultParam } from '../../hooks/useResult';
import { useAppDispatch } from '../../redux/hooks';
import { delResult } from '../../redux/tab';
import { TabContext, useTabName } from '../contexts/TabContext';
import { TabContextProvider } from '../contexts/TabContextProvider';
import { GenerateButton, GenerateButtonProps } from './GenerateButton';

const SetResults = ({ field }: { field: string }) => {
    const results = useResult();
    const tab_name = useTabName();
    const { id } = useResultParam();
    const dispatch = useAppDispatch();
    const form = useFormContext();
    useEffect(() => {
        if (results.length) {
            form.setValue(field, results[0] as string);
            if (!id) {
                return;
            }
            dispatch(delResult({ tab_name, id }));
        }
    }, [results, form, dispatch, id, field, tab_name]);
    return null;
};

export const DescribeButton = ({
    field = 'prompt',
    text = 'Describe',
    api = 'Describe image',
    ...props
}: {
    field?: string;
    api?: string;
} & GenerateButtonProps) => {
    const tab_ctx = useContext(TabContext);
    return (
        <TabContextProvider value={{ ...tab_ctx, api }}>
            <GenerateButton text={text} hideErrors {...props} />
            <SetResults field={field} />
        </TabContextProvider>
    );
};
