import {
    AudioFile,
    Delete,
    Edit,
    PlayArrow,
} from '@mui/icons-material';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Dialog,
    DialogActions,
    DialogTitle,
    Stack,
    useEventCallback,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslate } from '../../i18n/I18nContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';
import { db, Preset } from '../history/db';
import { kindOf } from '../../utils/mediaFields';
import {
    draftFromPreset,
    formatBytes,
    PresetDraft,
    savePresetDraft,
} from './draft';
import { SavePresetDialog } from './SavePresetDialog';
import { useApplyPreset } from './useApplyPreset';

const Preview = ({ file }: { file: File }) => {
    const url = useMemo(() => URL.createObjectURL(file), [file]);
    useEffect(() => () => URL.revokeObjectURL(url), [url]);
    const kind = kindOf(file.name);
    if (kind === 'image') {
        return (
            <img
                src={url}
                alt=''
                style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 4,
                }}
            />
        );
    }
    if (kind === 'video') {
        return (
            <video
                src={url}
                preload='metadata'
                muted
                style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 4,
                }}
            />
        );
    }
    return (
        <div
            style={{
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                background: 'rgba(0,0,0,0.05)',
            }}
        >
            <AudioFile />
        </div>
    );
};

export const PresetCard = ({ preset }: { preset: Preset }) => {
    const tr = useTranslate();
    const { receivers } = useContext(WorkflowTabsContext);
    const apply = useApplyPreset();
    const files = useLiveQuery(
        async () => db.presetFiles.where({ preset: preset.id }).toArray(),
        [preset.id],
    ) ?? [];
    const [editDraft, setEditDraft] = useState<PresetDraft | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const totalSize = files.reduce((s, f) => s + f.file.size, 0);

    const startEdit = useEventCallback(async () => {
        try {
            setEditDraft(await draftFromPreset(preset, receivers));
            setEditOpen(true);
        } catch (e) {
            toast.error(tr('toasts.error_saving_preset', { err: e }));
            console.error(e);
        }
    });
    const saveEdit = useEventCallback(async (): Promise<boolean> => {
        if (!editDraft) {
            return false;
        }
        setSaving(true);
        try {
            await savePresetDraft(editDraft);
            toast.success(tr('presets.saved'));
            return true;
        } catch (e) {
            toast.error(tr('toasts.error_saving_preset', { err: e }));
            console.error(e);
            return false;
        } finally {
            setSaving(false);
        }
    });
    const closeEdit = useEventCallback(() => {
        setEditOpen(false);
        setEditDraft(null);
    });
    const handleDelete = useEventCallback(async () => {
        await db.transaction('rw', db.presets, db.presetFiles, async () => {
            await db.presets.delete(preset.id);
            const all = await db.presetFiles
                .where({ preset: preset.id })
                .toArray();
            if (all.length) {
                await db.presetFiles.bulkDelete(all.map((f) => f.id));
            }
        });
        setConfirmDelete(false);
    });

    return (
        <Card variant='outlined' sx={{ mb: 2 }}>
            <CardHeader
                title={preset.name}
                subheader={`${preset.tab} · ${new Date(
                    preset.timestamp,
                ).toLocaleString()}`}
            />
            <CardContent sx={{ p: { xs: 0, md: 2}, pt: 0 }}>
                <Stack
                    direction='row'
                    gap={1}
                    sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                >
                    {files.slice(0, 5).map((f) => (
                        <Preview key={f.filename} file={f.file} />
                    ))}
                    {files.length > 5 && (
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 4,
                                background: 'rgba(0,0,0,0.05)',
                            }}
                        >
                            +{files.length - 5}
                        </div>
                    )}
                    {files.length > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <PlayArrow fontSize='small' />
                            {tr('presets.total_size', {
                                size: formatBytes(totalSize),
                            })}
                        </div>
                    )}
                </Stack>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between' }}>
                <Button
                    size='small'
                    variant='outlined'
                    color='primary'
                    onClick={() => apply(preset)}
                >
                    {tr('presets.apply')}
                </Button>
                <Stack direction='row' gap={1}>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={startEdit}
                    >
                        <Edit />
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        color='error'
                        onClick={() => setConfirmDelete(true)}
                    >
                        <Delete />
                    </Button>
                </Stack>
            </CardActions>
            <SavePresetDialog
                open={editOpen}
                draft={editDraft}
                setDraft={setEditDraft}
                onClose={closeEdit}
                onSave={saveEdit}
                saving={saving}
                collecting={false}
            />
            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
            >
                <DialogTitle>
                    {tr('presets.delete_confirm', { name: preset.name })}
                </DialogTitle>
                <DialogActions>
                    <Button onClick={handleDelete} color='error'>
                        {tr('controls.ok')}
                    </Button>
                    <Button onClick={() => setConfirmDelete(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};
