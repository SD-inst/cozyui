import { Restore } from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from '@mui/material';
import { useContext, useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';

export const ResetTabOrderButton = () => {
    const tr = useTranslate();
    const { resetTabOrder } = useContext(WorkflowTabsContext);
    const [open, setOpen] = useState(false);
    const handleReset = () => {
        resetTabOrder();
        setOpen(false);
    };
    return (
        <>
            <Box>
                <Button
                    startIcon={<Restore />}
                    variant='outlined'
                    onClick={() => setOpen(true)}
                >
                    {tr('settings.tab_order_reset')}
                </Button>
            </Box>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Esc' && setOpen(false)}
            >
                <DialogTitle>{tr('settings.tab_order_reset')}</DialogTitle>
                <DialogContent>
                    {tr('settings.tab_order_reset_text')}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleReset}>
                        {tr('settings.tab_order_reset_ok')}
                    </Button>
                    <Button onClick={() => setOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
