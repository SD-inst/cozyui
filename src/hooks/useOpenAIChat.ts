import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageProcessor } from './useMessageProcessor';
import { useBooleanSetting } from './useSetting';
import { settings } from './settings';
import { useLLMConfig } from './useLLMConfig';
import { db } from '../components/history/db';
import { useTabName } from '../components/contexts/TabContext';

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

export interface MediaRef {
    url: string;
    kind: 'image' | 'video';
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<ImagePart>;
}

export interface UseOpenAIChatOptions {
    initialMessages?: OpenAIMessage[];
    onError?: (error: Error) => void;
    id?: string;
}

export interface UseOpenAIChatReturn {
    messages: OpenAIMessage[];
    isComplete: boolean;
    isGenerating: boolean;
    isThinking: boolean;
    isConnecting: boolean;
    error: Error | null;
    sendMessage: (
        content: string | OpenAIMessage,
        context?: OpenAIMessage[],
        media?: MediaRef[],
    ) => Promise<void>;
    abort: () => void;
    reset: () => void;
    resetTo: (upToIndex: number) => void;
}

export function useOpenAIChat({
    initialMessages = [],
    onError,
    id = 'main',
}: UseOpenAIChatOptions): UseOpenAIChatReturn {
    const llmConfig = useLLMConfig();

    const [messagesState, setMessagesState] =
        useState<OpenAIMessage[]>(initialMessages);
    const [isComplete, setIsComplete] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesLoaded = useRef<boolean>(false);
    const stream = useBooleanSetting(settings.chat_stream);

    const tab = useTabName();
    const reset = useCallback(() => {
        setMessagesState(initialMessages);
        setIsComplete(false);
        setError(null);
        db.chatLogs.where({ tab, id }).delete();
    }, [id, initialMessages, tab]);

    const resetTo = useCallback((upToIndex: number) => {
        setMessagesState((prev) => prev.slice(0, upToIndex));
        setIsComplete(true);
        setError(null);
    }, []);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const { processUserMessage } = useMessageProcessor();
    useEffect(() => {
        if (isComplete) {
            db.chatLogs.put({
                tab,
                id,
                messages: JSON.stringify(messagesState),
            });
        } else {
            if (!messagesLoaded.current) {
                db.chatLogs
                    .where({ tab, id })
                    .first()
                    .then((m) => (m?.messages ? JSON.parse(m.messages) : []))
                    .then((messages) => {
                        if (messages && messages.length > 0) {
                            setMessagesState(messages);
                            setIsComplete(true);
                        }
                    })
                    .catch((e) => {
                        console.log('Failed to load messages from IDB:', e);
                    });
                messagesLoaded.current = true;
            }
        }
    }, [id, isComplete, messagesState, tab]);

    const sendMessage = useCallback(
        async (
            content: string | OpenAIMessage,
            context?: OpenAIMessage[],
            media?: MediaRef[],
        ) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;
            const baseURL = llmConfig.baseURL;
            const apiKey = llmConfig.apiKey;

            const userMessage =
                typeof content === 'string'
                    ? await processUserMessage(content, media)
                    : content;
            let assistantContent = '';
            const finalContext = context ?? messagesState;
            setMessagesState(() => [
                ...finalContext,
                userMessage,
                {
                    role: 'assistant',
                    content: '',
                },
            ]);
            setIsComplete(false);
            setIsGenerating(true);
            setIsThinking(!stream);
            setIsConnecting(true);
            setError(null);

            try {
                const response = await fetch(`${baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model:
                            media?.length || typeof content !== 'string'
                                ? llmConfig.modelVision
                                : llmConfig.model,
                        messages: [...finalContext, userMessage],
                        stream,
                        temperature: llmConfig.temperature ?? 0.7,
                    }),
                    signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `API Error: ${response.status} ${response.statusText}`,
                    );
                }

                if (stream) {
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();

                    if (!reader) {
                        throw new Error('No reader available');
                    }

                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) break;

                        const buffer = decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');

                        for (const line of lines) {
                            const trimmed = line.trim();

                            if (!trimmed || trimmed === 'data: [DONE]')
                                continue;

                            if (trimmed.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(trimmed.slice(6));
                                    const chunkContent =
                                        data.choices?.[0]?.delta?.content || '';
                                    const reasoningContent =
                                        data.choices?.[0]?.delta
                                            ?.reasoning_content;

                                    if (reasoningContent) {
                                        setIsThinking(true);
                                        setIsConnecting(false);
                                    }
                                    if (chunkContent) {
                                        setIsConnecting(false);
                                        assistantContent += chunkContent;
                                        setMessagesState((prev) => [
                                            ...prev.slice(0, -1),
                                            {
                                                role: 'assistant',
                                                content: assistantContent,
                                            },
                                        ]);
                                    }
                                } catch {
                                    // Ignore parse errors for incomplete chunks
                                }
                            }
                        }
                    }
                } else {
                    const data = await response.json();
                    assistantContent =
                        data.choices?.[0]?.message?.content || '';
                    setMessagesState((prev) => [
                        ...prev.slice(0, -1),
                        {
                            role: 'assistant',
                            content: assistantContent,
                        },
                    ]);
                    setIsThinking(false);
                    setIsConnecting(false);
                }
                setIsComplete(true);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }

                const error =
                    err instanceof Error ? err : new Error(String(err));
                setError(error);
                onError?.(error);

                setMessagesState((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: `\n[Error: ${error.message}]`,
                    },
                ]);
            } finally {
                setIsGenerating(false);
                setIsConnecting(false);
                abortControllerRef.current = null;
            }
        },
        [messagesState, llmConfig, onError, stream, processUserMessage],
    );

    useEffect(() => {
        return () => {
            abort();
        };
    }, [abort]);

    return {
        messages: messagesState,
        isComplete,
        isGenerating,
        isThinking,
        isConnecting,
        error,
        sendMessage,
        abort,
        reset,
        resetTo,
    };
}
