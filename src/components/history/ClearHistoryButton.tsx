import { Delete } from '@mui/icons-material';
import {
    Box,
    BoxProps,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@mui/material';
import { useState } from 'react';
import { db, markEnum, TaskResult } from './db';
import { useTranslate } from '../../i18n/I18nContext';

const clear_filter = (c: TaskResult) => c.mark === markEnum.NONE;

export const ClearHistoryButton = ({ ...props }: BoxProps) => {
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const [openNothing, setOpenNothing] = useState(false);
    const [number, setNumber] = useState('0');
    const [unit, setUnit] = useState('seconds');
    const [newer, setNewer] = useState(false);
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
        const wc = db.taskResults.where('timestamp');
        let coll = null;
        if (newer) {
            coll = wc.above(seconds);
        } else {
            coll = wc.below(seconds);
        }
        const cnt = await coll.filter(clear_filter).count();
        if (!cnt) {
            setOpenNothing(true);
        } else {
            setToDelete(cnt);
            setOpen(true);
        }
    };
    const handleOK = async () => {
        const wc = db.taskResults.where('timestamp');
        let coll = null;
        if (newer) {
            coll = wc.above(seconds);
        } else {
            coll = wc.below(seconds);
        }
        coll.filter(clear_filter).delete();
        setOpen(false);
    };
    const cmp = tr(newer ? 'settings.newer' : 'settings.older');
    return (
        <Box
            display='flex'
            flexWrap='wrap'
            justifyContent='center'
            width='100%'
            gap={1}
            {...props}
        >
            <FormControl>
                <TextField
                    sx={{ width: 70 }}
                    size='small'
                    type='number'
                    slotProps={{ htmlInput: { min: 0 } }}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                />
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>{tr('settings.unit')}</InputLabel>
                <Select
                    size='small'
                    label={tr('settings.unit')}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                >
                    {[
                        'seconds',
                        'minutes',
                        'hours',
                        'days',
                        'weeks',
                        'months',
                        'years',
                    ].map((v) => (
                        <MenuItem key={v} value={v}>
                            {tr(`settings.${v}`, {
                                smart_count: parseInt(number) || 0,
                            })}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <FormControlLabel
                sx={{ minWidth: 100 }}
                label={tr('settings.newer')}
                control={
                    <Checkbox
                        checked={newer}
                        onChange={(_, c) => setNewer(c)}
                    />
                }
            />
            <Button
                startIcon={<Delete />}
                color='error'
                variant='outlined'
                onClick={handleDelete}
            >
                {tr('settings.clear', { cmp })}
            </Button>
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                onKeyUp={(e) => e.key === 'Esc' && setOpen(false)}
            >
                <DialogTitle>{tr('settings.clear_history')}</DialogTitle>
                <DialogContent
                    dangerouslySetInnerHTML={{
                        __html: tr('settings.clear_history_text', {
                            cmp: cmp.toLowerCase(),
                            number,
                            unit: tr(`settings.${unit}`, {
                                smart_count: number,
                            }),
                            toDelete: tr('settings.to_delete', {
                                smart_count: toDelete,
                            }),
                        }),
                    }}
                ></DialogContent>
                <DialogActions>
                    <Button onClick={handleOK}>{tr('controls.ok')}</Button>
                    <Button onClick={() => setOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openNothing}
                onClose={() => setOpenNothing(false)}
                onKeyUp={(e) => e.key === 'Esc' && setOpenNothing(false)}
            >
                <DialogTitle>{tr('settings.nothing_to_delete')}</DialogTitle>
                <DialogContent>
                    {tr('settings.nothing_to_delete_text', {
                        cmp: cmp.toLowerCase(),
                        number,
                        unit: tr(`settings.${unit}`, { smart_count: number }),
                    })}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenNothing(false)}>OK</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
