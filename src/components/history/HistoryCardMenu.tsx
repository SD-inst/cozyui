import { CompareArrows, MoreVert } from '@mui/icons-material';
import { Button, Menu, MenuItem } from '@mui/material';
import { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { CompareContext } from '../contexts/CompareContext';
import { db } from './db';
import { useTranslate } from '../../i18n/I18nContext';

export const HistoryCardMenu = ({ id }: { id: number }) => {
    const tr = useTranslate();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const { setCompare, selected_id } = useContext(CompareContext);
    const handleCompareWithPrev = async () => {
        setAnchor(null);
        const tasks = await db.taskResults
            .where('id')
            .belowOrEqual(id)
            .reverse()
            .limit(2)
            .toArray();
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
        setCompare((v) => ({ ...v, selected_id: id }));
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
        const taskB = await db.taskResults.get(id);
        setCompare((v) => ({
            ...v,
            jsonA: JSON.parse(taskA?.params || '{}'),
            jsonB: JSON.parse(taskB?.params || '{}'),
            open: true,
        }));
    };
    const handleShowParams = async () => {
        setAnchor(null);
        const task = await db.taskResults.get(id);
        setCompare((v) => ({
            ...v,
            jsonA: undefined,
            jsonB: JSON.parse(task?.params || '{}'),
            open: true,
        }));
    };
    return (
        <>
            <Button
                size='small'
                onClick={(e) => setAnchor(e.currentTarget)}
                startIcon={selected_id === id ? <CompareArrows /> : null}
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
            </Menu>
        </>
    );
};
