import { Add } from '@mui/icons-material';
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import { Close, Delete, Refresh } from '@mui/icons-material';
import Lightbox from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import { clone } from 'lodash';
import React, {
    cloneElement,
    useCallback,
    PropsWithChildren,
    ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useApiURL } from '../../hooks/useApiURL';
import { useUploadBackupGuard } from '../../hooks/useUploadBackupGuard';
import { useReuploadLost } from '../../hooks/useBackupUpload';
import { useIsCurrentTab, useTabName } from '../contexts/TabContext';
import { useTranslate } from '../../i18n/I18nContext';
import { roomForNewSlots } from '../../utils/arraySlots';
import { UploadType } from './UploadType';
import { ext } from './fileExts';
import { ArrayFileContext } from './ArrayFileContext';
import {
    CompactFileItem,
    THUMBNAIL_SIZE,
    AUDIO_ITEM_HEIGHT,
} from './CompactFileItem';
import { DeleteArrayInputButton } from './DeleteArrayInputButton';
import { MoveArrayInputButton } from './MoveArrayInputButton';
import { FileUpload } from './FileUpload';

import 'yet-another-react-lightbox/styles.css';

const cloneChildren = ({
    children,
    name,
    min = 0,
    index,
    depth = 0,
    onSwap,
    onRemove,
}: {
    children: any;
    name: string;
    min?: number;
    index: number;
    depth?: number;
    onSwap: (a: number, b: number) => void;
    onRemove: (index: number) => void;
}) => {
    return React.Children.map(
        children,
        (child: ReactNode, childIndex: number): ReactNode => {
            if (!React.isValidElement(child)) {
                return child;
            }
            const props = {
                ...child.props,
                children: cloneChildren({
                    children: child.props.children,
                    name,
                    min,
                    index,
                    depth: depth + 1,
                    onSwap,
                    onRemove,
                }),
            };
            if (child.props.name) {
                props.name = `${name}.${index}.${child.props.name}`;
            }
            if (depth === 0 && childIndex === 0) {
                return (
                    <Box
                        display='flex'
                        gap={2}
                        width='100%'
                        alignItems='flex-start'
                        justifyContent='space-between'
                    >
                        <Box flex={1}>{cloneElement(child, props)}</Box>
                        <Stack
                            direction='column'
                            alignItems='center'
                            alignSelf='stretch'
                            spacing={0.5}
                        >
                            <Box alignSelf='flex-start'>
                                <DeleteArrayInputButton
                                    index={index}
                                    min={min}
                                    name={name}
                                    onRemove={onRemove}
                                />
                            </Box>
                            <Box flex={1} />
                            <Stack direction='column' spacing={0.5} pb={8}>
                                <MoveArrayInputButton
                                    index={index}
                                    name={name}
                                    direction='up'
                                    onSwap={onSwap}
                                />
                                <MoveArrayInputButton
                                    index={index}
                                    name={name}
                                    direction='down'
                                    onSwap={onSwap}
                                />
                            </Stack>
                            <Box flex={1} />
                        </Stack>
                    </Box>
                );
            }
            return cloneElement(child, props);
        },
    );
};

// Recursively remap `name` props on a control element (and any nested
// descendants) to the per-item array field, mirroring cloneChildren's name
// mapping. The compact-mode controls dialog renders children outside
// cloneChildren, so it must recurse itself; without this, controls wrapped in
// an intermediate element (e.g. a Box) keep their top-level names and mount as
// bogus top-level form fields.
const remapFieldNames = (
    child: ReactNode,
    name: string,
    index: number,
): ReactNode => {
    if (!React.isValidElement(child)) {
        return child;
    }
    const props = {
        ...child.props,
        children: React.Children.map(
            child.props.children,
            (c: ReactNode) => remapFieldNames(c, name, index),
        ),
    };
    if (child.props.name) {
        props.name = `${name}.${index}.${child.props.name}`;
    }
    return React.cloneElement(child, props);
};

const getFileType = (filename?: string): UploadType => {
    if (!filename) {
        return UploadType.IMAGE;
    }
    for (const k of Object.keys(ext)) {
        if (ext[k].some((e) => filename.endsWith(e))) {
            return k as UploadType;
        }
    }
    return UploadType.IMAGE;
};

export const ArrayInput = ({
    label,
    name,
    newValue,
    keyField = 'image',
    min = 0,
    max = -1,
    listMode = false,
    receiverFieldName,
    targetFieldName,
    ...props
}: {
    name: string;
    label?: string;
    newValue: any;
    keyField?: string;
    min?: number;
    max?: number;
    listMode?: boolean;
    receiverFieldName?: string;
    targetFieldName?: string;
} & PropsWithChildren) => {
    const tr = useTranslate();
    const theme = useTheme();
    const apiUrl = useApiURL();
    const { unregister, getValues, setValue } = useFormContext();
    const rawValue = useWatch({ name });
    const value = React.useMemo(
        () => rawValue ?? [],
        [rawValue],
    );
    const { fields, append, update, swap, remove, replace } = useFieldArray({
        name,
    });
    useUploadBackupGuard(name, value, keyField);
    useEffect(() => {
        if (rawValue === undefined || rawValue === null) {
            setValue(name, []);
        }
    }, [rawValue, name, setValue]);
    const prevFieldsLen = useRef(0);
    useEffect(() => {
        const prev = prevFieldsLen.current;
        prevFieldsLen.current = fields.length;
        const justAppended = fields.length > prev;
        if (!justAppended && value.length === 0 && fields.length > 0) {
            replace([]);
            return;
        }
        if (value.length < min && min > 0) {
            for (let i = 0; i < min; i++) {
                append(clone(newValue));
            }
        }
    }, [append, min, newValue, value.length, fields.length, replace]);

    const appendSlots = (entries: Record<string, any>[]): number => {
        const room = roomForNewSlots(value.length, max, entries.length);
        const toAppend = entries
            .slice(0, room)
            .map((e) => ({ ...clone(newValue), ...e }));
        if (toAppend.length) {
            append(toAppend);
        }
        return toAppend.length;
    };

    const receiverFieldValue = useWatch({
        name: receiverFieldName || '',
        disabled: !receiverFieldName || !targetFieldName,
    });
    useEffect(() => {
        if (!receiverFieldName || !receiverFieldValue || !targetFieldName) {
            return;
        }
        unregister(receiverFieldName);
        for (let index = 0; index < value.length; index++) {
            if (!value[index][targetFieldName]) {
                update(index, {
                    ...value[index],
                    [targetFieldName]: receiverFieldValue,
                });
                return;
            }
        }
        if (value.length < max || max === -1) {
            append({
                ...clone(newValue),
                [targetFieldName]: receiverFieldValue,
            });
        } else {
            toast.error(tr('toasts.array_overflow'));
        }
    }, [
        receiverFieldValue,
        receiverFieldName,
        targetFieldName,
        value,
        newValue,
        max,
        tr,
        unregister,
        append,
        update,
    ]);

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Controls dialog state
    const [controlsDialogIndex, setControlsDialogIndex] = useState<
        number | null
    >(null);

    // File-drag feedback (compact media arrays): the index of the slot the
    // dragged file is over (→ replace), or null (→ the container "adds").
    const [fileDragOverIndex, setFileDragOverIndex] = useState<number | null>(
        null,
    );
    const [isFileDragOver, setIsFileDragOver] = useState(false);
    const resetFileDrag = useCallback(() => {
        setFileDragOverIndex(null);
        setIsFileDragOver(false);
    }, []);

    // dnd-kit sensors
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    // File input ref ("+")
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload helper
    const uploadFile = React.useCallback(
        async (file: File): Promise<string> => {
            const formData = new FormData();
            const renamed = new File(
                [file],
                new Date().getTime() + '_' + file.name,
                { type: file.type },
            );
            formData.append('image', renamed);
            const r = await fetch(apiUrl + '/api/upload/image', {
                method: 'POST',
                body: formData,
            });
            const j = await r.json();
            return j.name;
        },
        [apiUrl],
    );

    const handleCompactAdd = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleCompactFileSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = e.target.files;
        if (!files || !files.length) {
            return;
        }
        try {
            for (const file of Array.from(files)) {
                if (value.length >= max && max !== -1) {
                    toast.error(tr('toasts.array_overflow'));
                    break;
                }
                const filename = await uploadFile(file);
                append({ ...clone(newValue), [keyField]: filename });
            }
        } catch (err) {
            toast.error(tr('toasts.error_uploading', { err: err }));
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCompactReplace = async (index: number, file: File) => {
        try {
            const filename = await uploadFile(file);
            const current = getValues(name);
            update(index, { ...current[index], [keyField]: filename });
        } catch (err) {
            toast.error(tr('toasts.error_uploading', { err: err }));
        }
    };

    // Media arrays (compact thumbnails, not mod pickers, not list mode) support
    // dropping new files onto the array and pasting from the clipboard to append
    // them — mirroring the FileUpload dropzone + paste the compact layout
    // replaced.
    const isCurrentTab = useIsCurrentTab();
    const acceptsMedia = !listMode;

    // The FileUpload child declares the media kind each slot accepts. Compact
    // mode ignores the FileUpload dropzone, so paste routes clipboard media to
    // the slot whose declared `type` matches — a video only lands in a video
    // slot, an image only in an image slot — restoring the FileUpload paste
    // semantics. Drops keep the broad keyField accept for flexibility.
    const uploadType = useMemo(() => {
        for (const c of React.Children.toArray(props.children)) {
            if (React.isValidElement(c) && c.type === FileUpload) {
                return (c.props as { type?: UploadType }).type;
            }
        }
        return undefined;
    }, [props.children]);

    const keyFieldAccept = useMemo<UploadType[]>(() => {
        if (keyField === 'audio') {
            return [UploadType.AUDIO];
        }
        if (keyField === 'video') {
            return [UploadType.VIDEO];
        }
        return [UploadType.IMAGE, UploadType.VIDEO];
    }, [keyField]);

    // Strict slot accept: the FileUpload child's declared `type` (image/video/
    // audio) decides which media this slot takes, so a dropped or pasted video
    // only ever lands in a video slot (and an image only in an image slot).
    // Falls back to the keyField-derived accept when there is no FileUpload
    // child.
    const acceptedTypes = useMemo<UploadType[]>(() => {
        if (uploadType) {
            switch (uploadType) {
                case UploadType.IMAGE:
                    return [UploadType.IMAGE];
                case UploadType.VIDEO:
                    return [UploadType.VIDEO];
                case UploadType.AUDIO:
                    return [UploadType.AUDIO];
                case UploadType.IMAGEORVIDEO:
                    return [UploadType.IMAGE, UploadType.VIDEO];
                default:
                    return keyFieldAccept;
            }
        }
        return keyFieldAccept;
    }, [uploadType, keyFieldAccept]);

    const isAcceptedFile = useCallback(
        (file: File): boolean =>
            acceptedTypes.includes(getFileType(file.name)),
        [acceptedTypes],
    );

    const appendFiles = useCallback(
        async (files: File[]): Promise<number> => {
            const room = roomForNewSlots(value.length, max, files.length);
            const toUpload = files.slice(0, room);
            if (toUpload.length < files.length) {
                toast.error(tr('toasts.array_overflow'));
            }
            try {
                for (const file of toUpload) {
                    const filename = await uploadFile(file);
                    append({ ...clone(newValue), [keyField]: filename });
                }
            } catch (err) {
                toast.error(tr('toasts.error_uploading', { err: err }));
            }
            return toUpload.length;
        },
        [value.length, max, keyField, newValue, uploadFile, append, tr],
    );

    const handleContainerDrop = useCallback(
        async (e: React.DragEvent) => {
            // Always preventDefault so the browser never navigates to a dropped
            // file (e.g. opening an image dropped on a ref-mods picker).
            e.preventDefault();
            if (!acceptsMedia) {
                return;
            }
            resetFileDrag();
            const dt = e.dataTransfer;
            if (!dt) {
                return;
            }
            // A dropped folder isn't a usable media file; without this check the
            // folder itself gets uploaded and ends up as a blank thumbnail.
            if (
                Array.from(dt.items).some(
                    (it) => it.webkitGetAsEntry()?.isDirectory,
                )
            ) {
                toast.error(tr('toasts.folders_not_supported'));
                return;
            }
            const files = dt.files;
            if (!files || !files.length) {
                return;
            }
            const accepted = Array.from(files).filter(isAcceptedFile);
            if (accepted.length) {
                await appendFiles(accepted);
            }
        },
        [isAcceptedFile, appendFiles, resetFileDrag, acceptsMedia, tr],
    );

    // Feedback state for file drags: entering/leaving the array shows the "add"
    // highlight; entering/leaving a slot shows which one would be replaced.
    // Handlers are stable so the memoized CompactFileItem skips re-render.
    // All four are attached even to non-media arrays (mod pickers, list mode) —
    // the handlers guard on `acceptsMedia`, but the `preventDefault()` in
    // `handleContainerDrop`/`handleContainerDragOver` must always run so the
    // browser never opens a dropped file instead of the app.
    const handleContainerDragEnter = useCallback(
        (e: React.DragEvent) => {
            if (acceptsMedia && e.dataTransfer?.types?.includes('Files')) {
                setIsFileDragOver(true);
            }
        },
        [acceptsMedia],
    );
    const handleContainerDragOver = useCallback(
        (e: React.DragEvent) => {
            // Always preventDefault so the browser treats the array as a drop
            // target and never navigates to a dropped file. Only track the
            // "add" highlight for media arrays.
            e.preventDefault();
            if (acceptsMedia && e.dataTransfer?.types?.includes('Files')) {
                setIsFileDragOver(true);
            }
        },
        [acceptsMedia],
    );
    const handleContainerDragLeave = useCallback(
        (e: React.DragEvent) => {
            if (!acceptsMedia) {
                return;
            }
            if (
                (e.currentTarget as HTMLElement).contains(
                    e.relatedTarget as Node,
                )
            ) {
                return;
            }
            resetFileDrag();
        },
        [acceptsMedia, resetFileDrag],
    );
    const handleItemDragEnter = useCallback(
        (index: number) => setFileDragOverIndex(index),
        [],
    );
    const handleItemDragLeave = useCallback(
        (index: number) =>
            setFileDragOverIndex((prev) => (prev === index ? null : prev)),
        [],
    );

    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) {
                return;
            }
            const files: File[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind !== 'file') {
                    continue;
                }
                const file = item.getAsFile();
                if (!file) {
                    continue;
                }
                // Clipboard images arrive with an empty name; give them a real
                // extension so ComfyUI's upload handler can classify the type.
                if (!file.name) {
                    const extName = file.type.split('/')[1] || 'png';
                    const named = new File(
                        [file],
                        'pasted_' + new Date().getTime() + '.' + extName,
                        { type: file.type },
                    );
                    if (isAcceptedFile(named)) {
                        files.push(named);
                    }
                } else if (isAcceptedFile(file)) {
                    files.push(file);
                }
            }
            if (files.length) {
                appendFiles(files);
            }
        },
        [isAcceptedFile, appendFiles],
    );

    useEffect(() => {
        if (isCurrentTab && acceptsMedia) {
            document.addEventListener('paste', handlePaste);
        }
        return () => document.removeEventListener('paste', handlePaste);
    }, [isCurrentTab, acceptsMedia, handlePaste]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((f) => f.id === active.id);
            const newIndex = fields.findIndex((f) => f.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const current = getValues(name);
                setValue(name, arrayMove(current, oldIndex, newIndex), {
                    shouldDirty: false,
                });
            }
        }
    };

    const tabName = useTabName();
    const handleUploadLost = useReuploadLost(
        (index: number) => `${tabName}/${name}.${index}.${keyField}`,
        () => {},
        async (file, _key, index) => {
            const filename = await uploadFile(file);
            const current = getValues(name);
            update(index, { ...current[index], [keyField]: filename });
        },
    );

    // Compact mode rendering
    if (!listMode) {
        const slides: any[] = [];
        const validIndices: number[] = [];
        (value as any[]).forEach((item, i) => {
            const filename = item?.[keyField];
            if (!filename) {
                return;
            }
            const ft = getFileType(filename);
            if (ft === UploadType.AUDIO) {
                return;
            }
            const url =
                apiUrl +
                '/api/view?subfolder=&type=input&filename=' +
                encodeURIComponent(filename);
            if (ft === UploadType.VIDEO) {
                slides.push({
                    type: 'video',
                    sources: [{ src: url }],
                    autoPlay: true,
                });
            } else {
                slides.push({ src: url });
            }
            validIndices.push(i);
        });

        // Render non-file children per item (skip first child = FileUpload)
        const childrenArray = React.Children.toArray(props.children);

        return (
            <Box display='flex' flexDirection='column' gap={1}>
                <Typography variant='body1'>
                    {label ? tr(label) : tr('controls.' + name)}
                </Typography>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext items={fields.map((f) => f.id)}>
                        <Box
                            display='flex'
                            flexWrap='wrap'
                            gap={0.5}
                            alignItems='center'
                            position='relative'
                             onDrop={handleContainerDrop}
                             onDragOver={handleContainerDragOver}
                             onDragEnter={handleContainerDragEnter}
                             onDragLeave={handleContainerDragLeave}
                        >
                            {fields.map((field, index) => (
                                <CompactFileItem
                                    key={
                                        (value as any[])[index]?.[keyField] ||
                                        field.id
                                    }
                                    id={field.id}
                                    index={index}
                                    filename={
                                        (value as any[])[index]?.[keyField]
                                    }
                                    onRemove={(i) => {
                                        if (value.length <= min) {
                                            return;
                                        }
                                        remove(i);
                                    }}
                                    onReplace={handleCompactReplace}
                                    lightboxOpen={(i) => {
                                        const idx = validIndices.indexOf(i);
                                        if (idx >= 0) {
                                            setLightboxIndex(idx);
                                            setLightboxOpen(true);
                                        }
                                    }}
                                    onOpenControls={(i) =>
                                        setControlsDialogIndex(i)
                                    }
                                    onUploadLost={handleUploadLost}
                                    isReplaceTarget={
                                        fileDragOverIndex === index
                                    }
                                    onItemDragEnter={handleItemDragEnter}
                                    onItemDragLeave={handleItemDragLeave}
                                    onItemDrop={resetFileDrag}
                                />
                            ))}
                            {(value.length < max || max === -1) &&
                                isFileDragOver &&
                                fileDragOverIndex === null && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: 2,
                                            border: `2px dashed ${
                                                theme.palette.primary.main
                                            }`,
                                            pointerEvents: 'none',
                                            zIndex: 1,
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center',
                                            pb: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant='caption'
                                            sx={{
                                                color:
                                                    theme.palette.primary.main,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {tr('controls.drop_to_add')}
                                        </Typography>
                                    </Box>
                                )}
                            {(value.length < max || max === -1) && (
                                <Box
                                    onClick={handleCompactAdd}
                                    sx={{
                                        width:
                                            keyField === 'audio'
                                                ? 300
                                                : THUMBNAIL_SIZE,
                                        height:
                                            keyField === 'audio'
                                                ? AUDIO_ITEM_HEIGHT
                                                : THUMBNAIL_SIZE,
                                        borderRadius: 1,
                                        border: `1px dashed ${
                                            theme.palette.grey[400]
                                        }`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: theme.palette.grey[500],
                                        '&:hover': {
                                            borderColor:
                                                theme.palette.primary.main,
                                            color: theme.palette.primary.main,
                                        },
                                    }}
                                >
                                    <Add fontSize='small' />
                                </Box>
                            )}
                        </Box>
                    </SortableContext>
                </DndContext>
                {/* Controls dialog for per-item extra controls */}
                <Dialog
                    open={controlsDialogIndex !== null}
                    onClose={() => setControlsDialogIndex(null)}
                    maxWidth='sm'
                >
                    <DialogTitle>
                        {(label ? tr(label) : tr('controls.' + name)) +
                            ' — ' +
                            (controlsDialogIndex! + 1)}
                    </DialogTitle>
                    <DialogContent>
                        {controlsDialogIndex !== null &&
                            (() => {
                                const file = (value as any[])[
                                    controlsDialogIndex
                                ]?.[keyField];
                                if (!file) {
                                    return null;
                                }
                                const ft = getFileType(file);
                                const url =
                                    apiUrl +
                                    '/api/view?subfolder=&type=input&filename=' +
                                    encodeURIComponent(file);
                                if (ft === UploadType.AUDIO) {
                                    return (
                                        <audio
                                            src={url}
                                            controls
                                            style={{
                                                width: '100%',
                                                marginBottom: 16,
                                            }}
                                        />
                                    );
                                }
                                if (ft === UploadType.VIDEO) {
                                    return (
                                        <video
                                            src={url}
                                            muted
                                            playsInline
                                            preload='auto'
                                            style={{
                                                maxWidth: 200,
                                                maxHeight: 200,
                                                objectFit: 'contain',
                                                borderRadius: 4,
                                                marginBottom: 16,
                                            }}
                                        />
                                    );
                                }
                                return (
                                    <img
                                        src={url}
                                        alt=''
                                        style={{
                                            maxWidth: 200,
                                            maxHeight: 200,
                                            objectFit: 'contain',
                                            borderRadius: 4,
                                            marginBottom: 16,
                                        }}
                                    />
                                );
                            })()}
                        <Box
                            component='form'
                            sx={{
                                width: '100%',
                                '& > *': { mb: 2 },
                            }}
                        >
                    {controlsDialogIndex !== null &&
                        childrenArray.slice(1).map((child, ci) => {
                            if (!React.isValidElement(child)) {
                                return child;
                            }
                            return (
                                <Box key={ci}>
                                    {remapFieldNames(
                                        child,
                                        name,
                                        controlsDialogIndex,
                                    )}
                                </Box>
                            );
                        })}
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ flexWrap: 'wrap' }}>
                        <Button
                            color='error'
                            startIcon={<Delete />}
                            onClick={() => {
                                if (
                                    controlsDialogIndex !== null &&
                                    value.length > min
                                ) {
                                    remove(controlsDialogIndex);
                                    setControlsDialogIndex(null);
                                }
                            }}
                            disabled={
                                controlsDialogIndex !== null &&
                                value.length <= min
                            }
                        >
                            {tr('controls.remove')}
                        </Button>
                        <Button
                            startIcon={<Refresh />}
                            onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept =
                                    keyField === 'audio'
                                        ? 'audio/mpeg,audio/wav,audio/x-wav,audio/aac,audio/ogg,audio/flac,audio/webm'
                                        : keyField === 'video'
                                          ? 'video/*'
                                          : 'image/*,video/*';
                                input.onchange = () => {
                                    if (
                                        input.files?.[0] &&
                                        controlsDialogIndex !== null
                                    ) {
                                        handleCompactReplace(
                                            controlsDialogIndex,
                                            input.files[0],
                                        );
                                        setControlsDialogIndex(null);
                                    }
                                };
                                input.click();
                            }}
                        >
                            {tr('controls.replace')}
                        </Button>
                        <Button
                            startIcon={<Close />}
                            onClick={() => setControlsDialogIndex(null)}
                        >
                            {tr('controls.close')}
                        </Button>
                    </DialogActions>
                </Dialog>
                <input
                    ref={fileInputRef}
                    type='file'
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleCompactFileSelect}
                    accept={
                        keyField === 'audio'
                            ? 'audio/mpeg,audio/wav,audio/x-wav,audio/aac,audio/ogg,audio/flac,audio/webm'
                            : keyField === 'video'
                              ? 'video/*'
                              : 'image/*,video/*'
                    }
                />
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    slides={slides}
                    plugins={[Video]}
                    index={lightboxIndex}
                />
            </Box>
        );
    }

    // List mode rendering
    return (
        <Box display='flex' flexDirection='column' alignItems='center' gap={2}>
            {label ? tr(label) : tr('controls.' + name)}
            <Box width='100%'>
                <Flipper flipKey={fields.map((f: any) => f.id).join(',')}>
                    {fields.map((field: any, index: number) => (
                        <Flipped flipId={field.id} key={field.id}>
                            <Box
                                display='flex'
                                flexDirection='column'
                                gap={1}
                                width='100%'
                                className='array-input-item'
                            >
                                <Typography variant='body2' align='center'>
                                    {index + 1}
                                </Typography>
                                <ArrayFileContext.Provider
                                    value={{
                                        name,
                                        index,
                                        max,
                                        appendSlots,
                                    }}
                                >
                                    {cloneChildren({
                                        children: props.children,
                                        name,
                                        index,
                                        min,
                                        onSwap: swap,
                                        onRemove: remove,
                                    })}
                                </ArrayFileContext.Provider>
                            </Box>
                        </Flipped>
                    ))}
                </Flipper>
            </Box>
            {(value.length < max || max === -1) && (
                <Button
                    onClick={() => {
                        append(clone(newValue));
                    }}
                >
                    <Add />
                </Button>
            )}
        </Box>
    );
};
