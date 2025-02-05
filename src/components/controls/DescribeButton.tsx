import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useResult, useResultParam } from '../../hooks/useResult';
import { useAppDispatch } from '../../redux/hooks';
import { delResult } from '../../redux/result';
import { GenerateButton, GenerateButtonProps } from './GenerateButton';

export const DescribeButton = ({
    field = 'prompt',
    text = 'Describe',
    api,
    ...props
}: {
    field?: string;
    api: string;
} & GenerateButtonProps) => {
    const results = useResult({ tabOverride: api });
    const { id } = useResultParam({ tabOverride: api });
    const dispatch = useAppDispatch();
    const form = useFormContext();
    useEffect(() => {
        if (results.length) {
            form.setValue(field, results[0] as string);
            dispatch(delResult({ node_id: id }));
        }
    }, [results, form, dispatch, id, field]);

    return (
        <GenerateButton tabOverride={api} text={text} hideErrors {...props} />
    );
};
