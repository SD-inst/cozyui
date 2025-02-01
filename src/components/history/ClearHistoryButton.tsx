import { Delete } from '@mui/icons-material';
import {
    Box,
    BoxProps,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle
} from '@mui/material';
import { useState } from 'react';
import { db } from './db';

export const ClearHistoryButton = ({ ...props }: BoxProps) => {
    const [open, setOpen] = useState(false);
    const handleOK = () => {
        db.taskResults.clear();
        setOpen(false);
    };
    return (
        <Box display='flex' justifyContent='center' width='100%' {...props}>
            <Button
                startIcon={<Delete />}
                color='error'
                variant='outlined'
                onClick={() => setOpen(true)}
            >
                Clear history
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Enter' && handleOK()}
            >
                <DialogTitle>Clear history</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete all history?
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>OK</Button>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
