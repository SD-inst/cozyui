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
                    <SliderInput
                        name='spectrum_degree'
                        label='spectrum_degree'
                        defaultValue={1}
                        min={1}
                        max={10}
                        step={1}
                    />
                    <SliderInput
                        name='spectrum_warmup_steps'
                        label='spectrum_warmup_steps'
                        defaultValue={1}
                        min={1}
                        max={20}
                        step={1}
                    />
                    <ToggleInput
                        name='spectrum_bootstrap_first_forecast'
                        label='spectrum_bootstrap_first_forecast'
                        defaultValue={true}
                    />
                </Box>
            )}
        </>
    );
};
