import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessageProcessor } from './useMessageProcessor';
import { useBooleanSetting } from './useSetting';
import { settings } from './settings';
import { useLLMConfig } from './useLLMConfig';
import { db } from '../components/history/db';
import { useTabName } from '../components/contexts/TabContext';
import { useAppSelector } from '../redux/hooks';

export interface ImagePart {
    type: 'text' | 'image_url' | 'input_video' | 'input_audio';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'auto' | 'low' | 'high';
    };
    input_video?: {
        data: string;
    };
    input_audio?: {
        data: string;
        format: string;
    };
}

export interface MediaRef {
    url: string;
    kind: 'image' | 'video' | 'audio';
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
    const loadedNonce = useRef<number>(-1);
    const stream = useBooleanSetting(settings.chat_stream);

    const tab = useTabName();
    // Per-tab reload signal (Redux nonce). Bumped by `useSaveSession` / `ResetButton`
    // / `SnapshotApplier` to make the chat re-read its `db.chatLogs` record. The DB
    // record is the single source of truth — resetting deletes it, restoring a
    // session writes it back, and in both cases we just re-read and follow.
    const nonce = useAppSelector((s) => s.chat.nonce[tab] ?? 0);
    // Latest-ref for `initialMessages` so the load effect's identity stays stable
    // across system-prompt (mode) changes — we only want to re-load on nonce bumps.
    const initialMessagesRef = useRef(initialMessages);
    initialMessagesRef.current = initialMessages;
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

    // Load: re-read the `db.chatLogs` record whenever the reload nonce changes
    // (initial load included). Restores a stored chat, or clears the message list
    // when the record was deleted (reset). The `loadedNonce` guard prevents a
    // re-load within the same nonce value (e.g. mid-generation, where isComplete
    // is briefly false).
    useEffect(() => {
        if (loadedNonce.current === nonce) {
            return;
        }
        // The first run (initial mount) only restores a saved chat; it must not
        // force-reset the (already-initial) state, which would race an in-flight
        // `sendMessage`. A later nonce bump with no record means the chat was
        // reset externally (reset form / save session), so we clear it then.
        const isFirstLoad = loadedNonce.current === -1;
        loadedNonce.current = nonce;
        db.chatLogs
            .where({ tab, id })
            .first()
            .then((m) => (m?.messages ? JSON.parse(m.messages) : null))
            .then((messages) => {
                if (messages && messages.length > 0) {
                    setMessagesState(messages);
                    setIsComplete(true);
                } else if (!isFirstLoad) {
                    setMessagesState(initialMessagesRef.current);
                    setIsComplete(false);
                    setError(null);
                }
            })
            .catch((e) => {
                console.log('Failed to load messages from IDB:', e);
            });
    }, [nonce, tab, id]);

    // Save: persist the current chat whenever a generation completes. Idempotent
    // re-saves after a restore are harmless (the record already holds this state).
    useEffect(() => {
        if (isComplete) {
            db.chatLogs.put({
                tab,
                id,
                messages: JSON.stringify(messagesState),
            });
        }
    }, [id, isComplete, messagesState, tab]);

    // The system prompt is a live parameter: keep the system message in sync
    // with the current `initialMessages` system content so it always reflects
    // the current mode (e.g. image vs video), even after load or a mid-session
    // change.
    const systemContent = initialMessages.find(
        (m) => m.role === 'system',
    )?.content;
    useEffect(() => {
        if (typeof systemContent !== 'string') {
            return;
        }
        setMessagesState((prev) =>
            prev.some(
                (m) => m.role === 'system' && m.content !== systemContent,
            )
                ? prev.map((m) =>
                        m.role === 'system'
                            ? { ...m, content: systemContent }
                            : m,
                    )
                : prev,
        );
    }, [systemContent, messagesState]);

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
            setIsThinking(false);
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
