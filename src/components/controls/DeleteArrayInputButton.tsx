import { Close } from '@mui/icons-material';
import { Button, ButtonProps } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useWatchForm } from '../../hooks/useWatchForm';

export const DeleteArrayInputButton = ({
    index,
    min,
    name,
    ...props
}: { index: number; min: number; name: string } & ButtonProps) => {
    const value: any = useWatchForm(name) || [];
    const { setValue } = useFormContext();
    const handleDelete = () => {
        setValue(name, [...value.slice(0, index), ...value.slice(index + 1)]);
    };
    if (value.length <= min) {
        return null;
    }
    return (
        <Button onClick={() => handleDelete()} {...props}>
            <Close />
        </Button>
    );
};
