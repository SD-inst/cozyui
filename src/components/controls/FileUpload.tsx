import {
    Box,
    Button,
    LinearProgress,
    Link,
    Typography,
    useEventCallback,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Accept, useDropzone } from 'react-dropzone';
import { useController } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Workflow } from '../../api/graph';
import { getFreeNodeId } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useBackupUpload, useReuploadLost } from '../../hooks/useBackupUpload';
import { useImageURL } from '../../hooks/useImageURL';
import { useTranslate } from '../../i18n/I18nContext';
import { controlType } from '../../redux/config';
import {
    useIsCurrentTab,
    useRegisterHandler,
    useTabName,
} from '../contexts/TabContext';
import { UploadType } from './UploadType';
import { ext } from './fileExts';
import { useArrayFileContext } from './ArrayFileContext';

const style = {
    maxWidth: 200,
    maxHeight: 200,
    padding: 5,
    marginTop: 10,
    border: '1px solid gray',
};

const video_node = (video: string) => ({
    inputs: {
        file: video,
        'video-preview': '',
    },
    class_type: 'LoadVideo',
    _meta: {
        title: 'Load Video',
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
    extraHandler?: (
        api: Workflow,
        value: string,
        control: controlType,
        filetype: UploadType,
    ) => void;
}) => {
    const [uploadProgress, setUploadProgress] = useState(false);
    const [maybeBackupUpload] = useBackupUpload(props.name);
    const tr = useTranslate();
    const { field } = useController({ ...props, defaultValue: '' });
    const apiUrl = useApiURL();
    const imageURL = useImageURL(field.value);
    const filetype = useMemo((): UploadType => {
        if (!field.value) {
            return UploadType.IMAGE;
        }
        for (const k of Object.keys(ext)) {
            if (
                ext[k].some(
                    (e) =>
                        typeof field.value === 'string' &&
                        field.value.endsWith(e),
                )
            ) {
                return k as UploadType;
            }
        }
        return UploadType.IMAGE;
    }, [field.value]);
    const handler = useEventCallback(
        (api: Workflow, val: string, control: controlType) => {
            if (filetype === UploadType.IMAGE) {
                api[control.node_id].inputs[control.field] = val;
            } else if (control.format) {
                // LTX2 I2V: consumers reference this node's [0] as frames, so make it a
                // GetVideoComponents and keep the LoadVideo as a separate node.
                const loadNodeID = getFreeNodeId(api) + '';
                api[loadNodeID] = video_node(val);
                api[control.node_id] = {
                    inputs: { video: [loadNodeID, 0] },
                    class_type: 'GetVideoComponents',
                    _meta: { title: 'Get Video Components' },
                };
            } else {
                api[control.node_id] = video_node(val);
            }
            if (extraHandler) {
                extraHandler(api, val, control, filetype);
            }
        },
    );
    useRegisterHandler({ name: props.name, handler });
    const tabName = useTabName();
    const uploadKey = tabName + '/' + props.name;
    const arrayCtx = useArrayFileContext();
    // Upload a single file to ComfyUI's input dir; returns its filename and
    // the renamed File (timestamp-prefixed) for backup / onUpload.
    const uploadOne = useEventCallback(async (src: File) => {
        const formData = new FormData();
        const file = new File(
            [src],
            new Date().getTime() + '_' + src.name,
            { type: src.type },
        );
        formData.append('image', file);
        const r = await fetch(apiUrl + '/api/upload/image', {
            method: 'POST',
            body: formData,
        });
        const j = await r.json();
        j.filename = j.name;
        delete j.name;
        return { filename: j.filename, file };
    });
    const { mutate } = useMutation({
        onMutate: async (files: File[]) => {
            try {
                setUploadProgress(true);
                const { filename, file } = await uploadOne(files[0]);
                field.onChange(filename);
                maybeBackupUpload(files[0]);
                if (onUpload && filename) {
                    onUpload(file);
                }
            } catch (e) {
                toast(tr('toasts.error_uploading', { err: e }));
            } finally {
                setUploadProgress(false);
            }
        },
    });
    const onDrop = useEventCallback(async (acceptedFiles: File[]) => {
        if (!acceptedFiles.length) {
            return;
        }
        if (arrayCtx && acceptedFiles.length > 1) {
            // Multi-file drop inside an array: the current slot takes the first
            // file, the rest are appended into fresh slots (up to max).
            setUploadProgress(true);
            try {
                const results = await Promise.all(acceptedFiles.map(uploadOne));
                const filenames = results.map((r) => r.filename);
                field.onChange(filenames[0]);
                maybeBackupUpload(acceptedFiles[0]);
                if (onUpload && filenames[0]) {
                    onUpload(results[0].file);
                }
                const subField = props.name.split('.').pop();
                if (subField) {
                    const added = arrayCtx.appendSlots(
                        filenames.slice(1).map((fn) => ({ [subField]: fn })),
                    );
                    if (added < filenames.length - 1) {
                        toast.error(tr('toasts.array_overflow'));
                    }
                }
            } catch (e) {
                toast(tr('toasts.error_uploading', { err: e }));
            } finally {
                setUploadProgress(false);
            }
        } else {
            mutate(acceptedFiles);
        }
    });
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
            case UploadType.IMAGEORVIDEO:
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
        // Allow multi-file selection only inside an array, where each extra
        // file becomes its own slot.
        multiple: !!arrayCtx,
    });
    const handlePaste = useEventCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items || field.value) {
            return;
        }
        const acceptsImage =
            type === UploadType.IMAGE || type === UploadType.IMAGEORVIDEO;
        const acceptsVideo = type === UploadType.VIDEO || type === UploadType.IMAGEORVIDEO;
        const acceptsAudio = type === UploadType.AUDIO;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                if (item.type.startsWith('image/') && acceptsImage) {
                    const file = item.getAsFile();
                    if (file) {
                        onDrop([file]);
                    }
                    return;
                }
                if (item.type.startsWith('video/') && acceptsVideo) {
                    const file = item.getAsFile();
                    if (file) {
                        onDrop([file]);
                    }
                    return;
                }
                if (item.type.startsWith('audio/') && acceptsAudio) {
                    const file = item.getAsFile();
                    if (file) {
                        onDrop([file]);
                    }
                    return;
                }
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
    const handleUploadLost = useReuploadLost(
        () => uploadKey,
        () => field.onChange(null),
        (file) => {
            mutate([file]);
            return Promise.resolve();
        },
    );
    return (
        <Box mb={2} display='flex' flexDirection='column' width='100%'>
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
                {uploadProgress ? (
                    <LinearProgress />
                ) : (
                    <>
                        <input {...getInputProps()} />
                        <Box
                            display='flex'
                            alignItems='center'
                            flexDirection='column'
                        >
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
                                        onError={handleUploadLost}
                                    />
                                ) : filetype === UploadType.VIDEO ||
                                  filetype === UploadType.IMAGEORVIDEO ? (
                                    <video
                                        style={{ ...style, width: 200 }}
                                        src={imageURL}
                                        controls
                                        playsInline
                                        onError={handleUploadLost}
                                    />
                                ) : (
                                    <audio
                                        style={{ ...style, minWidth: 300 }}
                                        src={imageURL}
                                        controls
                                        onError={handleUploadLost}
                                    />
                                ))}
                        </Box>
                    </>
                )}
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
