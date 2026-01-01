import { Close } from '@mui/icons-material';
import { Button, ButtonProps } from '@mui/material';
import { useFieldArray } from 'react-hook-form';
import { useWatchForm } from '../../hooks/useWatchForm';

export const DeleteArrayInputButton = ({
    index,
    min,
    name,
    ...props
}: { index: number; min: number; name: string } & ButtonProps) => {
    const value: any = useWatchForm(name) || [];
    const { remove } = useFieldArray({ name });
    if (value.length <= min) {
        return null;
    }
    return (
        <Button onClick={() => remove(index)} {...props}>
            <Close />
        </Button>
    );
};
