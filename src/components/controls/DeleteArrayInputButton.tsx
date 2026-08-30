import { Close } from '@mui/icons-material';
import { Button, ButtonProps } from '@mui/material';
import { useWatchForm } from '../../hooks/useWatchForm';

export const DeleteArrayInputButton = ({
    index,
    min,
    name,
    onRemove,
    ...props
}: {
    index: number;
    min: number;
    name: string;
    onRemove: (index: number) => void;
} & ButtonProps) => {
    const value: any = useWatchForm(name) || [];
    if (value.length <= min) {
        return null;
    }
    return (
        <Button onClick={() => onRemove(index)} {...props}>
            <Close />
        </Button>
    );
};
