// The hammer for the case where the local database is beyond repair — a wedged
// IndexedDB on Safari, a history that no longer loads. Deleting the database is
// the only thing that recovers it, and it is also the one action in the settings
// that cannot be undone in any way, so a single OK is not enough: the delete
// button stays dead until the user types the phrase the dialog itself shows.
// The expected text and the displayed text are the same translated string, so a
// translation can never move them apart.
import { DeleteForever } from '@mui/icons-material';
import {
    Box,
    BoxProps,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    useEventCallback,
} from '@mui/material';
import { useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import {
    deleteDatabaseWithin,
    requestDatabaseReset,
} from '../../utils/resetDatabase';

export const ResetDatabaseButton = ({ ...props }: BoxProps) => {
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const phrase = tr('settings.reset_database_phrase');
    const confirmed =
        typed.trim().toLowerCase() === phrase.trim().toLowerCase();
    const close = () => {
        setOpen(false);
        setTyped('');
    };
    const reset = useEventCallback(async () => {
        setBusy(true);
        try {
            // A deletion is blocked while any tab holds the database, and a
            // blocked one never completes by itself — so it gets a timeout
            // rather than a spinner forever.
            await deleteDatabaseWithin(4000);
        } catch {
            // This page is the tab holding it (or the database is wedged):
            // reload and let the entry module delete it before anything
            // connects.
            requestDatabaseReset();
        }
        window.location.reload();
    });
    return (
        <>
            <Box {...props}>
                <Button
                    startIcon={<DeleteForever />}
                    color='error'
                    variant='outlined'
                    onClick={() => setOpen(true)}
                >
                    {tr('settings.reset_database')}
                </Button>
            </Box>
            <Dialog open={open} onClose={busy ? undefined : close}>
                <DialogTitle>{tr('settings.reset_database')}</DialogTitle>
                <DialogContent>
                    <Typography variant='body2'>
                        {tr('settings.reset_database_text')}
                    </Typography>
                    <Typography variant='body2' color='error' sx={{ mt: 2 }}>
                        {tr('settings.reset_database_type', { phrase })}
                    </Typography>
                    <TextField
                        fullWidth
                        size='small'
                        sx={{ mt: 1 }}
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        disabled={busy}
                        error={typed.length > 0 && !confirmed}
                        helperText={
                            typed.length > 0 && !confirmed
                                ? tr('settings.reset_database_no_match')
                                : ' '
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        color='error'
                        disabled={!confirmed || busy}
                        onClick={reset}
                    >
                        {busy
                            ? tr('settings.reset_database_busy')
                            : tr('settings.reset_database')}
                    </Button>
                    <Button disabled={busy} onClick={close}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
