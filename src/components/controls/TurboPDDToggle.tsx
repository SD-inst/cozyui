import { Box } from '@mui/material';
import { ToggleInput } from './ToggleInput';

/**
 * Turbo toggle with the PDD acceleration toggle to its right. PDD is off by
 * default; when enabled it replaces the turbo/sparse/spectrum acceleration.
 */
export const TurboPDDToggle = () => (
    <Box display='flex' gap={4} alignItems='center'>
        <ToggleInput name='turbo' label='turbo' defaultValue={true} />
        <ToggleInput name='pdd' label='pdd' defaultValue={false} />
    </Box>
);
