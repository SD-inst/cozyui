import { Box } from '@mui/material';
import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';
import { useListChoices } from '../../hooks/useListChoices';

const DEFAULT_LORA = 'h3/minimax_h3_turbo_4step_ckpt500.safetensors';

export const TurboLoraSelect = ({ sx }: { sx?: any }) => {
    const loras = useListChoices({
        component: 'LoraLoaderModelOnly',
        field: 'lora_name',
        index: 0,
    });
    const choices = loras
        .filter((l) => l.includes('h3_turbo'))
        .map((l) => ({
            text: l.slice(l.lastIndexOf('/') + 1, l.lastIndexOf('.safetensors')),
            value: l,
        }));
    return (
        <Box sx={{ mt: 2, ...sx, display: 'flex', gap: 3, alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
                <SelectInput
                    name='turbo_lora.lora_name'
                    choices={choices}
                    defaultValue={DEFAULT_LORA}
                />
            </Box>
            <Box sx={{ flex: 1 }}>
                <SliderInput
                    name='turbo_lora.strength'
                    label='controls.turbo_lora.strength'
                    defaultValue={1}
                    min={0}
                    max={3}
                    step={0.05}
                />
            </Box>
        </Box>
    );
};
