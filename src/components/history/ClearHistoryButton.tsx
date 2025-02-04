import { Delete } from '@mui/icons-material';
import {
    Box,
    BoxProps,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';
import { useState } from 'react';
import { db } from './db';

export const ClearHistoryButton = ({ ...props }: BoxProps) => {
    const [open, setOpen] = useState(false);
    const [openNothing, setOpenNothing] = useState(false);
    const [number, setNumber] = useState('0');
    const [unit, setUnit] = useState('seconds');
    const [toDelete, setToDelete] = useState(0);
    const seconds =
        new Date().getTime() -
        1000 *
            (() => {
                const result = parseInt(number);
                switch (unit) {
                    case 'minutes':
                        return result * 60;
                    case 'hours':
                        return result * 60 * 60;
                    case 'days':
                        return result * 60 * 60 * 24;
                    case 'weeks':
                        return result * 60 * 60 * 24 * 7;
                    case 'months':
                        return result * 60 * 60 * 24 * 30;
                    case 'years':
                        return result * 60 * 60 * 24 * 365;
                    default:
                        return result;
                }
            })();
    const handleDelete = async () => {
        const cnt = await db.taskResults
            .where('timestamp')
            .below(seconds)
            .count();
        if (!cnt) {
            setOpenNothing(true);
        } else {
            setToDelete(cnt);
            setOpen(true);
        }
    };
    const handleOK = async () => {
        db.taskResults.where('timestamp').below(seconds).delete();
        setOpen(false);
    };
    return (
        <Box
            display='flex'
            justifyContent='center'
            width='100%'
            gap={1}
            {...props}
        >
            <TextField
                sx={{ flex: 1 }}
                size='small'
                type='number'
                slotProps={{ htmlInput: { min: 0 } }}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
            />
            <FormControl sx={{ flex: 2 }}>
                <InputLabel>Unit</InputLabel>
                <Select
                    size='small'
                    label='Unit'
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                >
                    <MenuItem value='seconds'>seconds</MenuItem>
                    <MenuItem value='minutes'>minutes</MenuItem>
                    <MenuItem value='hours'>hours</MenuItem>
                    <MenuItem value='days'>days</MenuItem>
                    <MenuItem value='weeks'>weeks</MenuItem>
                    <MenuItem value='months'>months</MenuItem>
                    <MenuItem value='years'>years</MenuItem>
                </Select>
            </FormControl>
            <Button
                startIcon={<Delete />}
                color='error'
                variant='outlined'
                onClick={handleDelete}
            >
                Clear older than
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Esc' && setOpen(false)}
            >
                <DialogTitle>Clear history</DialogTitle>
                <DialogContent>
                    {`Are you sure you want to delete history older than ${number} ${unit}? ${toDelete} results will be deleted.`}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>OK</Button>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openNothing}
                onClose={() => setOpenNothing(false)}
                onKeyUp={(e) => e.key === 'Esc' && setOpenNothing(false)}
            >
                <DialogTitle>Nothing to delete</DialogTitle>
                <DialogContent>
                    {`There are no results older than ${number} ${unit}`}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenNothing(false)}>OK</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
