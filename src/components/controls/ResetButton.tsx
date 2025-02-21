import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ButtonProps,
} from '@mui/material';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslate } from '../../i18n/I18nContext';

export const ResetButton = ({ ...props }: ButtonProps) => {
    const { reset } = useFormContext();
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const handleOK = () => {
        setOpen(false);
        reset();
    };
    return (
        <>
            <Button
                size='small'
                variant='outlined'
                color='error'
                onClick={() => setOpen(true)}
                {...props}
            >
                {tr('controls.reset_form')}
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Enter' && handleOK()}
            >
                <DialogTitle>{tr('controls.confirm_reset')}</DialogTitle>
                <DialogContent>
                    {tr('controls.confirm_reset_content')}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>{tr('controls.ok')}</Button>
                    <Button onClick={() => setOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
