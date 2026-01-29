import { useState, useRef, useEffect } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { useOpenAIChat } from '../../hooks/useOpenAIChat';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppSelector } from '../../redux/hooks';
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
import { ExpandMore, Person, Send } from '@mui/icons-material';
import { ChatMessage } from './ChatMessage';

export const ChatComponent = ({
    promptFieldName = 'prompt',
    systemPrompt = 'You are a helpful assistant.',
}: {
    promptFieldName?: string;
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
    const { setValue } = useFormContext();
    const stream = form.watch('stream');
    const input = form.watch('input');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const {
        messages,
        error,
        sendMessage,
        reset,
        abort,
        isComplete,
        isGenerating,
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

    if (!llmConfig?.model) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        form.reset({ ...form.getValues(), input: '' });
        await sendMessage(input.trim());
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

    const visibleMessages = messages.filter((m) => m.role !== 'system');
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
                    ref={messagesEndRef}
                    sx={{ p: { xs: 0, md: 2 } }}
                >
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                        }}
                    >
                        {visibleMessages.map((msg, idx) => (
                            <ChatMessage
                                key={idx}
                                role={msg.role}
                                content={msg.content}
                                onSendToPrompt={
                                    isComplete ||
                                    idx < visibleMessages.length - 1
                                        ? handleSendToPrompt
                                        : undefined
                                }
                            />
                        ))}
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
                        <div ref={messagesEndRef} />
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
                            />
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
                                    sx={{
                                        boxShadow: 1,
                                        '&:hover': {
                                            boxShadow: 2,
                                        },
                                        ...buttonSx,
                                    }}
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
                                                startIcon={<Person />}
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
