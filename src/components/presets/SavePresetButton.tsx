import { Bookmarks } from '@mui/icons-material';
import { Box, Button, LinearProgress } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { SavePresetDialog } from './SavePresetDialog';
import { useSavePreset } from './useSavePreset';

export const SavePresetButton = () => {
    const tr = useTranslate();
    const {
        open,
        collecting,
        saving,
        draft,
        setDraft,
        startCapture,
        close,
        save,
    } = useSavePreset();
    return (
        <Box>
            <Button
                startIcon={<Bookmarks />}
                onClick={startCapture}
                disabled={collecting}
                sx={{ mb: 1 }}
            >
                {tr('presets.save_current')}
            </Button>
            {collecting && <LinearProgress sx={{ mt: 1 }} />}
            {open && draft && (
                <SavePresetDialog
                    open={open}
                    draft={draft}
                    setDraft={setDraft}
                    onClose={close}
                    onSave={save}
                    saving={saving}
                    collecting={collecting}
                />
            )}
        </Box>
    );
};
