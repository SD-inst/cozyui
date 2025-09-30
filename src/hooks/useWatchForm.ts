import { useFormContext, useWatch } from 'react-hook-form';

export const useWatchForm = (name: string) => {
    const { getValues } = useFormContext();
    return (
        useWatch({
            name,
        }) || getValues(name)
    );
};

export const useWatchFormMany = (names: string[]) => {
    const { getValues } = useFormContext();
    return (
        useWatch({
            name: names,
        }) || names.map((n) => getValues(n))
    );
};
