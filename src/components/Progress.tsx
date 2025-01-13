import { Box, LinearProgress, Typography } from '@mui/material';
import { VerticalBox } from './VerticalBox';
import { useStatus } from './StatusContext';

export const Progress = () => {
    const {
        progress: { max, min, value },
        status,
        queue,
    } = useStatus();
    const range = max - min;
    const perc = ((value - min) * 100) / range || 0;
    return (
        <VerticalBox width='100%'>
            {status && (
                <Typography variant='body2' color='primary'>
                    {status}{' '}
                    {queue > 1 ? (
                        <Typography variant='body1'>
                            / Queued: {queue - 1}
                        </Typography>
                    ) : null}
                </Typography>
            )}
            {value >= 0 && (
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
            )}
        </VerticalBox>
    );
};
