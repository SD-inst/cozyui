import { Box, LinearProgress, Typography } from '@mui/material';
import { VerticalBox } from './VerticalBox';
import { useStatus } from './StatusContext';

export const Progress = () => {
    const {
        progress: { max, min, value },
        status,
        currentNode,
        queue,
        api,
    } = useStatus();
    const range = max - min;
    const perc = ((value - min) * 100) / range || 0;
    return (
        <VerticalBox width='100%'>
            {status && (
                <Typography variant='body2' color='primary'>
                    {status}
                </Typography>
            )}
            {queue > 1 ? (
                <Typography variant='body1'>Queued: {queue - 1}</Typography>
            ) : null}
            {currentNode && (
                <Typography variant='body2' color='info'>
                    Executing node:{' '}
                    {api[currentNode]?._meta?.title ||
                        api[currentNode]?.class_type}{' '}
                    [{currentNode}]
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
