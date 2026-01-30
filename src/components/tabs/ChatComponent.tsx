import { Cancel, ExpandMore, Person, Send } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useImageURL } from '../../hooks/useImageURL';
import { useOpenAIChat } from '../../hooks/useOpenAIChat';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppSelector } from '../../redux/hooks';
import { ext } from '../controls/fileExts';
import { UploadType } from '../controls/UploadType';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';

const isVideo = (filename?: string): boolean => {
    if (!filename) return false;
    return ext[UploadType.VIDEO].some((ext) =>
        filename.toLowerCase().endsWith(ext),
    );
};

export const ChatComponent = ({
    promptFieldName = 'prompt',
    imageFieldName,
    systemPrompt = 'You are a helpful assistant.',
}: {
    promptFieldName?: string;
    imageFieldName?: string;
    systemPrompt?: string;
}) => {
    const tr = useTranslate();
    const llmConfig = useAppSelector((state) => state.config.llm);

    const buttonSx = {
        minWidth: { xs: 100, sm: 120 },
        px: { xs: 2, sm: 3 },
        gap: 0.5,
    };

    const form = useForm({
        defaultValues: {
            input: '',
            stream: true,
        },
    });
    const { setValue, watch } = useFormContext();
    const stream = form.watch('stream');
    const input = form.watch('input');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const image = watch(imageFieldName || '');
    const imageURL = useImageURL(image);

    const {
        messages,
        error,
        sendMessage,
        reset,
        abort,
        isComplete,
        isGenerating,
        isThinking,
    } = useOpenAIChat({
        stream,
        initialMessages: [
            {
                role: 'system',
                content: systemPrompt,
            },
        ],
    });

    useEffect(() => {
        if (!isGenerating && isComplete) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [isComplete, isGenerating]);

    if (!llmConfig?.model || (!!imageFieldName && !llmConfig?.modelVision)) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        form.setValue('input', '');
        await sendMessage(
            input.trim(),
            undefined,
            imageFieldName && !isVideo(image) ? imageURL : undefined,
        );
    };

    const handleResetChat = () => {
        reset();
        form.setValue('input', '');
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const handleSendToPrompt = (text: string) => {
        setValue(promptFieldName, text);
    };

    const handleRegenerate = (assistantIndex: number) => {
        const contextAbove = messages.slice(0, assistantIndex - 1);
        const userMessage = messages
            .slice(0, assistantIndex)
            .reverse()
            .find((v) => v.role === 'user');
        if (!userMessage) {
            return;
        }
        sendMessage(
            { role: 'user', content: userMessage.content },
            contextAbove,
        );
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                mb: 2,
            }}
        >
            <Accordion
                expanded={isExpanded}
                onChange={(_, expanded) => setIsExpanded(expanded)}
            >
                <AccordionSummary
                    expandIcon={<ExpandMore />}
                    aria-controls='chat-content'
                    id='chat-header'
                    sx={{
                        '& .MuiAccordionSummary-content': {
                            alignItems: 'center',
                        },
                    }}
                >
                    {tr('controls.chat_title')}
                </AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 0, md: 2 } }}>
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }}
                    >
                        {messages.map(
                            (msg, idx) =>
                                msg.role !== 'system' &&
                                !(msg.role === 'assistant' && !msg.content) && (
                                    <ChatMessage
                                        msgRef={
                                            idx < messages.length - 1
                                                ? undefined
                                                : messagesEndRef
                                        }
                                        key={idx}
                                        role={msg.role}
                                        content={msg.content}
                                        onSendToPrompt={
                                            isComplete ||
                                            idx < messages.length - 1
                                                ? handleSendToPrompt
                                                : undefined
                                        }
                                        onRegenerate={
                                            msg.role === 'assistant' &&
                                            !isGenerating
                                                ? () => handleRegenerate(idx)
                                                : undefined
                                        }
                                    />
                                ),
                        )}
                        {isThinking && isGenerating && <ThinkingIndicator />}
                        {error && (
                            <Box
                                sx={{
                                    maxWidth: '95%',
                                    p: 1,
                                    borderRadius: 1,
                                    textAlign: 'center',
                                }}
                            >
                                <Typography variant='caption' color='error'>
                                    {error.message}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <FormProvider {...form}>
                        <Box
                            component='form'
                            onSubmit={handleSubmit}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                                p: 1,
                            }}
                        >
                            <TextField
                                fullWidth
                                {...form.register('input')}
                                placeholder={tr('controls.chat_placeholder')}
                                size='small'
                                inputRef={inputRef}
                                multiline
                                onKeyDown={(e) => {
                                    if (
                                        e.ctrlKey &&
                                        e.key === 'Enter' &&
                                        !e.shiftKey
                                    ) {
                                        handleSubmit(e);
                                    }
                                }}
                            />
                            {imageURL && !isVideo(image) && (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mt: 1,
                                    }}
                                >
                                    <img
                                        src={imageURL}
                                        alt='Attached image'
                                        style={{
                                            maxWidth: '200px',
                                            maxHeight: '200px',
                                            objectFit: 'contain',
                                            borderRadius: '4px',
                                        }}
                                    />
                                </Box>
                            )}
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    alignItems: 'center',
                                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                }}
                            >
                                <FormControl
                                    sx={{
                                        flexDirection: 'row',
                                        flexShrink: 0,
                                        width: { xs: 'auto', sm: 'auto' },
                                    }}
                                >
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                {...form.register('stream')}
                                                checked={stream}
                                                size='small'
                                            />
                                        }
                                        label={tr('controls.stream')}
                                    />
                                </FormControl>
                                <Button
                                    type='submit'
                                    disabled={!input.trim()}
                                    variant='contained'
                                    size='medium'
                                    color='primary'
                                    startIcon={<Send />}
                                    sx={buttonSx}
                                >
                                    {tr('controls.chat_send')}
                                </Button>
                                {messages.some(
                                    (m) => m.role === 'assistant',
                                ) && (
                                    <>
                                        <Button
                                            type='button'
                                            onClick={handleResetChat}
                                            variant='outlined'
                                            size='medium'
                                            color='info'
                                            startIcon={<Person />}
                                            sx={buttonSx}
                                            disabled={isGenerating}
                                        >
                                            {tr('controls.chat_new_chat')}
                                        </Button>
                                        {isGenerating && (
                                            <Button
                                                type='button'
                                                onClick={() => abort()}
                                                variant='outlined'
                                                size='medium'
                                                color='error'
                                                startIcon={<Cancel />}
                                                sx={buttonSx}
                                            >
                                                {tr('controls.chat_interrupt')}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </Box>
                        </Box>
                    </FormProvider>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
