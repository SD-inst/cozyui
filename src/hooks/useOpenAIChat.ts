import { useCallback, useEffect, useState, useRef } from 'react';
import { RootState } from '../redux/store';
import { llmConfigType } from '../redux/config';
import { useAppSelector } from '../redux/hooks';

export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
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
    error: Error | null;
    sendMessage: (content: string) => Promise<void>;
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

    const sendMessage = useCallback(
        async (content: string) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;
            const baseURL = llmConfig.baseURL;
            const apiKey = llmConfig.apiKey;

            const userMessage: OpenAIMessage = {
                role: 'user',
                content,
            };

            setMessagesState((prev) => [...prev, userMessage]);
            setIsComplete(false);
            setIsGenerating(true);
            setError(null);

            try {
                let assistantContent = '';
                const response = await fetch(`${baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: llmConfig.model,
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

                    setMessagesState((prev) => [
                        ...prev,
                        { role: 'assistant', content: '' },
                    ]);
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
                                    if (
                                        data.choices?.[0]?.delta
                                            ?.reasoning_content
                                    ) {
                                        setMessagesState((prev) => [
                                            ...prev.slice(0, -1),
                                            {
                                                role: 'assistant',
                                                content: '*thinking*',
                                            },
                                        ]);
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
                        ...prev,
                        { role: 'assistant', content: assistantContent },
                    ]);
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
        [messagesState, llmConfig, onError, stream],
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
        error,
        sendMessage,
        abort,
        reset,
    };
}
