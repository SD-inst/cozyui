import { Delete } from '@mui/icons-material';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import { useState } from 'react';
import { db } from './db';
import { useTranslate } from '../../i18n/I18nContext';

export const DeleteButton = ({ id }: { id: number }) => {
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const handleOK = () => {
        db.taskResults.delete(id);
        setOpen(false);
    };
    return (
        <>
            <Button
                variant='outlined'
                color='error'
                size='small'
                onClick={() => setOpen(true)}
            >
                <Delete />
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Enter' && handleOK()}
            >
                <DialogTitle>{tr('controls.delete_result')}</DialogTitle>
                <DialogContent>
                    {tr('controls.confirm_delete_result')}
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
