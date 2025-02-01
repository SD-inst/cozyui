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

export const DeleteButton = ({ id }: { id: number; }) => {
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
                <DialogTitle>Delete result</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete this result?
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>OK</Button>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
