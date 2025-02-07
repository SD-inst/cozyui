import { Box, LinearProgress, Typography } from '@mui/material';
import { useAppSelector } from '../redux/hooks';
import { VerticalBox } from './VerticalBox';
import { get } from 'lodash';
import { useTaskDuration } from '../hooks/useTaskDuration';
import { useEffect } from 'react';

export const Progress = () => {
    const { max, min, value, status, current_node, queue } = useAppSelector(
        (s) => s.progress
    );
    const dur = useTaskDuration();
    const api = useAppSelector((s) => s.tab.api);
    const range = max - min;
    const perc = ((value - min) * 100) / range || 0;
    const node_title = get(
        api,
        [current_node, '_meta.title'],
        get(api, [current_node, 'class_type'], current_node)
    );
    useEffect(() => {
        const title = document.title;
        if (perc > 0) {
            document.title = `[${Math.round(perc)}%] ${title}`;
        }
        return () => {
            document.title = title;
        };
    }, [perc]);
    return (
        <VerticalBox width='100%'>
            {status && (
                <Typography variant='body2' color='primary'>
                    {status} {dur ? `[${dur}]` : ''}
                </Typography>
            )}
            {queue > 1 ? (
                <Typography variant='body1'>Queued: {queue - 1}</Typography>
            ) : null}
            {current_node && (
                <Typography variant='body2' color='info'>
                    {node_title} [{current_node}]
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
