import { Box } from '@mui/material';
import { get } from 'lodash-es';
import { useListChoices } from '../../hooks/useListChoices';
import { useAppSelector } from '../../redux/hooks';
import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';

const emptyFilter = '';

const H3_DEFAULT_TURBO_LORA =
    'h3/minimax_h3_fl2v_turbo_8step_v1.0_768p_comfyui_lightx2v_bf16.safetensors';
const H3_TURBO_VENDORS = ['turbo', 'lightx2v', 'hyperflow', 'taomate'];
const h3TurboFilter = (l: string) =>
    l.includes('minimax_h3') && H3_TURBO_VENDORS.some((v) => l.includes(v));

/**
 * Turbo LoRA picker (select + strength). `type` is the usual model-type
 * filter — the `config.loras[type].filter` path prefix used by
 * `ModelSelectAutocomplete`/`LoraInput` — and `filter` narrows the list
 * further (H3: acceleration vendors; Moss: the `8-steps` file-name prefix).
 * With no props it lists the MiniMax H3 turbo LoRAs.
 */
export const TurboLoraSelect = ({
    type,
    filter = h3TurboFilter,
    defaultValue = H3_DEFAULT_TURBO_LORA,
    sx,
}: {
    /** config.loras key of the model family, e.g. 'moss' */
    type?: string;
    filter?: (lora: string) => boolean;
    defaultValue?: string;
    sx?: any;
}) => {
    const loras = useListChoices({
        component: 'LoraLoaderModelOnly',
        field: 'lora_name',
        index: 0,
    });
    const typeFilter = useAppSelector((s) =>
        type ? get(s, ['config', 'loras', type, 'filter'], emptyFilter) : emptyFilter,
    );
    const choices = loras
        .filter(
            (l) =>
                (!typeFilter || l.includes(typeFilter)) &&
                (filter ? filter(l) : true),
        )
        .map((l) => ({
            text: l.slice(
                l.lastIndexOf('/') + 1,
                l.lastIndexOf('.safetensors'),
            ),
            value: l,
        }));

    return (
        <Box
            sx={{
                mt: 2,
                ...sx,
                display: 'flex',
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: 3,
                alignItems: 'center',
            }}
        >
            <Box sx={{ flex: 1, maxWidth: '100%' }}>
                <SelectInput
                    name='turbo_lora.lora_name'
                    label='turbo_lora'
                    choices={choices}
                    defaultValue={defaultValue}
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
