import { Typography } from '@mui/material';

export const Queue = ({ queue }: { queue: number }) => {
    if (queue < 2) {
        return null;
    }
    return <Typography variant='body1'>Queued: {queue - 1}</Typography>;
};
