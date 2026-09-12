import { Delete, Edit, PlayArrow } from '@mui/icons-material';
import {
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    useEventCallback,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';
import { MediaThumb } from '../controls/MediaThumb';
import { db, Session } from '../history/db';
import { formatBytes } from '../presets/draft';
import { deleteSession } from './session';
import { useRestoreSession } from './useRestoreSession';

export const SessionCard = ({ session }: { session: Session }) => {
    const tr = useTranslate();
    const restore = useRestoreSession();
    const files = useLiveQuery(
        async () =>
            db.sessionFiles.where({ session: session.id }).toArray(),
        [session.id],
    ) ?? [];
    const totalSize = files.reduce((s, f) => s + f.file.size, 0);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const doRestore = useEventCallback(async (deleteAfter: boolean) => {
        setRestoreOpen(false);
        restore(session, { deleteAfter });
    });
    const startRename = useEventCallback(() => {
        setRenameValue(session.name);
        setRenameOpen(true);
    });
    const saveRename = useEventCallback(async () => {
        const name = renameValue.trim() || session.name;
        await db.sessions.update(session.id, { name });
        setRenameOpen(false);
    });
    const handleDelete = useEventCallback(async () => {
        await deleteSession(session.id);
        setConfirmDelete(false);
    });

    return (
        <Card variant='outlined' sx={{ mb: 2 }}>
            <CardHeader
                title={`${session.tab} · ${new Date(
                    session.timestamp,
                ).toLocaleString()}`}
                subheader={session.name}
            />
            <CardContent sx={{ p: { xs: 0, md: 2 }, pt: 0 }}>
                <Stack
                    direction='row'
                    gap={1}
                    sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                >
                    {files.slice(0, 5).map((f) => (
                        <MediaThumb key={f.filename} file={f.file} />
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
                    onClick={() => setRestoreOpen(true)}
                >
                    {tr('sessions.restore')}
                </Button>
                <Stack direction='row' gap={1}>
                    <Button
                        size='small'
                        variant='outlined'
                        onClick={startRename}
                        aria-label={tr('sessions.rename')}
                    >
                        <Edit />
                    </Button>
                    <Button
                        size='small'
                        variant='outlined'
                        color='error'
                        onClick={() => setConfirmDelete(true)}
                        aria-label={tr('sessions.delete_confirm')}
                    >
                        <Delete />
                    </Button>
                </Stack>
            </CardActions>

            {/* Restore: restore | restore + delete | cancel */}
            <Dialog
                open={restoreOpen}
                onClose={() => setRestoreOpen(false)}
                aria-label={tr('sessions.restore_title', { name: session.name })}
            >
                <DialogTitle>
                    {tr('sessions.restore_title', { name: session.name })}
                </DialogTitle>
                <DialogActions
                    sx={{
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        rowGap: 1,
                        px: 2,
                        pb: 2,
                    }}
                >
                    <Button onClick={() => doRestore(false)}>
                        {tr('sessions.restore')}
                    </Button>
                    <Button onClick={() => doRestore(true)}>
                        {tr('sessions.restore_delete')}
                    </Button>
                    <Button onClick={() => setRestoreOpen(false)}>
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rename */}
            <Dialog open={renameOpen} onClose={() => setRenameOpen(false)}>
                <DialogTitle>{tr('sessions.rename')}</DialogTitle>
                <DialogContent>
                    <TextField
                        size='small'
                        fullWidth
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={saveRename}>{tr('controls.ok')}</Button>
                    <Button
                        onClick={() => setRenameOpen(false)}
                    >
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirm */}
            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
            >
                <DialogTitle>
                    {tr('sessions.delete_confirm', { name: session.name })}
                </DialogTitle>
                <DialogActions>
                    <Button onClick={handleDelete} color='error'>
                        {tr('controls.ok')}
                    </Button>
                    <Button
                        onClick={() => setConfirmDelete(false)}
                    >
                        {tr('controls.cancel')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};
