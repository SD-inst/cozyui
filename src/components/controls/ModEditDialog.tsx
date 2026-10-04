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
import { PhotoLibrary } from '@mui/icons-material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../history/db';
import { useTranslate } from '../../i18n/I18nContext';
import { refModThumbStyle } from '../../hooks/useRefMods';

// Metadata editor for a reference mod: rename it, adjust the thumbnail crop
// (horizontal/vertical offset) and replace the thumbnail image. The chosen
// thumbnail file is held locally (pending) and only written to IndexedDB when
// the user presses Save — so an accidental file pick can be discarded by
// closing the dialog without saving.
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
    // Local preview URL for the pending thumbnail — updated immediately on
    // file pick so the user sees the new image without committing it to DB.
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    // The File object to persist on Save (null = no thumbnail change).
    const [pendingThumbFile, setPendingThumbFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset the form to the stored values whenever the dialog (re)opens.
    useEffect(() => {
        if (!open || !mod) return;
        setName(mod.name);
        setX(mod.thumbX ?? 50);
        setY(mod.thumbY ?? 50);
        setThumbUrl(null);
        setPendingThumbFile(null);
    }, [open, mod]);

    // Revoke the object URL when it changes or the component unmounts.
    useEffect(() => {
        return () => {
            if (thumbUrl) {
                URL.revokeObjectURL(thumbUrl);
            }
        };
    }, [thumbUrl]);

    const displayUrl = thumbUrl ?? url;
    const hasThumb = !!displayUrl;
    const ready = !!mod && name.trim().length > 0;

    // Update the local preview only — the file is persisted in handleSave.
    const handleReplaceThumbnail = useCallback((file: File) => {
        setThumbUrl(URL.createObjectURL(file));
        setPendingThumbFile(file);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await db.transaction('rw', db.refMods, db.refModFiles, async () => {
                await db.refMods.update(modId, {
                    name: name.trim(),
                    thumbX: x,
                    thumbY: y,
                    updatedAt: Date.now(),
                });
                if (pendingThumbFile) {
                    const thumbFile = new File(
                        [pendingThumbFile],
                        'thumbnail.png',
                        { type: pendingThumbFile.type || 'image/png' },
                    );
                    // Remove any existing thumbnail for this mod.
                    await db.refModFiles
                        .where({ mod: modId })
                        .and((f: any) => f.fileType === 'thumbnail')
                        .delete();
                    await db.refModFiles.add({
                        id: `${modId}/thumbnail`,
                        mod: modId,
                        filename: 'thumbnail.png',
                        file: thumbFile,
                        fileType: 'thumbnail',
                    });
                }
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleReplaceThumbnail(file);
        }
        e.target.value = '';
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
                            if (e.key === 'Enter' && ready && !saving) {
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
                                    src={displayUrl}
                                    alt=''
                                    style={refModThumbStyle(x, y)}
                                    draggable={false}
                                />
                            </Box>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<PhotoLibrary />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {tr('refmods.replace_thumbnail')}
                            </Button>
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
                        <>
                            <Typography color='grey' variant='body2'>
                                {tr('refmods.no_thumbnail')}
                            </Typography>
                            <Button
                                variant='outlined'
                                size='small'
                                startIcon={<PhotoLibrary />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {tr('refmods.add_thumbnail')}
                            </Button>
                        </>
                    )}
                    {/* Shared hidden file input */}
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{tr('controls.cancel')}</Button>
                <Button
                    variant='contained'
                    onClick={handleSave}
                    disabled={!ready || saving}
                >
                    {tr('refmods.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
