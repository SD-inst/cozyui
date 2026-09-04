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
    PropsWithChildren,
    ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useApiURL } from '../../hooks/useApiURL';
import { useUploadBackupGuard } from '../../hooks/useUploadBackupGuard';
import { useReuploadLost } from '../../hooks/useBackupUpload';
import { useTabName } from '../contexts/TabContext';
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
    const value = useWatch({ name, defaultValue: [] });
    const { fields, append, update, swap, remove, replace } = useFieldArray({
        name,
    });
    useUploadBackupGuard(name, value, keyField);
    useEffect(() => {
        if (value === undefined || value === null) {
            setValue(name, []);
        }
    }, [value, name, setValue]);
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
                                />
                            ))}
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
                                    const el = React.cloneElement(
                                        child as any,
                                        {
                                            name:
                                                (child as any).props.name &&
                                                `${name}.${controlsDialogIndex}.${(child as any).props.name}`,
                                        },
                                    );
                                    return <Box key={ci}>{el}</Box>;
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
                                        ? 'audio/*'
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
                            ? 'audio/*'
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
