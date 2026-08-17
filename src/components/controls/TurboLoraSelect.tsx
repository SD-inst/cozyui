import { Box } from '@mui/material';
import { useListChoices } from '../../hooks/useListChoices';
import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';

const DEFAULT_TURBO_LORA = 'h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_resized_avg_rank_21_lightx2v_bf16.safetensors';

export const TurboLoraSelect = ({ sx }: { sx?: any }) => {
    const loras = useListChoices({
        component: 'LoraLoaderModelOnly',
        field: 'lora_name',
        index: 0,
    });
    const choices = loras
        .filter((l) => l.includes('h3') && (l.includes('h3_turbo') || l.includes('lightx2v')))
        .map((l) => ({
            text: l.slice(l.lastIndexOf('/') + 1, l.lastIndexOf('.safetensors')),
            value: l,
        }));

    return (
        <Box sx={{ mt: 2, ...sx, display: 'flex', flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 3, alignItems: 'center' }}>
            <Box sx={{ flex: 1, maxWidth: '100%' }}>
                <SelectInput
                    name='turbo_lora.lora_name'
                    label='turbo_lora'
                    choices={choices}
                    defaultValue={DEFAULT_TURBO_LORA}
                    sx={{ width: '100% !important' }}
                />
            </Box>
            <Box sx={{ flex: 1 }}>
                <SliderInput
                    name='turbo_lora.strength'
                    label='turbo_lora_strength'
                    defaultValue={1}
                    min={0}
                    max={3}
                    step={0.05}
                />
            </Box>
        </Box>
    );
};
