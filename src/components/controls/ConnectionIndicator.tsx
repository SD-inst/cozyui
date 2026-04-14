import { useEffect, useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { Box, CSSObject } from '@mui/material';

interface ConnectionIndicatorProps {
    sx?: CSSObject;
}

export const ConnectionIndicator = ({ sx }: ConnectionIndicatorProps) => {
    const connected = useAppSelector((s) => s.progress.connected);
    const [shouldFade, setShouldFade] = useState(false);

    useEffect(() => {
        if (connected) {
            const timer = setTimeout(() => {
                setShouldFade(true);
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => {
                setShouldFade(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [connected]);

    const dotColor = connected ? '#44ff44' : '#ff4444';
    const dotShadow = connected
        ? '0 0 8px rgba(68, 255, 68, 0.6)'
        : '0 0 8px rgba(255, 68, 68, 0.6)';

    return (
        <Box
            className='connection-indicator'
            sx={{
                position: 'relative',
                width: '12px',
                height: '12px',
                display: 'inline-block',
                animation: shouldFade
                    ? 'fadeOut 1s ease forwards'
                    : 'pulse 2s ease-in-out infinite',
                ...sx,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '50%',
                    backgroundColor: dotColor,
                    boxShadow: dotShadow,
                    transition:
                        'background-color 0.5s ease, box-shadow 0.5s ease',
                }}
            />
        </Box>
    );
};
