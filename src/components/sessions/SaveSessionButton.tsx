import { Save } from '@mui/icons-material';
import {
    Box,
    Button,
    LinearProgress,
    SxProps,
    Theme,
} from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useSaveSession } from './useSaveSession';

// Saves the current form as a session (and resets it). Rendered in GridBottom
// next to the reset button, so it lives inside the tab's FormProvider.
export const SaveSessionButton = ({ sx }: { sx?: SxProps<Theme> }) => {
    const tr = useTranslate();
    const { collecting, disabled, save } = useSaveSession();
    return (
        <Box sx={sx}>
            <Button
                size='small'
                variant='outlined'
                onClick={save}
                disabled={disabled}
                aria-label={tr('controls.save_session')}
                startIcon={<Save fontSize='small' />}
            >
                {tr('controls.save_session')}
            </Button>
            {collecting && <LinearProgress sx={{ mt: 1 }} />}
        </Box>
    );
};
