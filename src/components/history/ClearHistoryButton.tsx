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
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import { useCallback, useContext, useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { FilterContext } from '../contexts/FilterContext';
import { SelectControl } from '../controls/SelectControl';
import { db, markEnum, TaskResult } from './db';
import { usePkFromFilter } from './filter';

export const ClearHistoryButton = ({ ...props }: BoxProps) => {
    const tr = useTranslate();
    const pkFromFilter = usePkFromFilter();
    const [openConfirm, setOpenConfirm] = useState(false);
    const [openNothing, setOpenNothing] = useState(false);
    const [openCleanup, setOpenCleanup] = useState(false);
    const [number, setNumber] = useState('0');
    const [unit, setUnit] = useState('seconds');
    const [newer, setNewer] = useState(true);
    const [toDelete, setToDelete] = useState(0);
    const filter = useContext(FilterContext);
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
    const filterFunc = useCallback(
        (t: TaskResult) =>
            (newer ? t.timestamp > seconds : t.timestamp < seconds) &&
            (filter.pinned
                ? t.mark === markEnum.PINNED
                : t.mark !== markEnum.PINNED),
        [filter.pinned, newer, seconds]
    );
    const handleConfirmDelete = useCallback(async () => {
        const coll = await pkFromFilter(filterFunc);
        const cnt = coll.length;
        if (!cnt) {
            setOpenNothing(true);
        } else {
            setToDelete(cnt);
            setOpenConfirm(true);
        }
    }, [filterFunc, pkFromFilter]);
    const handleDelete = useCallback(async () => {
        const coll = await pkFromFilter(filterFunc);
        db.taskResults.bulkDelete(coll);
        setOpenConfirm(false);
        setTimeout(() => setOpenCleanup(false), 0);
    }, [filterFunc, pkFromFilter]);
    const cmp = tr(newer ? 'settings.newer' : 'settings.older');
    return (
        <>
            <Box>
                <Button
                    startIcon={<Delete />}
                    color='error'
                    variant='outlined'
                    onClick={() => setOpenCleanup(true)}
                >
                    {tr('settings.clear_history')}
                </Button>
            </Box>
            <Dialog
                open={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onKeyUp={(e) => e.key === 'Esc' && setOpenConfirm(false)}
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
                    <Button onClick={handleDelete}>{tr('controls.ok')}</Button>
                    <Button onClick={() => setOpenConfirm(false)}>
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
            <Dialog open={openCleanup} onClose={() => setOpenCleanup(false)}>
                <DialogTitle>{tr('settings.clear_history')}</DialogTitle>
                <DialogContent>
                    {filter.prompt && (
                        <Typography variant='body2' color='warning'>
                            {tr('settings.prompt_active', {
                                prompt: filter.prompt,
                            })}
                        </Typography>
                    )}
                    {filter.pinned && (
                        <Typography variant='body2' color='error'>
                            {tr('settings.pinned_active')}
                        </Typography>
                    )}
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
                        <SelectControl
                            sx={{ minWidth: 120, width: 0, mb: 0 }}
                            label='settings.unit'
                            size='small'
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
                        </SelectControl>
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
                            onClick={handleConfirmDelete}
                        >
                            {tr('settings.clear', { cmp })}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCleanup(false)}>
                        {tr('controls.close')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
