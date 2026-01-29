import { Person, SmartToy } from '@mui/icons-material';
import {
    Avatar,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Typography,
} from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';

interface ChatMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    onSendToPrompt?: (text: string) => void;
}

export const ChatMessage = ({
    role,
    content,
    onSendToPrompt,
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
                maxWidth: '80%',
                alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
                boxShadow: 1,
                backgroundColor: 'action.selected',
            }}
        >
            <CardHeader
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
                <Typography
                    variant='body1'
                    sx={{
                        lineHeight: 1.6,
                        fontSize: '0.9rem',
                    }}
                >
                    {content}
                </Typography>
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
                        onClick={() => onSendToPrompt(content)}
                        sx={{
                            boxShadow: 1,
                            '&:hover': {
                                boxShadow: 2,
                            },
                        }}
                    >
                        {tr('controls.send_to_prompt')}
                    </Button>
                </CardActions>
            )}
        </Card>
    );
};
