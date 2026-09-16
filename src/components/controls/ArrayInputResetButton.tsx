import {
    Button,
    ButtonProps,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import { useState } from 'react';
import { useWatchForm } from '../../hooks/useWatchForm';
import { useTranslate } from '../../i18n/I18nContext';

// Clears every element of an ArrayInput. Destructive, so it confirms first.
// Hides itself when the array is already at its minimum — there is nothing to
// remove in that case, mirroring DeleteArrayInputButton's `min` guard.
export const ArrayInputResetButton = ({
    name,
    min,
    onReset,
    ...props
}: {
    name: string;
    min: number;
    onReset: () => void;
} & ButtonProps) => {
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const value: any = useWatchForm(name) || [];
    if (value.length <= min) {
        return null;
    }
    return (
        <>
            <Button
                size='small'
                variant='outlined'
                color='error'
                onClick={() => setOpen(true)}
                aria-label={tr('controls.reset_array')}
                {...props}
            >
                {tr('controls.reset_array')}
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => {
                    if (e.key === 'Enter') {
                        setOpen(false);
                        onReset();
                    }
                }}
                aria-label={tr('controls.confirm_reset_array')}
            >
                <DialogTitle>{tr('controls.confirm_reset_array')}</DialogTitle>
                <DialogContent>
                    {tr('controls.confirm_reset_array_content')}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setOpen(false);
                            onReset();
                        }}
                        aria-label={tr('controls.ok')}
                    >
                        {tr('controls.ok')}
                    </Button>
                    <Button
                        onClick={() => setOpen(false)}
                        aria-label={tr('controls.cancel')}
                    >
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
