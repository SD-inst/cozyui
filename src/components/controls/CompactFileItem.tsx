import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { Badge, Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { Close } from '@mui/icons-material';
import { memo, useState } from 'react';
import { UploadType } from './UploadType';
import { ext } from './fileExts';
import { useImageURL } from '../../hooks/useImageURL';

export const THUMBNAIL_SIZE = 128;
export const AUDIO_ITEM_HEIGHT = 48;

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

export const CompactFileItem = memo(
    ({
        id,
        index,
        filename,
        onRemove,
        onReplace,
        lightboxOpen,
        onOpenControls,
        onUploadLost,
    }: {
        id: string;
        index: number;
        filename?: string;
        onRemove: (index: number) => void;
        onReplace: (index: number, file: File) => void;
        lightboxOpen: (index: number) => void;
        onOpenControls: (index: number) => void;
        onUploadLost: (index: number) => void;
    }) => {
        const theme = useTheme();
        const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
        const [hovered, setHovered] = useState(false);
        const fileType = getFileType(filename);
        const imageURL = useImageURL(filename);

        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging,
        } = useSortable({ id });

        const style: React.CSSProperties = {
            transform: CSS.Transform.toString(transform),
            transition: transition || undefined,
            opacity: isDragging ? 0.5 : undefined,
            position: 'relative',
        };

        const isAudio = fileType === UploadType.AUDIO;

        const handleClick = () => {
            if (!isDragging && filename) {
                lightboxOpen(index);
            }
        };

        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                onReplace(index, files[0]);
            }
        };

        return (
            <Box
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                style={style}
                sx={{
                    cursor: 'grab',
                    '&:active': { cursor: 'grabbing' },
                    ...(isAudio ? { mr: 1, mb: 1 } : {}),
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                {isAudio ? (
                    <Box
                        sx={{
                            width: 300,
                            height: AUDIO_ITEM_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        {filename ? (
                            <audio
                                src={imageURL}
                                controls
                                onError={() => onUploadLost(index)}
                                style={{ width: '100%' }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: theme.palette.grey[500],
                                }}
                            >
                                ♫
                            </Box>
                        )}
                    </Box>
                ) : fileType === UploadType.VIDEO ? (
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
                        }}
                    >
                        {filename ? (
                            <video
                                src={imageURL}
                                muted
                                playsInline
                                preload='auto'
                                onError={() => onUploadLost(index)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                }}
                            />
                        ) : (
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
                                🎬
                            </Box>
                        )}
                        {filename && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 4,
                                    right: 4,
                                    bgcolor: 'rgba(0,0,0,0.6)',
                                    borderRadius: 0.5,
                                    px: 0.5,
                                    fontSize: '0.6rem',
                                    color: 'white',
                                }}
                            >
                                ▶
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box
                        sx={{
                            width: THUMBNAIL_SIZE,
                            height: THUMBNAIL_SIZE,
                            borderRadius: 1,
                            overflow: 'hidden',
                            bgcolor: theme.palette.grey[100],
                            border: '1px solid',
                            borderColor: theme.palette.grey[300],
                        }}
                    >
                        {filename && (
                            <img
                                src={imageURL}
                                alt=''
                                onError={() => onUploadLost(index)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                                draggable={false}
                            />
                        )}
                        {!filename && (
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
                                🖼
                            </Box>
                        )}
                    </Box>
                )}

                {!isMobile && hovered && filename && (
                    <IconButton
                        size='small'
                        sx={{
                            position: 'absolute',
                            top: isAudio ? -10 : 5,
                            right: isAudio ? -10 : 5,
                            width: 20,
                            height: 20,
                            p: 0,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            zIndex: 1,
                            '&:hover': { bgcolor: 'rgba(200,0,0,0.8)' },
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(index);
                        }}
                    >
                        <Close sx={{ fontSize: 12 }} />
                    </IconButton>
                )}

                <Badge
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenControls(index);
                    }}
                    badgeContent={index + 1}
                    color='primary'
                    sx={{
                        position: 'absolute',
                        top: isAudio ? 0 : 15,
                        left: isAudio ? 0 : 15,
                        cursor: 'pointer',
                        '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                        },
                    }}
                />
            </Box>
        );
    },
);
