import { llmConfigType } from '../redux/config';

export interface OneShotMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * One-shot non-streaming chat completion (shared request shape with
 * `useOpenAIChat`). Used by lazily loaded features that need a single
 * completion without chat state.
 */
export const chatCompletionOnce = async (
    llmConfig: llmConfigType,
    messages: OneShotMessage[],
    signal?: AbortSignal,
): Promise<string> => {
    const response = await fetch(`${llmConfig.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
            model: llmConfig.model,
            messages,
            stream: false,
            temperature: llmConfig.temperature ?? 0.7,
        }),
        signal,
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
        throw new Error('Empty completion');
    }
    return content;
};