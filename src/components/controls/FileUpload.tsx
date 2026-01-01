import { Box, Button, Link, Typography, useEventCallback } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Accept, useDropzone } from 'react-dropzone';
import { useController } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useApiURL } from '../../hooks/useApiURL';
import { useTranslate } from '../../i18n/I18nContext';
import { controlType } from '../../redux/config';
import { useIsCurrentTab, useRegisterHandler } from '../contexts/TabContext';
import { UploadType } from './UploadType';
import { useImageURL } from '../../hooks/useImageURL';

const style = {
    maxWidth: 200,
    maxHeight: 200,
    padding: 5,
    marginTop: 10,
    border: '1px solid gray',
};

const ext: { [type: string]: string[] } = {
    [UploadType.IMAGE]: ['.jpg', '.gif', '.png', '.webp'],
    [UploadType.VIDEO]: ['.webm', '.avi', '.mp4'],
    [UploadType.AUDIO]: ['.mp3', '.ogg', '.wav', '.flac', '.wma', '.aac'],
};

const video_node = (video: string) => ({
    inputs: {
        video,
        force_rate: 0,
        force_size: 'Disabled',
        custom_width: 0,
        custom_height: 0,
        frame_load_cap: 0,
        skip_first_frames: 0,
        select_every_nth: 1,
    },
    class_type: 'VHS_LoadVideo',
    _meta: {
        title: 'Load Video (Upload) 🎥🅥🅗🅢',
    },
});

export const FileUpload = ({
    type = UploadType.IMAGE,
    onUpload,
    extraHandler,
    ...props
}: {
    name: string;
    label?: string;
    type?: UploadType;
    onUpload?: (file: File) => void;
    extraHandler?: (api: any, value: string, control?: controlType) => void;
}) => {
    const tr = useTranslate();
    const { field } = useController({ ...props, defaultValue: '' });
    const apiUrl = useApiURL();
    const imageURL = useImageURL(field.value);
    const filetype = useMemo(() => {
        if (!field.value) {
            return UploadType.IMAGE;
        }
        for (const k of Object.keys(ext)) {
            if (
                ext[k].some(
                    (e) =>
                        typeof field.value === 'string' &&
                        field.value.endsWith(e)
                )
            ) {
                return k;
            }
        }
        return UploadType.IMAGE;
    }, [field.value]);
    const handler = useEventCallback(
        (api: any, val: string, control?: controlType) => {
            if (!control) {
                return;
            }
            if (filetype === UploadType.IMAGE) {
                api[control.node_id].inputs[control.field] = val;
            } else {
                api[control.node_id] = video_node(val);
            }
            if (extraHandler) {
                extraHandler(api, val, control);
            }
        }
    );
    useRegisterHandler({ name: props.name, handler });
    const { mutate } = useMutation({
        onMutate: async (files: File[]) => {
            const formData = new FormData();
            const file = new File(
                [files[0]],
                new Date().getTime() + '_' + files[0].name,
                { type: files[0].type }
            );
            formData.append('image', file);
            try {
                const r = await fetch(apiUrl + '/api/upload/image', {
                    method: 'POST',
                    body: formData,
                });
                const j = await r.json();
                j.filename = j.name;
                delete j.name;
                field.onChange(j.filename);
                if (onUpload && j.filename) {
                    onUpload(file);
                }
            } catch (e) {
                toast(tr('toasts.error_uploading', { err: e }));
            }
        },
    });
    const onDrop = useEventCallback((acceptedFiles: any) =>
        mutate(acceptedFiles)
    );
    const accept = useMemo(() => {
        switch (type) {
            case UploadType.IMAGE:
                return {
                    'image/*': ext[UploadType.IMAGE],
                };
            case UploadType.VIDEO:
                return {
                    'video/*': ext[UploadType.VIDEO],
                };
            case UploadType.AUDIO:
                return {
                    'audio/*': ext[UploadType.AUDIO],
                };
            case UploadType.BOTH:
                return {
                    'image/*': ext[UploadType.IMAGE],
                    'video/*': ext[UploadType.VIDEO],
                };
            default:
                return {};
        }
    }, [type]) as Accept;
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
    });
    const handlePaste = useEventCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items || field.value) {
            return;
        }
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                onDrop([file]);
                return;
            }
        }
    });
    const isCurrentTab = useIsCurrentTab();
    useEffect(() => {
        if (isCurrentTab) {
            document.addEventListener('paste', handlePaste);
        }
        return () => document.removeEventListener('paste', handlePaste);
    }, [isCurrentTab, handlePaste]);
    return (
        <Box mb={2} display='flex' flexDirection='column'>
            <Typography variant='body1'>
                {tr(`controls.${props.label || props.name}`)}
            </Typography>
            <Box
                flex={1}
                mt={1}
                p={1}
                borderRadius={2}
                border='5px dashed #aaa'
                sx={{ transition: 'border .24s ease-in-out' }}
                {...getRootProps()}
            >
                <input {...getInputProps()} />
                <Box display='flex' alignItems='center' flexDirection='column'>
                    {isDragActive ? (
                        <p style={{ alignSelf: 'center' }}>
                            {tr('controls.drop_files_here')}
                        </p>
                    ) : (
                        <Link
                            sx={{
                                cursor: 'pointer',
                                textAlign: 'center',
                            }}
                        >
                            {tr('controls.drop_files_desc')}
                        </Link>
                    )}
                    {field.value &&
                        (filetype === UploadType.IMAGE ? (
                            <img
                                style={style}
                                src={imageURL}
                                onError={() => field.onChange(undefined)}
                            />
                        ) : filetype === UploadType.VIDEO ||
                          filetype === UploadType.BOTH ? (
                            <video
                                style={{ ...style, width: 200 }}
                                src={imageURL}
                                controls
                                onError={() => field.onChange(undefined)}
                            />
                        ) : (
                            <audio
                                style={{ ...style, minWidth: 300 }}
                                src={imageURL}
                                controls
                                onError={() => field.onChange(undefined)}
                            />
                        ))}
                </Box>
            </Box>
            {field.value && (
                <Button
                    size='small'
                    onClick={() => field.onChange(null)}
                    sx={{ mt: 2, width: 100, alignSelf: 'center' }}
                >
                    {tr('controls.reset')}
                </Button>
            )}
        </Box>
    );
};
