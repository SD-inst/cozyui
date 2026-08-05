import { Box } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { SliderInput } from './SliderInput';
import { ToggleInput } from './ToggleInput';

export const MiniMaxH3SpectrumControls = () => {
    const spectrumEnabled = useWatch({
        name: 'spectrum_enabled',
        defaultValue: true,
    });

    return (
        <>
            <ToggleInput
                name='spectrum_enabled'
                label='spectrum_enabled'
                defaultValue={true}
            />
            {spectrumEnabled && (
                <Box display='flex' flexDirection='column' gap={2}>
                    <SliderInput
                        name='spectrum_blend_weight'
                        label='spectrum_blend_weight'
                        defaultValue={0.5}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                    <SliderInput
                        name='spectrum_flex_window'
                        label='spectrum_flex_window'
                        defaultValue={0.75}
                        min={0}
                        max={5}
                        step={0.05}
                    />
                </Box>
            )}
        </>
    );
};
