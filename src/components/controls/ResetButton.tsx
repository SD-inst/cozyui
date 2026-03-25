import {
    Button,
    ButtonProps,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useSetDefaults } from '../../hooks/useSetDefaults';
import { useTranslate } from '../../i18n/I18nContext';
import { db } from '../history/db';
import { useTabName } from '../contexts/TabContext';

export const ResetButton = ({ ...props }: ButtonProps) => {
    const { reset } = useFormContext();
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const { isLoaded, setDefaults } = useSetDefaults();
    const tab_name = useTabName();
    const handleOK = () => {
        setOpen(false);
        db.formState.delete(tab_name).finally(() => {
            reset();
            setDefaults();
        });
    };
    return (
        <>
            <Button
                size='small'
                variant='outlined'
                color='error'
                onClick={() => setOpen(true)}
                disabled={!isLoaded}
                aria-label={tr('controls.reset_form')}
                aria-disabled={!isLoaded}
                {...props}
            >
                {tr('controls.reset_form')}
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Enter' && handleOK()}
                aria-label={tr('controls.confirm_reset')}
                role="dialog"
                aria-modal="true"
            >
                <DialogTitle>{tr('controls.confirm_reset')}</DialogTitle>
                <DialogContent>
                    {tr('controls.confirm_reset_content')}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK} aria-label={tr('controls.ok')}>
                        {tr('controls.ok')}
                    </Button>
                    <Button onClick={() => setOpen(false)} aria-label={tr('controls.cancel')}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
