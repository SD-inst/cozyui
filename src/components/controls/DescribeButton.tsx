import { get } from 'lodash';
import { useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import {
    emptyResultParam,
    useResult,
    useResultParam,
} from '../../hooks/useResult';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { delResult } from '../../redux/tab';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';
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
    text = 'describe',
    api = 'Describe image',
    ...props
}: {
    field?: string;
    api?: string;
} & GenerateButtonProps) => {
    const tab_ctx = useContext(TabContext);
    const describeResultParams = useAppSelector((s) =>
        get(s, ['config', 'tabs', api, 'result'], emptyResultParam)
    );
    return (
        <TabContextProvider value={{ ...tab_ctx, api }}>
            <ResultOverrideContextProvider
                value={
                    Array.isArray(describeResultParams)
                        ? describeResultParams[0]
                        : describeResultParams
                }
            >
                <GenerateButton text={text} hideErrors noreset {...props} />
                <SetResults field={field} />
            </ResultOverrideContextProvider>
        </TabContextProvider>
    );
};
