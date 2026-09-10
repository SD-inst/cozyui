import { Box, useTheme } from '@mui/material';
import { Image as ImageIcon, MusicNote, Videocam } from '@mui/icons-material';
import { useLiveQuery } from 'dexie-react-hooks';
import { memo, useEffect, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import Lightbox from 'yet-another-react-lightbox';
import { ArrayInput } from './ArrayInput';
import { SliderInput } from './SliderInput';
import { useModPicker } from '../../hooks/useModPicker';
import { db } from '../history/db';
import { useModThumbURLs } from '../../hooks/useImageURL';
import { useRefModMeta, refModThumbStyle } from '../../hooks/useRefMods';

import 'yet-another-react-lightbox/styles.css';

const THUMBNAIL_SIZE = 128;

export const ModThumbnail = memo(({ modId }: { modId: string }) => {
    const [url, setUrl] = useState('');
    const file = useLiveQuery(
        async () =>
            db.refModFiles
                .where({ mod: modId })
                .and((f: any) => f.fileType === 'thumbnail')
                .first(),
        [modId],
    );
    const mod = useLiveQuery(() => db.refMods.get(modId), [modId]);
    useEffect(() => {
        if (file?.file) {
            const u = URL.createObjectURL(file.file);
            setUrl(u);
            return () => URL.revokeObjectURL(u);
        }
    }, [file]);
    if (!url) return null;
    return (
        <img
            src={url}
            alt=''
            style={refModThumbStyle(mod?.thumbX ?? 50, mod?.thumbY ?? 50)}
            draggable={false}
        />
    );
});

// Small type badge (video/image/audio) anchored to the bottom-right corner of
// a mod thumbnail. Bottom-right is used because the top-right holds the remove
// button and the top-left the index badge (see CustomItemShell).
export const ModKindIcon = ({
    kind,
}: {
    kind?: 'image' | 'video' | 'audio';
}) => {
    if (!kind) {
        return null;
    }
    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(0,0,0,0.6)',
                color: 'white',
                px: 0.5,
                py: 0.25,
                borderRadius: '4px 0 0 0',
            }}
        >
            {kind === 'audio' ? (
                <MusicNote sx={{ fontSize: 14 }} />
            ) : kind === 'image' ? (
                <ImageIcon sx={{ fontSize: 14 }} />
            ) : (
                <Videocam sx={{ fontSize: 14 }} />
            )}
        </Box>
    );
};

// Mod name bar anchored to the bottom of a mod thumbnail (mirrors the library
// card and the picker). Centered, ellipsized; the kind badge sits on top of its
// right end.
export const ModThumbLabel = ({ text }: { text?: string }) => {
    if (!text) {
        return null;
    }
    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1,
                bgcolor: 'rgba(0,0,0,0.6)',
                px: 0.5,
                py: 0.25,
                fontSize: '0.6rem',
                color: 'white',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
            {text}
        </Box>
    );
};

const ModThumbContent = ({
    item,
    url,
    thumbX,
    thumbY,
    name,
    kind,
    onClick,
}: {
    item: any;
    url?: string;
    thumbX?: number;
    thumbY?: number;
    name?: string;
    kind?: 'image' | 'video' | 'audio';
    onClick?: () => void;
}) => {
    const theme = useTheme();
    const clickable = !!item?.id && !!url;
    return (
        <Box
            sx={{
                width: THUMBNAIL_SIZE,
                height: THUMBNAIL_SIZE,
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: theme.palette.grey[100],
                border: '1px solid',
                borderColor: theme.palette.grey[300],
                position: 'relative',
                cursor: clickable ? 'pointer' : undefined,
            }}
            onClick={clickable ? onClick : undefined}
        >
            {item?.id && url ? (
                <img
                    src={url}
                    alt=''
                    style={refModThumbStyle(
                        thumbX ?? 50,
                        thumbY ?? 50,
                    )}
                    draggable={false}
                />
            ) : !item?.id ? (
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: theme.palette.grey[500],
                    }}
                >
                    🎨
                </Box>
            ) : null}
            <ModThumbLabel text={name} />
            <ModKindIcon kind={kind} />
        </Box>
    );
};

export const ModArrayInput = ({
    label,
    name,
    max = -1,
}: {
    name: string;
    label?: string;
    max?: number;
}) => {
    const picker = useModPicker({ name, max });
    const value = useWatch({
        name,
    }) as Array<{ id?: string }> | undefined;
    const modIds = useMemo(() => (value ?? []).map((v) => v?.id), [value]);
    const thumbURLs = useModThumbURLs(modIds);
    // Per-mod crop offsets, parallel to thumbURLs (used to anchor the cover
    // crop so each thumbnail shows its stored focus region).
    const modMetas = useRefModMeta(modIds);

    // Lightbox: one slide per mod that actually has a thumbnail. Audio-only
    // mods have no thumbnail, so they are skipped and the item→slide mapping
    // stays aligned for the visual ones.
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const { slides, slideIndexByItem } = useMemo(() => {
        const slideList: Array<{ src: string }> = [];
        const map: Array<number> = [];
        (value ?? []).forEach((_item, index) => {
            const url = thumbURLs[index];
            if (url) {
                slideList.push({ src: url });
                map[index] = slideList.length - 1;
            } else {
                map[index] = -1;
            }
        });
        return { slides: slideList, slideIndexByItem: map };
    }, [value, thumbURLs]);

    const openLightbox = (index: number) => {
        const si = slideIndexByItem[index];
        if (si === undefined || si < 0) return;
        setLightboxIndex(si);
        setLightboxOpen(true);
    };

    const handleReplace = (index: number) => {
        picker.openPicker(index);
    };

    const renderItem = (item: any, index: number) => (
        <ModThumbContent
            item={item}
            url={thumbURLs[index]}
            thumbX={modMetas[index]?.thumbX}
            thumbY={modMetas[index]?.thumbY}
            name={modMetas[index]?.name}
            kind={modMetas[index]?.kind}
            onClick={() => openLightbox(index)}
        />
    );

    const renderPreview = (item: any, index: number) => {
        const url = thumbURLs[index];
        const meta = modMetas[index];
        return (
            <Box
                sx={{
                    width: 200,
                    height: 200,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    marginBottom: 16,
                    position: 'relative',
                    cursor: url ? 'pointer' : undefined,
                }}
                onClick={url ? () => openLightbox(index) : undefined}
            >
                {item?.id && url && (
                    <img
                        src={url}
                        alt=''
                        style={refModThumbStyle(
                            meta?.thumbX ?? 50,
                            meta?.thumbY ?? 50,
                        )}
                    />
                )}
                <ModThumbLabel text={meta?.name} />
                <ModKindIcon kind={meta?.kind} />
            </Box>
        );
    };

    return (
        <>
            <ArrayInput
                name={name}
                label={label}
                newValue={{ id: '', strength: 1.0, copies: 1 }}
                keyField='id'
                max={max}
                renderItem={renderItem}
                onAddClick={() => picker.openPicker()}
                onReplaceClick={handleReplace}
                renderPreview={renderPreview}
            >
                <SliderInput
                    name='strength'
                    label='refmods.strength'
                    defaultValue={1.0}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <SliderInput
                    name='copies'
                    label='refmods.copies'
                    defaultValue={1}
                    min={1}
                    max={10}
                    step={1}
                />
            </ArrayInput>
            {picker.dialog}
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={slides}
                index={lightboxIndex}
            />
        </>
    );
};
