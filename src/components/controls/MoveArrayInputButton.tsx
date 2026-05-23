import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { IconButton, IconButtonProps } from '@mui/material';
import { useFieldArray } from 'react-hook-form';
import { useWatchForm } from '../../hooks/useWatchForm';

export const MoveArrayInputButton = ({
    index,
    name,
    direction,
    ...props
}: { index: number; name: string; direction: 'up' | 'down' } & IconButtonProps) => {
    const value: any = useWatchForm(name) || [];
    const { swap } = useFieldArray({ name });

    if (direction === 'up') {
        if (index === 0) {
            return null;
        }
        return (
            <IconButton onClick={() => swap(index, index - 1)} {...props}>
                <ArrowUpward />
            </IconButton>
        );
    }

    if (direction === 'down') {
        if (index >= value.length - 1) {
            return null;
        }
        return (
            <IconButton onClick={() => swap(index, index + 1)} {...props}>
                <ArrowDownward />
            </IconButton>
        );
    }

    return null;
};
