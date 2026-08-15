import { Person, Refresh, SmartToy } from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Typography,
} from '@mui/material';
import { RefObject } from 'react';
import { useTranslate } from '../../i18n/I18nContext';

export interface ImagePart {
    type: 'text' | 'image_url' | 'input_video';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
    input_video?: {
        data: string;
    };
}

interface ChatMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string | ImagePart[];
    onSendToPrompt?: (text: string) => void;
    onRegenerate?: () => void;
    isComplete?: boolean;
    msgRef?: RefObject<HTMLElement>;
}

export const ChatMessage = ({
    role,
    content,
    onSendToPrompt,
    msgRef,
    onRegenerate,
}: ChatMessageProps) => {
    const tr = useTranslate();

    const defaultUserAvatarStyle = {
        width: 28,
        height: 28,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
    };

    const defaultAssistantAvatarStyle = {
        width: 28,
        height: 28,
        bgcolor: 'secondary.main',
        color: 'secondary.contrastText',
    };

    const avatarStyle =
        role === 'user' ? defaultUserAvatarStyle : defaultAssistantAvatarStyle;
    return (
        <Card
            sx={{
                maxWidth: { sm: '80%' },
                alignSelf: { sm: role === 'user' ? 'flex-end' : 'flex-start' },
                boxShadow: 1,
                backgroundColor: 'action.selected',
            }}
        >
            <CardHeader
                ref={msgRef}
                avatar={
                    role === 'assistant' ? (
                        <Avatar
                            alt={tr('controls.chat_avatar_assistant')}
                            sx={avatarStyle}
                        >
                            <SmartToy sx={{ fontSize: 18 }} />
                        </Avatar>
                    ) : (
                        <Avatar
                            alt={tr('controls.chat_avatar_user')}
                            sx={avatarStyle}
                        >
                            <Person
                                sx={{
                                    fontSize: 18,
                                    color: 'primary.contrastText',
                                }}
                            />
                        </Avatar>
                    )
                }
                title={
                    <Typography
                        variant='body2'
                        sx={{
                            fontWeight: 'bold',
                        }}
                    >
                        {role === 'assistant'
                            ? tr('controls.chat_avatar_assistant')
                            : tr('controls.chat_avatar_user')}
                    </Typography>
                }
            />
            <CardContent sx={{ p: 2 }}>
                {typeof content === 'string' ? (
                    <Typography
                        variant='body1'
                        sx={{
                            lineHeight: 1.6,
                            fontSize: '0.9rem',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {content}
                    </Typography>
                ) : (
                    (() => {
                        const media = content.filter(
                            (part) =>
                                part.type === 'image_url' ||
                                part.type === 'input_video',
                        );
                        const texts = content.filter(
                            (part) => part.type === 'text',
                        );
                        return (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1,
                                }}
                            >
                                {texts.map((part, index) => (
                                    <Typography
                                        key={index}
                                        variant='body1'
                                        sx={{
                                            lineHeight: 1.6,
                                            fontSize: '0.9rem',
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        {part.text}
                                    </Typography>
                                ))}
                                {media.length > 0 && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 1,
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        {media.map((part, index) =>
                                            part.type === 'input_video' ? (
                                                <video
                                                    key={index}
                                                    src={part.input_video?.data || ''}
                                                    playsInline
                                                    onClick={(e) => {
                                                        const v =
                                                            e.currentTarget;
                                                        if (v.paused) {
                                                            v.play();
                                                        } else {
                                                            v.pause();
                                                        }
                                                    }}
                                                    style={{
                                                        maxWidth: 100,
                                                        maxHeight: 100,
                                                        objectFit: 'contain',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        background: 'black',
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    key={index}
                                                    src={part.image_url?.url || ''}
                                                    alt='User image'
                                                    style={{
                                                        maxWidth: 100,
                                                        maxHeight: 100,
                                                        objectFit: 'contain',
                                                        borderRadius: '4px',
                                                    }}
                                                />
                                            ),
                                        )}
                                    </Box>
                                )}
                            </Box>
                        );
                    })()
                )}
            </CardContent>
            {role === 'assistant' && onSendToPrompt && (
                <CardActions>
                    <Button
                        variant='contained'
                        size='small'
                        color='primary'
                        startIcon={
                            <Avatar
                                sx={{
                                    width: 20,
                                    height: 20,
                                    bgcolor: 'secondary.main',
                                    color: 'secondary.contrastText',
                                }}
                            >
                                <Person sx={{ fontSize: 12 }} />
                            </Avatar>
                        }
                        onClick={() => {
                            const text =
                                typeof content === 'string' ? content : '';
                            if (text) {
                                onSendToPrompt(text);
                            }
                        }}
                        sx={{
                            boxShadow: 1,
                            '&:hover': {
                                boxShadow: 2,
                            },
                        }}
                    >
                        {tr('controls.send_to_prompt')}
                    </Button>
                    {onRegenerate && (
                        <Button
                            variant='outlined'
                            size='small'
                            color='secondary'
                            startIcon={<Refresh sx={{ fontSize: 16 }} />}
                            onClick={onRegenerate}
                            sx={{
                                '&:hover': {
                                    backgroundColor: 'secondary.light',
                                },
                            }}
                        >
                            {tr('controls.regenerate')}
                        </Button>
                    )}
                </CardActions>
            )}
        </Card>
    );
};
