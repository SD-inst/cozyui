import { Add, AudioFile, Close, VideoFile } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    LinearProgress,
    Stack,
    Switch,
    TextField,
    Typography,
    useEventCallback,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadFile } from '../../api/files';
import { useApiURL } from '../../hooks/useApiURL';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useTranslate } from '../../i18n/I18nContext';
import { genId } from '../../utils/id';
import { DEFAULT_OFF_FIELDS } from '../../utils/mediaFields';
import { PresetDraft, MediaRow, ParamRow, formatBytes } from './draft';

const kindAccept: Record<string, string> = {
    image: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
};

const MediaRowView = ({
    row,
    onChange,
    onAddFile,
}: {
    row: MediaRow;
    onChange: (id: string, patch: Partial<MediaRow>) => void;
    onAddFile: (field: string) => void;
}) => {
    const tr = useTranslate();
    const url = useMemo(
        () => (row.file ? URL.createObjectURL(row.file) : ''),
        [row.file],
    );
    useEffect(() => () => URL.revokeObjectURL(url), [url]);
    const preview = url ? (
        row.kind === 'image' ? (
            <img
                src={url}
                alt={row.filename}
                style={{ width: 64, height: 64, objectFit: 'cover' }}
            />
        ) : row.kind === 'video' ? (
            <video
                src={url}
                preload='metadata'
                muted
                style={{ width: 96, height: 64, objectFit: 'cover' }}
            />
        ) : (
            <Box
                sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <AudioFile sx={{ fontSize: 32 }} />
            </Box>
        )
    ) : (
        <Box
            sx={{
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {row.kind === 'video' ? (
                <VideoFile sx={{ fontSize: 32 }} />
            ) : (
                <AudioFile sx={{ fontSize: 32 }} />
            )}
        </Box>
    );
    return (
        <Box
            display='flex'
            gap={1.5}
            alignItems='center'
            sx={{
                border: row.error ? '1px solid red' : '1px solid transparent',
                borderRadius: 1,
                p: 0.5,
            }}
        >
            <FormControlLabel
                sx={{ mt: 0, minWidth: 28 }}
                label=''
                control={
                    <Checkbox
                        checked={row.included}
                        onChange={(_, c) => onChange(row.id, { included: c })}
                    />
                }
            />
            {preview}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='body2' noWrap>
                    {row.filename}
                </Typography>
                {row.file && (
                    <Typography variant='caption' color='textSecondary'>
                        {formatBytes(row.file.size)}
                    </Typography>
                )}
                {row.error && (
                    <Typography variant='caption' color='error'>
                        {tr(
                            `presets.${
                                row.error === 'missing_server' ||
                                row.error === 'no_local_copy'
                                    ? row.error
                                    : 'collect_failed'
                            }`,
                        )}
                    </Typography>
                )}
            </Box>
            <Button
                size='small'
                onClick={() => onChange(row.id, { included: false })}
            >
                <Close />
            </Button>
            {row.included && row.index === undefined && (
                <Button size='small' onClick={() => onAddFile(row.field)}>
                    {tr('presets.replace_file')}
                </Button>
            )}
        </Box>
    );
};

const ParamRowView = ({
    row,
    onChange,
}: {
    row: ParamRow;
    onChange: (field: string, patch: Partial<ParamRow>) => void;
}) => {
    const tr = useTranslate();
    // the control's label key may differ from the field name;
    // fall back to the raw field name when no translation exists
    const labelKey = `controls.${row.field}`;
    const translated = tr(labelKey);
    const label = translated === labelKey ? row.field : translated;
    const editable =
        typeof row.value === 'string' || typeof row.value === 'number';
    const preview = useMemo(() => {
        if (typeof row.value === 'boolean') {
            return row.value ? 'on' : 'off';
        }
        const s =
            typeof row.value === 'string'
                ? row.value
                : JSON.stringify(row.value);
        return s.length > 80 ? s.slice(0, 80) + '…' : s;
    }, [row.value]);
    return (
        <Box display='flex' gap={1.5} alignItems='center' sx={{ py: 0.25 }}>
            <FormControlLabel
                sx={{ mt: 0, minWidth: 28 }}
                label=''
                control={
                    <Checkbox
                        checked={row.included}
                        onChange={(_, c) => onChange(row.field, { included: c })}
                    />
                }
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='body2'>
                    {label}
                </Typography>
                {row.included && typeof row.value === 'boolean' ? (
                    <Switch
                        size='small'
                        checked={row.value}
                        onChange={(_, v) =>
                            onChange(row.field, { value: v })
                        }
                    />
                ) : row.included && editable && typeof row.value === 'string' ? (
                    <TextField
                        size='small'
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={4}
                        value={row.value}
                        onChange={(e) =>
                            onChange(row.field, { value: e.target.value })
                        }
                    />
                ) : row.included &&
                  editable &&
                  typeof row.value === 'number' ? (
                    <TextField
                        size='small'
                        sx={{ width: 120 }}
                        type='number'
                        value={row.value}
                        onChange={(e) =>
                            onChange(row.field, {
                                value: parseFloat(e.target.value),
                            })
                        }
                    />
                ) : (
                    <Typography
                        variant='caption'
                        color={row.included ? 'textSecondary' : undefined}
                        sx={{ wordBreak: 'break-all' }}
                    >
                        {preview}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

type SavePresetDialogProps = {
    open: boolean;
    draft: PresetDraft | null;
    setDraft: (d: PresetDraft | null) => void;
    onClose: () => void;
    onSave: () => Promise<boolean>;
    saving: boolean;
    collecting: boolean;
};

const SavePresetDialogInner = ({
    open,
    draft,
    setDraft,
    onClose,
    onSave,
    saving,
    collecting,
}: SavePresetDialogProps & { draft: PresetDraft }) => {
    const tr = useTranslate();
    const apiUrl = useApiURL();
    const isPhone = useIsPhone();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingField, setPendingField] = useState('');

    const patchMedia = (id: string, patch: Partial<MediaRow>) => {
        setDraft({
            ...draft,
            media: draft.media.map((m) =>
                m.id === id ? { ...m, ...patch } : m,
            ),
        });
    };
    const patchParam = (field: string, patch: Partial<ParamRow>) => {
        setDraft({
            ...draft,
            params: draft.params.map((p) =>
                p.field === field ? { ...p, ...patch } : p,
            ),
        });
    };

    // Toggle-all: if anything is checked, uncheck everything;
    // otherwise check everything (params exclude the default-off fields)
    const toggleMedia = () => {
        const on = !draft.media.some((m) => m.included);
        setDraft({
            ...draft,
            media: draft.media.map((m) => ({ ...m, included: on })),
        });
    };
    const toggleParams = () => {
        const on = !draft.params.some((p) => p.included);
        setDraft({
            ...draft,
            params: draft.params.map((p) => ({
                ...p,
                included: on ? !DEFAULT_OFF_FIELDS.includes(p.field) : false,
            })),
        });
    };

    const handleAddFile = useEventCallback((field: string) => {
        setPendingField(field);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    });
    const onFilePicked = useEventCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !apiUrl || !pendingField) {
                return;
            }
            setUploading(true);
            try {
                const filename = await uploadFile(file, apiUrl);
                const group = draft.media.filter(
                    (m) => m.field === pendingField,
                );
                const kind = (
                    file.type?.startsWith('video')
                        ? 'video'
                        : file.type?.startsWith('audio')
                          ? 'audio'
                          : 'image'
                ) as MediaRow['kind'];
                const key = group.length && group[0].key ? group[0].key : kind;
                if (group.some((m) => m.index === undefined)) {
                    // single string field: replace the existing row
                    setDraft({
                        ...draft,
                        media: draft.media.map((m) =>
                            m.field === pendingField && m.index === undefined
                                ? {
                                      ...m,
                                      filename,
                                      key: key,
                                      kind,
                                      entry: undefined,
                                      file,
                                      error: undefined,
                                      included: true,
                                  }
                                : m,
                        ),
                    });
                } else {
                    // array field: append a new row
                    const row: MediaRow = {
                        id: genId(),
                        field: pendingField,
                        index: group.length,
                        key: key,
                        filename,
                        kind,
                        file,
                        included: true,
                    };
                    setDraft({ ...draft, media: [...draft.media, row] });
                }
            } finally {
                setUploading(false);
            }
        },
    );

    const groups: Array<{
        field: string;
        rows: MediaRow[];
        single: boolean;
        size: number;
    }> = [];
    for (const field of new Set(draft.media.map((m) => m.field))) {
        const rows = draft.media.filter((m) => m.field === field);
        groups.push({
            field,
            rows,
            single: rows.some((r) => r.index === undefined),
            size: rows
                .filter((r) => r.included && r.file)
                .reduce((s, r) => s + r.file!.size, 0),
        });
    }
    const totalSize = draft.media
        .filter((m) => m.included && m.file)
        .reduce((s, m) => s + m.file!.size, 0);
    const hasBlockingErrors = draft.media.some(
        (m) => m.included && m.error && !m.file,
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth='sm'
            fullScreen={isPhone}
        >
            <DialogTitle>
                {tr(draft.presetId ? 'presets.edit' : 'presets.save_current')}
            </DialogTitle>
            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: '70vh',
                    overflowY: 'auto',
                }}
            >
                <TextField
                    size='small'
                    fullWidth
                    label={tr('presets.name')}
                    value={draft.name}
                    onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                    }
                    sx={{ mt: 1 }}
                />
                <Typography variant='subtitle2'>
                    {tr('presets.tab_label') + ': ' + draft.tab}
                </Typography>

                {groups.length > 0 && (
                    <>
                        <Box
                            display='flex'
                            alignItems='center'
                            justifyContent='space-between'
                            gap={1}
                        >
                            <Typography variant='subtitle2'>
                                {tr('presets.media')} (
                                {tr('presets.total_size', {
                                    size: formatBytes(totalSize),
                                })}
                                )
                            </Typography>
                            <Button size='small' onClick={toggleMedia}>
                                {tr('presets.toggle_media')}
                            </Button>
                        </Box>
                        {groups.map((g) => (
                            <Box key={g.field}>
                                <Typography
                                    variant='body2'
                                    color='textSecondary'
                                >
                                    {tr(`controls.${g.field}`)}
                                    {g.size > 0 && ` (${formatBytes(g.size)})`}
                                </Typography>
                                <Stack>
                                    {g.rows.map((row) => (
                                        <MediaRowView
                                            key={row.id}
                                            row={row}
                                            onChange={patchMedia}
                                            onAddFile={handleAddFile}
                                        />
                                    ))}
                                    {!g.single && (
                                        <Button
                                            size='small'
                                            startIcon={<Add />}
                                            onClick={() =>
                                                handleAddFile(g.field)
                                            }
                                        >
                                            {tr('presets.add_file')}
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        ))}
                    </>
                )}

                <Divider />
                <Box
                    display='flex'
                    alignItems='center'
                    justifyContent='space-between'
                    gap={1}
                >
                    <Typography variant='subtitle2'>
                        {tr('presets.params')}
                    </Typography>
                    <Button size='small' onClick={toggleParams}>
                        {tr('presets.toggle_params')}
                    </Button>
                </Box>
                {draft.params.map((p) => (
                    <ParamRowView key={p.field} row={p} onChange={patchParam} />
                ))}

                {(collecting || uploading) && <LinearProgress />}
                <input
                    ref={fileInputRef}
                    type='file'
                    style={{ display: 'none' }}
                    accept={
                        kindAccept[
                            draft.media.find((m) => m.field === pendingField)
                                ?.kind ?? 'image'
                        ]
                    }
                    onChange={onFilePicked}
                />
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center' }}>
                <Button onClick={onClose} disabled={saving}>
                    {tr('controls.cancel')}
                </Button>
                <Button
                    variant='contained'
                    disabled={
                        saving || hasBlockingErrors || collecting || uploading
                    }
                    onClick={async () => {
                        if (await onSave()) {
                            onClose();
                        }
                    }}
                >
                    {tr('presets.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const SavePresetDialog = ({
    open,
    draft,
    ...props
}: SavePresetDialogProps) => {
    if (!draft) {
        return null;
    }
    return <SavePresetDialogInner open={open} draft={draft} {...props} />;
};
