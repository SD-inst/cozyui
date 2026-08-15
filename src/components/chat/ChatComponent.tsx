import {
    Cancel,
    ClearAll,
    ExpandMore,
    Person,
    Send,
} from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useImageURLs } from '../../hooks/useImageURL';
import { ImagePart, useOpenAIChat } from '../../hooks/useOpenAIChat';
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

const buttonSx = {
    minWidth: { xs: 100, sm: 120 },
    px: { xs: 2, sm: 3 },
    gap: 0.5,
};

export const ChatComponent = ({
    promptFieldName = 'prompt',
    imageFieldNames,
    systemPrompt = 'You are a helpful assistant.',
    transformFirstMessage,
}: {
    promptFieldName?: string;
    imageFieldNames?: string[];
    systemPrompt?: string;
    transformFirstMessage?: (text: string) => string;
}) => {
    const tr = useTranslate();
    const llmConfig = useAppSelector((state) => state.config.llm);

    const form = useForm({
        defaultValues: {
            input: '',
        },
    });
    const { setValue, watch } = useFormContext();
    const input = form.watch('input');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMsgCount = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const imageFields = imageFieldNames ?? [];
    const imageValues = (imageFields.length
        ? watch(imageFields)
        : []) as Array<string | undefined>;
    const imageURLs = useImageURLs(imageValues);

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
        initialMessages: [
            {
                role: 'system',
                content: systemPrompt,
            },
        ],
    });

    useEffect(() => {
        if (
            isExpanded &&
            (messages.length !== lastMsgCount.current || isComplete)
        ) {
            lastMsgCount.current = messages.length;
            messagesEndRef.current?.scrollIntoView({
                behavior: 'smooth',
            });
        }
    }, [isComplete, isExpanded, messages.length]);

    if (
        !llmConfig?.model ||
        (imageFields.length > 0 && !llmConfig?.modelVision)
    ) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        form.setValue('input', '');
        const firstMessage = !messages.some((m) => m.role === 'user');
        const rawInput = input.trim();
        const images =
            imageFields.length > 0 && firstMessage
                ? imageValues
                      .map((value, idx) => ({ value, url: imageURLs[idx] }))
                      .filter((v) => v.value && !isVideo(v.value))
                      .map((v) => v.url)
                : undefined;
        await sendMessage(
            firstMessage && transformFirstMessage
                ? transformFirstMessage(rawInput)
                : rawInput,
            undefined,
            images && images.length > 0 ? images : undefined,
        );
    };

    const extractFirstMessageText = (
        content: string | ImagePart[],
    ): string => {
        const text = Array.isArray(content)
            ? content.find((m) => m.type === 'text')?.text || ''
            : content;
        if (!transformFirstMessage) {
            return text;
        }
        const marker = 'description=';
        const idx = text.indexOf(marker);
        return idx === -1 ? text : text.slice(idx + marker.length);
    };

    const handleResetChat = (full?: boolean) => {
        const firstMsg = messages.find((m) => m.role === 'user')?.content;
        reset();
        setTimeout(() => {
            if (!full && firstMsg) {
                form.setValue('input', extractFirstMessageText(firstMsg));
            }
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
                <AccordionDetails
                    sx={{
                        p: { xs: 0, md: 2 },
                    }}
                >
                    <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1.5,
                            }}
                        >
                            {messages.map(
                                (msg, idx) =>
                                    msg.role !== 'system' &&
                                    !(
                                        msg.role === 'assistant' && !msg.content
                                    ) && (
                                        <ChatMessage
                                            msgRef={messagesEndRef}
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
                                                    ? () =>
                                                          handleRegenerate(idx)
                                                    : undefined
                                            }
                                        />
                                    ),
                            )}
                            {isThinking && isGenerating && (
                                <ThinkingIndicator />
                            )}
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
                                        e.key === 'Enter' &&
                                        !e.shiftKey &&
                                        !e.ctrlKey
                                    ) {
                                        handleSubmit(e);
                                    } else if (
                                        e.key === 'Enter' &&
                                        e.shiftKey &&
                                        !e.ctrlKey
                                    ) {
                                        const input = e.currentTarget as
                                            | HTMLInputElement
                                            | HTMLTextAreaElement;
                                        const start = input.selectionStart ?? 0;
                                        const end = input.selectionEnd ?? 0;
                                        const text = input.value;
                                        const newText =
                                            text.slice(0, start) +
                                            '\n' +
                                            text.slice(end);
                                        form.setValue('input', newText);
                                    }
                                }}
                            />
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    alignItems: 'center',
                                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                                }}
                            >
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
                                            onClick={() =>
                                                handleResetChat(false)
                                            }
                                            variant='outlined'
                                            size='medium'
                                            color='info'
                                            startIcon={<Person />}
                                            sx={buttonSx}
                                            disabled={isGenerating}
                                        >
                                            {tr('controls.chat_new_chat')}
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                handleResetChat(true)
                                            }
                                            variant='outlined'
                                            size='medium'
                                            color='info'
                                            startIcon={<ClearAll />}
                                            sx={buttonSx}
                                            disabled={isGenerating}
                                        >
                                            {tr('controls.chat_clear')}
                                        </Button>
                                        {isGenerating && (
                                            <Button
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
