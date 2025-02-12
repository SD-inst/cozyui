import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useResult, useResultParam } from '../../hooks/useResult';
import { useAppDispatch } from '../../redux/hooks';
import { useTabName } from '../contexts/TabContext';
import { GenerateButton, GenerateButtonProps } from './GenerateButton';
import { delResult } from '../../redux/tab';

export const DescribeButton = ({
    field = 'prompt',
    text = 'Describe',
    api = 'Describe image',
    ...props
}: {
    field?: string;
    api?: string;
} & GenerateButtonProps) => {
    const results = useResult({ tab_override: api });
    const tab = useTabName();
    const { id } = useResultParam({ tab_override: api });
    const dispatch = useAppDispatch();
    const form = useFormContext();
    useEffect(() => {
        if (results.length) {
            form.setValue(field, results[0] as string);
            dispatch(delResult({ tab_name: tab, node_id: id }));
        }
    }, [results, form, dispatch, id, field, tab]);

    return (
        <GenerateButton tabOverride={api} text={text} hideErrors {...props} />
    );
};
