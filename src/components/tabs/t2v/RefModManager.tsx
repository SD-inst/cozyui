import { Delete } from '@mui/icons-material';
import {
    Box,
    IconButton,
    MenuItem,
    Select,
    TextField,
    Tooltip,
    Typography,
    useEventCallback,
    useTheme,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { db, RefMod } from '../../history/db';
import { useTranslate } from '../../../i18n/I18nContext';
import { WFTab } from '../../WFTab';
import { GridLeft, GridRight, GridBottom, Layout } from '../../controls/Layout';
import { SelectInput } from '../../controls/SelectInput';
import { TextInput } from '../../controls/TextInput';
import { GenerateButton } from '../../controls/GenerateButton';
import { FileUpload } from '../../controls/FileUpload';
import { UploadType } from '../../controls/UploadType';
import { SliderInput } from '../../controls/SliderInput';
import { ToggleInput } from '../../controls/ToggleInput';
import { ArrayInput } from '../../controls/ArrayInput';
import { Workflow } from '../../../api/graph';
import { getFreeNodeId, insertGraph } from '../../../api/utils';
import { controlType } from '../../../redux/config';
import { useResult } from '../../../hooks/useResult';
import { useApiURL } from '../../../hooks/useApiURL';
import { useAppDispatch } from '../../../redux/hooks';
import { clearPrompt, delResult } from '../../../redux/tab';
import { parseSafetensorsMeta } from '../../../utils/safetensors';
import { genId } from '../../../utils/id';
import { useRefModOutputHandler } from '../../../hooks/useRefModOutputHandler';
import { useRegisterHandler } from '../../contexts/TabContext';

const LibraryPanel = () => {
    const tr = useTranslate();
    const [search, setSearch] = useState('');
    const [filterKind, setFilterKind] = useState('');

    const mods = useLiveQuery(async () => db.refMods.toArray(), []);

    const filteredMods = useMemo(() => {
        return (mods ?? []).filter((mod: RefMod) => {
            const matchesSearch =
                mod.name.toLowerCase().includes(search.toLowerCase()) ||
                mod.description?.toLowerCase().includes(search.toLowerCase());
            const matchesKind = !filterKind || mod.kind === filterKind;
            return matchesSearch && matchesKind;
        });
    }, [mods, search, filterKind]);

    return (
        <Box display='flex' flexDirection='column' gap={2} height='100%'>
            <Box display='flex' gap={1} alignItems='center'>
                <TextField
                    size='small'
                    fullWidth
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('refmods.search')}
                />
                <Select
                    size='small'
                    value={filterKind}
                    onChange={(e) => setFilterKind(e.target.value)}
                    sx={{ width: 120 }}
                >
                    <MenuItem value=''>{tr('refmods.all_kinds')}</MenuItem>
                    <MenuItem value='video'>{tr('refmods.video')}</MenuItem>
                    <MenuItem value='image'>{tr('refmods.image')}</MenuItem>
                    <MenuItem value='audio'>{tr('refmods.audio')}</MenuItem>
                </Select>
            </Box>
            <Box display='flex' flexWrap='wrap' gap={1}>
                {filteredMods.map((mod: RefMod) => (
                    <ModCard key={mod.id} mod={mod} />
                ))}
                {filteredMods.length === 0 && (
                    <Typography color='grey' variant='body2'>
                        {tr('refmods.no_mods')}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

const ModCard = ({ mod }: { mod: RefMod }) => {
    const tr = useTranslate();
    const theme = useTheme();
    const [url, setUrl] = useState('');

    const file = useLiveQuery(
        async () =>
            db.refModFiles
                .where({ mod: mod.id })
                .and((f: any) => f.fileType === 'thumbnail')
                .first(),
        [mod.id],
    );

    useEffect(() => {
        if (file?.file) {
            const u = URL.createObjectURL(file.file);
            setUrl(u);
            return () => URL.revokeObjectURL(u);
        }
    }, [file]);

    const handleDelete = async () => {
        await db.refModFiles.where({ mod: mod.id }).delete();
        await db.refMods.delete(mod.id);
    };

    return (
        <Box
            sx={{
                width: 160,
                borderRadius: 1,
                border: '1px solid',
                borderColor: theme.palette.grey[300],
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <Box
                sx={{
                    height: 120,
                    bgcolor: theme.palette.grey[100],
                    position: 'relative',
                }}
            >
                {url ? (
                    <img
                        src={url}
                        alt={mod.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                ) : (
                    <Box
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        height='100%'
                    >
                        {mod.kind === 'audio'
                            ? '🎵'
                            : mod.kind === 'image'
                              ? '🖼️'
                              : '🎬'}
                    </Box>
                )}
                <Tooltip title={tr('refmods.delete')}>
                    <IconButton
                        size='small'
                        sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(200,0,0,0.8)' },
                        }}
                        onClick={handleDelete}
                    >
                        <Delete fontSize='small' />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box sx={{ p: 1 }}>
                <Typography variant='body2' fontWeight='bold' noWrap>
                    {mod.name}
                </Typography>
                <Typography variant='caption' color='grey'>
                    {mod.kind} | {mod.tokens?.toLocaleString()} tok
                </Typography>
            </Box>
        </Box>
    );
};

const useRefModFilesHandler = (nodeField: string) => {
    return useEventCallback(
        (api: Workflow, value: any, control: controlType) => {
            if (!control.node_id) return;
            if (!value || !value.length) return;
            value.forEach((v: { image?: string }, idx: number) => {
                if (v?.image) {
                    const loadNodeId = getFreeNodeId(api) + '';
                    api[loadNodeId] = {
                        inputs: { image: v.image },
                        class_type: 'LoadImage',
                        _meta: { title: 'Load Image' },
                    };
                    api[control.node_id].inputs[`${nodeField}_${idx + 1}`] = [
                        loadNodeId,
                        0,
                    ];
                }
            });
        },
    );
};

// Reference videos are loaded as videos: each one's frames feed a
// `ref_video_N` visual ref. The Master node has a single `audio` input, so
// the audio source is chosen separately via `audio_source`:
//   - "video:<n>"  → the n-th uploaded video's own audio track
//   - "upload"     → a standalone audio file loaded from `audio_file`
//   - anything else ("none") → no audio
const useRefModVideoHandler = (
    audioSource: string | undefined,
    audioFile: string | undefined,
) => {
    return useEventCallback(
        (api: Workflow, value: any, control: controlType) => {
            if (!control.node_id) return;
            if (!value || !value.length) return;

            const uploadedComponents: string[] = [];
            value.forEach((v: { image?: string }, idx: number) => {
                if (!v?.image) return;

                const baseID = insertGraph(api, {
                    ':video': {
                        inputs: { file: '', 'video-preview': '' },
                        class_type: 'LoadVideo',
                        _meta: { title: 'Load Video' },
                    },
                    ':components': {
                        inputs: { video: [':video', 0] },
                        class_type: 'GetVideoComponents',
                        _meta: { title: 'Get Video Components' },
                    },
                });
                const componentsNodeID = baseID + ':components';

                api[baseID + ':video'].inputs.file = v.image;
                api[control.node_id].inputs['ref_video_' + (idx + 1)] = [
                    componentsNodeID,
                    0,
                ];
                uploadedComponents.push(componentsNodeID);
            });

            if (audioSource?.startsWith?.('video:')) {
                const n = parseInt(audioSource.slice(6));
                const componentsNodeID = uploadedComponents[n - 1];
                if (componentsNodeID) {
                    api[control.node_id].inputs.audio = [componentsNodeID, 1];
                }
            } else if (audioSource === 'upload' && audioFile) {
                const audioNodeID = getFreeNodeId(api) + '';
                api[audioNodeID] = {
                    inputs: { audio: audioFile },
                    class_type: 'LoadAudio',
                    _meta: { title: 'LoadAudio' },
                };
                api[control.node_id].inputs.audio = [audioNodeID, 0];
            }
        },
    );
};

const CreateModPanel = () => {
    const tr = useTranslate();
    const apiUrl = useApiURL();
    const dispatch = useAppDispatch();
    const results = useResult();
    const [isProcessing, setIsProcessing] = useState(false);
    const { setValue } = useFormContext();
    const modName = useWatch({ name: 'mod_name' });
    const refModOutputHandler = useRefModOutputHandler();
    useRegisterHandler({ name: 'refmod_output', handler: refModOutputHandler });
    useController({ name: 'refmod_output', defaultValue: '' });
    const refImagesHandler = useRefModFilesHandler('ref_image');
    useRegisterHandler({ name: 'ref_images', handler: refImagesHandler });
    const audioSource = useWatch({ name: 'audio_source' });
    const audioFile = useWatch({ name: 'audio_file' });
    // The audio connection is made by the ref_videos handler (it owns the
    // per-video components nodes); these two controls only keep the form
    // fields registered so the button can read their values.
    const noopHandler = useEventCallback(() => {});
    useRegisterHandler({ name: 'audio_source', handler: noopHandler });
    useRegisterHandler({ name: 'audio_file', handler: noopHandler });
    useController({ name: 'audio_source', defaultValue: 'video:1' });
    useController({ name: 'audio_file', defaultValue: '' });
    const refVideosHandler = useRefModVideoHandler(audioSource, audioFile);
    useRegisterHandler({ name: 'ref_videos', handler: refVideosHandler });

    const refImages = useWatch({ name: 'ref_images' });
    const refVideos = useWatch({ name: 'ref_videos' });
    const hasVideos = (refVideos ?? []).some(
        (v: { image?: string }) => !!v?.image,
    );
    const videoCount = (refVideos ?? []).filter(
        (v: { image?: string }) => !!v?.image,
    ).length;
    const audioSourceChoices = useMemo(
        () => [
            ...Array.from({ length: videoCount }, (_, i) => ({
                text: tr('refmods.video_n', { n: i + 1 }),
                value: `video:${i + 1}`,
            })),
            { text: tr('refmods.no_audio'), value: 'none' },
            { text: tr('refmods.upload_audio'), value: 'upload' },
        ],
        [videoCount, tr],
    );
    const importedRef = useRef(false);

    useEffect(() => {
        if (!results.length) {
            importedRef.current = false;
            return;
        }
        if (importedRef.current || isProcessing) return;
        importedRef.current = true;

        (async () => {
            setIsProcessing(true);
            try {
                const modResult = results[0];
                if (!modResult) throw new Error('No result found');

                const filename =
                    (typeof modResult === 'string'
                        ? modResult
                        : modResult.filename) + '.safetensors';
                const resultUrl = `${apiUrl}/api/view?filename=${filename}&subfolder=&type=output`;
                const response = await fetch(resultUrl);
                const blob = await response.blob();
                const file = new File([blob], filename);
                const meta = await parseSafetensorsMeta(file);
                const id = genId();

                await db.refMods.add({
                    id,
                    name: modName || meta.name || `RefMod_${Date.now()}`,
                    kind: (meta.kind as 'image' | 'video' | 'audio') || 'video',
                    tokens: meta.tokens || 0,
                    description: meta.description || '',
                    conceptType: meta.concept_type || '',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    shape: [meta.latent_t, meta.latent_h, meta.latent_w],
                    mode: (meta.mode as 'encode' | 'training') || 'encode',
                });

                const sourceName =
                    (refImages as any[])?.[0]?.image ||
                    (refVideos as any[])?.[0]?.image ||
                    null;
                if (sourceName && apiUrl) {
                    const sourceUrl = `${apiUrl}/api/view?filename=${sourceName}&output_folder=output&type=input`;
                    const sourceResp = await fetch(sourceUrl);
                    const sourceBlob = await sourceResp.blob();
                    let thumbnailBlob: Blob;
                    if (sourceBlob.type.startsWith('video/')) {
                        const videoUrl = URL.createObjectURL(sourceBlob);
                        const video = document.createElement('video');
                        video.src = videoUrl;
                        video.muted = true;
                        await new Promise<void>((resolve) => {
                            video.addEventListener(
                                'loadeddata',
                                () => resolve(),
                                { once: true },
                            );
                        });
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        canvas.getContext('2d')!.drawImage(video, 0, 0);
                        thumbnailBlob = await new Promise<Blob>((resolve) =>
                            canvas.toBlob((b) => resolve(b!), 'image/png'),
                        );
                        URL.revokeObjectURL(videoUrl);
                    } else {
                        thumbnailBlob = sourceBlob;
                    }
                    const thumbFile = new File(
                        [thumbnailBlob],
                        'thumbnail.png',
                        { type: 'image/png' },
                    );
                    await db.refModFiles.add({
                        id: `${id}/thumbnail`,
                        mod: id,
                        filename: 'thumbnail.png',
                        file: thumbFile,
                        fileType: 'thumbnail',
                    });
                }

                await db.refModFiles.add({
                    id: `${id}/${file.name}`,
                    mod: id,
                    filename: file.name,
                    file: file,
                    fileType: 'safetensors',
                });

                dispatch(clearPrompt());
                dispatch(delResult({ tab_name: 'RefMod Manager', id: '3' }));
            } catch (error) {
                console.error('Failed to import mod:', error);
                alert(tr('refmods.import_failed'));
            } finally {
                setIsProcessing(false);
            }
        })();
    }, [
        results,
        apiUrl,
        isProcessing,
        modName,
        refImages,
        refVideos,
        setValue,
        dispatch,
        tr,
    ]);

    return (
        <Box display='flex' flexDirection='column' gap={2}>
            <Typography variant='body1' fontWeight='bold'>
                {tr('refmods.create_panel')}
            </Typography>
            <TextInput name='mod_name' />
            <ArrayInput
                name='ref_images'
                newValue={{ image: '' }}
                max={128}
                targetFieldName='image'
            >
                <FileUpload
                    name='image'
                    label='image'
                    type={UploadType.IMAGE}
                />
            </ArrayInput>
            <ArrayInput
                name='ref_videos'
                newValue={{ image: '' }}
                max={8}
                targetFieldName='image'
            >
                <FileUpload
                    name='image'
                    label='video'
                    type={UploadType.VIDEO}
                />
            </ArrayInput>
            {hasVideos && (
                <SelectInput
                    name='audio_source'
                    label='audio_source'
                    choices={audioSourceChoices}
                    sx={{ width: 200 }}
                />
            )}
            {audioSource === 'upload' && (
                <FileUpload name='audio_file' type={UploadType.AUDIO} />
            )}
            <SelectInput
                name='mode'
                defaultValue='encode'
                choices={[
                    { text: tr('refmods.compressed'), value: 'training' },
                    { text: tr('refmods.full'), value: 'encode' },
                ]}
                sx={{ width: 180 }}
            />
            <SliderInput
                name='ref_resolution'
                defaultValue={1024}
                min={256}
                max={2048}
                step={64}
                tooltip={tr('refmods.ref_resolution_help')}
                sx={{ flexGrow: 1 }}
            />
            <SliderInput
                name='latent_frames'
                defaultValue={16}
                min={1}
                max={64}
                step={1}
                tooltip={tr('refmods.latent_frames_help')}
                sx={{ flexGrow: 1 }}
            />
            <ToggleInput
                name='merge'
                defaultValue={false}
                tooltip={tr('refmods.merge_help')}
            />
            <ToggleInput
                name='motion_only'
                defaultValue={false}
                tooltip={tr('refmods.motion_only_help')}
            />
            <SliderInput
                name='multiplier'
                defaultValue={1}
                min={1}
                max={10}
                step={1}
                tooltip={tr('refmods.multiplier_help')}
                sx={{ flexGrow: 1 }}
            />
            <SliderInput
                name='max_tokens'
                defaultValue={5120}
                min={0}
                max={20480}
                step={512}
                tooltip={tr('refmods.max_tokens_help')}
                sx={{ flexGrow: 1 }}
            />
            <SliderInput
                name='optimize_steps'
                defaultValue={500}
                min={0}
                max={1000}
                step={1}
                sx={{ flexGrow: 1 }}
            />
        </Box>
    );
};

const RefModGenerateButton = () => {
    const modName = useWatch({ name: 'mod_name' });
    const refImages = useWatch({ name: 'ref_images' });
    const refVideos = useWatch({ name: 'ref_videos' });

    const hasImages = (refImages ?? []).some(
        (v: { image?: string }) => !!v?.image,
    );
    const hasVideos = (refVideos ?? []).some(
        (v: { image?: string }) => !!v?.image,
    );
    const disabled = !modName || !(hasImages || hasVideos);

    return <GenerateButton disabled={disabled} />;
};

export const RefModManagerTab = (
    <WFTab
        label='RefMod Manager'
        value='RefMod Manager'
        group='I2V'
        content={
            <Layout>
                <GridLeft>
                    <CreateModPanel />
                </GridLeft>
                <GridRight>
                    <LibraryPanel />
                </GridRight>
                <GridBottom>
                    <RefModGenerateButton />
                </GridBottom>
            </Layout>
        }
    />
);
