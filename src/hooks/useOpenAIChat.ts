import { useCallback, useEffect, useRef, useState } from 'react';
import { llmConfigType } from '../redux/config';
import { useAppSelector } from '../redux/hooks';
import { RootState } from '../redux/store';
import { useMessageProcessor } from './useMessageProcessor';

export interface ImagePart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
}

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | Array<ImagePart>;
}

export interface UseOpenAIChatOptions {
    initialMessages?: OpenAIMessage[];
    onError?: (error: Error) => void;
    stream?: boolean;
}

export interface UseOpenAIChatReturn {
    messages: OpenAIMessage[];
    isComplete: boolean;
    isGenerating: boolean;
    isThinking: boolean;
    error: Error | null;
    sendMessage: (content: string, image?: string) => Promise<void>;
    abort: () => void;
    reset: () => void;
}

export function useOpenAIChat({
    initialMessages = [],
    onError,
    stream = false,
}: UseOpenAIChatOptions): UseOpenAIChatReturn {
    const llmConfig: llmConfigType = useAppSelector(
        (state: RootState) => state.config.llm || ({} as llmConfigType),
    );

    const [messagesState, setMessagesState] =
        useState<OpenAIMessage[]>(initialMessages);
    const [isComplete, setIsComplete] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => {
        setMessagesState(initialMessages);
        setIsComplete(false);
        setError(null);
    }, [initialMessages]);

    const abort = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const { processUserMessage } = useMessageProcessor();

    const sendMessage = useCallback(
        async (content: string, image?: string) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;
            const baseURL = llmConfig.baseURL;
            const apiKey = llmConfig.apiKey;

            const userMessage = await processUserMessage(content, image);
            let assistantContent = '';
            setMessagesState((prev) => [
                ...prev,
                userMessage,
                {
                    role: 'assistant',
                    content: '',
                },
            ]);
            setIsComplete(false);
            setIsGenerating(true);
            setIsThinking(!stream);
            setError(null);

            try {
                const response = await fetch(`${baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: image ? llmConfig.modelVision : llmConfig.model,
                        messages: [...messagesState, userMessage],
                        stream,
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
                                    }
                                    if (chunkContent) {
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
        error,
        sendMessage,
        abort,
        reset,
    };
}
