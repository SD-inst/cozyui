import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { IconButton, IconButtonProps } from '@mui/material';
import React from 'react';
import { useWatchForm } from '../../hooks/useWatchForm';

// Longer than the flip-toolkit default animation (450ms) so the scroll
// targets the element's final position once the reorder animation is done.
const FLIP_ANIMATION_MS = 500;

export const MoveArrayInputButton = ({
    index,
    name,
    direction,
    onSwap,
    ...props
}: {
    index: number;
    name: string;
    direction: 'up' | 'down';
    onSwap: (a: number, b: number) => void;
} & IconButtonProps) => {
    const value: any = useWatchForm(name) || [];

    const handleMove = (e: React.MouseEvent) => {
        const el = (e.currentTarget as HTMLElement).closest('.array-input-item') as
            | HTMLElement
            | null;
        if (direction === 'up') {
            onSwap(index, index - 1);
        } else {
            onSwap(index, index + 1);
        }
        if (el) {
            setTimeout(() => {
                if (el.isConnected) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, FLIP_ANIMATION_MS);
        }
    };

    if (direction === 'up') {
        if (index === 0) {
            return null;
        }
        return (
            <IconButton onClick={handleMove} {...props}>
                <ArrowUpward />
            </IconButton>
        );
    }

    if (direction === 'down') {
        if (index >= value.length - 1) {
            return null;
        }
        return (
            <IconButton onClick={handleMove} {...props}>
                <ArrowDownward />
            </IconButton>
        );
    }

    return null;
};
