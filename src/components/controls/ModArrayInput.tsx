import { Box, useTheme } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { memo, useEffect, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import Lightbox from 'yet-another-react-lightbox';
import { ArrayInput } from './ArrayInput';
import { SliderInput } from './SliderInput';
import { useModPicker } from './ModPickerDialog';
import { db } from '../history/db';
import { useModThumbURLs } from '../../hooks/useImageURL';

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
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
        />
    );
});

const ModThumbContent = ({
    item,
    url,
    onClick,
}: {
    item: any;
    url?: string;
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
            onClick={() => openLightbox(index)}
        />
    );

    const renderPreview = (item: any, index: number) => {
        const url = thumbURLs[index];
        return (
            <Box
                sx={{
                    width: 200,
                    height: 200,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    marginBottom: 16,
                    cursor: url ? 'pointer' : undefined,
                }}
                onClick={url ? () => openLightbox(index) : undefined}
            >
                {item?.id && url && (
                    <img
                        src={url}
                        alt=''
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                )}
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
