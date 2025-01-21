import { useFormContext, useWatch } from 'react-hook-form';

export const useWatchForm = (name: string) => {
    const { getValues } = useFormContext();
    return (
        useWatch({
            name,
        }) || getValues(name)
    );
};
