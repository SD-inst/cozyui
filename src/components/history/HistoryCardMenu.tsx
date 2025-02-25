import { CompareArrows, MoreVert } from '@mui/icons-material';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Menu,
    MenuItem,
} from '@mui/material';
import { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { CompareContext } from '../contexts/CompareContext';
import { db, markEnum, TaskResult } from './db';
import { useTranslate } from '../../i18n/I18nContext';
import { FilterContext } from '../contexts/FilterContext';
import { pkFromFilter } from './filter';

export const HistoryCardMenu = ({ output }: { output: TaskResult }) => {
    const tr = useTranslate();
    const filter = useContext(FilterContext);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const { setCompare, selected_id } = useContext(CompareContext);
    const [open, setOpen] = useState(false);
    const handleCompareWithPrev = async () => {
        setAnchor(null);
        let tasks = [];
        if (!filter) {
            tasks = await db.taskResults
                .where('id')
                .belowOrEqual(output.id)
                .reverse()
                .limit(2)
                .toArray();
        } else {
            tasks = await db.taskResults
                .where('id')
                .anyOf(await pkFromFilter(filter))
                .reverse()
                .filter((r) => r.id <= output.id)
                .limit(2)
                .toArray();
        }
        if (tasks.length != 2) {
            toast.error(tr('toasts.no_prev_result'));
            return;
        }
        setCompare((v) => ({
            ...v,
            open: true,
            jsonA: JSON.parse(tasks[0].params || '{}'),
            jsonB: JSON.parse(tasks[1].params || '{}'),
        }));
    };
    const handleSetCompare = () => {
        setAnchor(null);
        setCompare((v) => ({ ...v, selected_id: output.id }));
    };
    const handleResetComparison = () => {
        setAnchor(null);
        setCompare((v) => ({ ...v, selected_id: 0 }));
    };
    const handleCompareWithThis = async () => {
        setAnchor(null);
        if (!selected_id) {
            toast.error(tr('toasts.no_base'));
            return;
        }
        const taskA = await db.taskResults.get(selected_id);
        setCompare((v) => ({
            ...v,
            jsonA: JSON.parse(taskA?.params || '{}'),
            jsonB: JSON.parse(output.params || '{}'),
            open: true,
        }));
    };
    const handleShowParams = async () => {
        setAnchor(null);
        setCompare((v) => ({
            ...v,
            jsonA: undefined,
            jsonB: JSON.parse(output.params || '{}'),
            open: true,
        }));
    };
    const handlePin = () => {
        db.taskResults.put({ ...output, mark: markEnum.PINNED });
    };
    const handleUnpin = () => {
        db.taskResults.put({ ...output, mark: markEnum.NONE });
        setOpen(false);
    };
    return (
        <>
            <Button
                size='small'
                onClick={(e) => setAnchor(e.currentTarget)}
                startIcon={selected_id === output.id ? <CompareArrows /> : null}
            >
                <MoreVert />
            </Button>
            <Menu
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
            >
                {selected_id ? (
                    <MenuItem onClick={handleCompareWithThis}>
                        {(() => {
                            const translated = tr(
                                'controls.compare_arr_with_this'
                            );
                            const parts = translated.split('<-->');
                            return [
                                parts[0],
                                <CompareArrows sx={{ ml: 1, mr: 1 }} />,
                                parts.length > 1 ? parts[1] : null,
                            ];
                        })()}
                    </MenuItem>
                ) : null}
                <MenuItem onClick={handleCompareWithPrev}>
                    {tr('controls.compare_prev')}
                </MenuItem>
                <MenuItem onClick={handleSetCompare}>
                    {tr('controls.compare_this_with')}
                </MenuItem>
                {selected_id ? (
                    <MenuItem onClick={handleResetComparison}>
                        {tr('controls.reset_comparison')}
                    </MenuItem>
                ) : null}
                <MenuItem onClick={handleShowParams}>
                    {tr('controls.show_params')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setAnchor(null);
                        if (output.mark !== markEnum.PINNED) {
                            handlePin();
                        } else {
                            setOpen(true);
                        }
                    }}
                >
                    {output.mark !== markEnum.PINNED
                        ? tr('controls.pin')
                        : tr('controls.unpin')}
                </MenuItem>
            </Menu>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>{tr('controls.unpin_title')}</DialogTitle>
                <DialogContent>{tr('controls.unpin_confirm')}</DialogContent>
                <DialogActions>
                    <Button onClick={handleUnpin}>{tr('controls.ok')}</Button>
                    <Button onClick={() => setOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
