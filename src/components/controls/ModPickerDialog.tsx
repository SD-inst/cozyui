import { Add } from '@mui/icons-material';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Slider,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { db, RefMod } from '../history/db';
import { useTranslate } from '../../i18n/I18nContext';
import { ModThumbnail } from './ModArrayInput';

export const ModPickerDialog = ({
    open,
    onClose,
    onAdd,
}: {
    open: boolean;
    onClose: () => void;
    onAdd: (id: string, strength: number) => void;
}) => {
    const tr = useTranslate();
    const theme = useTheme();
    const mods = useLiveQuery(async () => db.refMods.toArray(), []) ?? [];
    const [selectedMod, setSelectedMod] = useState<RefMod | null>(null);
    const [strength, setStrength] = useState(1.0);

    const handleAdd = () => {
        if (!selectedMod) return;
        onAdd(selectedMod.id, strength);
        setSelectedMod(null);
        setStrength(1.0);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='sm'>
            <DialogTitle>{tr('refmods.select_mod')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ minWidth: 300 }}>
                    <Box display='flex' flexWrap='wrap' gap={1}>
                        {mods.map((mod: RefMod) => (
                            <Box
                                key={mod.id}
                                onClick={() => setSelectedMod(mod)}
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    bgcolor: theme.palette.grey[100],
                                    border: '2px solid',
                                    borderColor:
                                        selectedMod?.id === mod.id
                                            ? theme.palette.primary.main
                                            : theme.palette.grey[300],
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                            >
                                <ModThumbnail modId={mod.id} />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        bgcolor: 'rgba(0,0,0,0.6)',
                                        px: 0.5,
                                        py: 0.25,
                                        fontSize: '0.6rem',
                                        color: 'white',
                                        textAlign: 'center',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {mod.name}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                    <Stack spacing={1}>
                        <Typography variant='body2'>
                            {tr('refmods.strength')}: {strength.toFixed(2)}
                        </Typography>
                        <Slider
                            value={strength}
                            onChange={(_, v) => setStrength(v as number)}
                            min={0}
                            max={1}
                            step={0.05}
                            valueLabelDisplay='auto'
                        />
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{tr('controls.close')}</Button>
                <Button
                    variant='contained'
                    onClick={handleAdd}
                    disabled={!selectedMod}
                >
                    <Add />
                    {tr('refmods.add')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const useModPicker = ({ name, max }: { name: string; max: number }) => {
    const [open, setOpen] = useState(false);
    const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
    const { getValues, setValue } = useFormContext();

    const openPicker = (index?: number) => {
        setReplaceIndex(index ?? null);
        setOpen(true);
    };

    const handleAdd = (id: string, strength: number) => {
        const current = getValues(name) ?? [];
        if (replaceIndex !== null) {
            const next = [...current];
            next[replaceIndex] = { ...next[replaceIndex], id, strength, copies: 1 };
            setValue(name, next, { shouldDirty: true });
        } else {
            if (current.length >= max && max !== -1) return;
            setValue(name, [...current, { id, strength, copies: 1 }], { shouldDirty: true });
        }
        setReplaceIndex(null);
    };

    const dialog = (
        <ModPickerDialog
            open={open}
            onClose={() => {
                setOpen(false);
                setReplaceIndex(null);
            }}
            onAdd={handleAdd}
        />
    );

    return { openPicker, dialog };
};
