import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Slider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../history/db';
import { useTranslate } from '../../i18n/I18nContext';
import { refModThumbStyle } from '../../hooks/useRefMods';

// Metadata editor for a reference mod: rename it and adjust the thumbnail crop
// (horizontal/vertical offset). The preview is the real thumbnail with the
// `object-position` crop applied live, so it always matches what is rendered
// everywhere else.
export const ModEditDialog = ({
    modId,
    url,
    open,
    onClose,
}: {
    modId: string;
    url?: string;
    open: boolean;
    onClose: () => void;
}) => {
    const tr = useTranslate();
    const mod = useLiveQuery(
        () => (modId ? db.refMods.get(modId) : undefined),
        [modId],
    );
    const [name, setName] = useState('');
    const [x, setX] = useState(50);
    const [y, setY] = useState(50);

    // Reset the form to the stored values whenever the dialog (re)opens. Local
    // edits don't touch the DB, so `mod` (and this effect) stay stable while
    // the user is adjusting; after a save `mod` updates and the reset is a
    // no-op (the values are already what was saved).
    useEffect(() => {
        if (!open || !mod) return;
        setName(mod.name);
        setX(mod.thumbX ?? 50);
        setY(mod.thumbY ?? 50);
    }, [open, mod]);

    const hasThumb = !!url;
    const ready = !!mod && name.trim().length > 0;

    const handleSave = async () => {
        await db.refMods.update(modId, {
            name: name.trim(),
            thumbX: x,
            thumbY: y,
            updatedAt: Date.now(),
        });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='xs'>
            <DialogTitle>{tr('refmods.edit_metadata')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ minWidth: 260, pt: 1 }}>
                    <TextField
                        label={tr('refmods.name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && ready) {
                                e.preventDefault();
                                handleSave();
                            }
                        }}
                        fullWidth
                        size='small'
                        slotProps={{ htmlInput: { maxLength: 120 } }}
                    />
                    {hasThumb ? (
                        <>
                            <Box
                                sx={{
                                    width: 200,
                                    height: 200,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    bgcolor: 'grey.100',
                                }}
                            >
                                <img
                                    src={url}
                                    alt=''
                                    style={refModThumbStyle(x, y)}
                                    draggable={false}
                                />
                            </Box>
                            <Stack spacing={1}>
                                <Typography variant='body2'>
                                    {tr('refmods.thumb_horizontal')}: {x}%
                                </Typography>
                                <Slider
                                    value={x}
                                    onChange={(_, v) => setX(v as number)}
                                    min={0}
                                    max={100}
                                    step={1}
                                    valueLabelDisplay='auto'
                                />
                            </Stack>
                            <Stack spacing={1}>
                                <Typography variant='body2'>
                                    {tr('refmods.thumb_vertical')}: {y}%
                                </Typography>
                                <Slider
                                    value={y}
                                    onChange={(_, v) => setY(v as number)}
                                    min={0}
                                    max={100}
                                    step={1}
                                    valueLabelDisplay='auto'
                                />
                            </Stack>
                        </>
                    ) : (
                        <Typography color='grey' variant='body2'>
                            {tr('refmods.no_thumbnail')}
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{tr('controls.cancel')}</Button>
                <Button
                    variant='contained'
                    onClick={handleSave}
                    disabled={!ready}
                >
                    {tr('refmods.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
