import { Box, Slider, Typography } from '@mui/material';
import type { SliderProps } from '@mui/material';

export interface ToolbarSliderProps {
    label: string;
    valueLabel: string;
    sliderProps: SliderProps;
}

/**
 * A styled slider component for toolbar use with dark theme.
 * Includes label, slider, and value display.
 */
export function ToolbarSlider({
    label,
    valueLabel,
    sliderProps,
}: ToolbarSliderProps) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
                flex: '1 1 200px',
            }}
        >
            <Typography
                variant='body2'
                sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
            >
                {label}
            </Typography>
            <Slider
                {...sliderProps}
                size='small'
                sx={{
                    flex: 1,
                    minWidth: 60,
                    color: 'white',
                    '& .MuiSlider-thumb': { width: 14, height: 14 },
                    '& .MuiSlider-track': { height: 4 },
                    '& .MuiSlider-rail': {
                        height: 4,
                        opacity: 0.3,
                    },
                    ...sliderProps.sx,
                }}
            />
            <Typography
                variant='body2'
                sx={{
                    minWidth: 35,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                }}
            >
                {valueLabel}
            </Typography>
        </Box>
    );
}
