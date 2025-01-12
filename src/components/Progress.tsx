import { Box, LinearProgress, Typography } from '@mui/material';

export const Progress = ({
    min,
    max,
    value,
}: {
    min: number;
    max: number;
    value: number;
}) => {
    const range = max - min;
    const perc = ((value - min) * 100) / range || 0;
    if (value < 0) {
        return null;
    }
    return (
        <Box display='flex' gap={1} width='100%'>
            <LinearProgress
                sx={{ width: '100%', height: 20 }}
                variant='determinate'
                color='success'
                value={perc}
            />
            <Typography variant='body2' color='secondary'>
                {Math.floor(perc) + '%'}
            </Typography>
        </Box>
    );
};
