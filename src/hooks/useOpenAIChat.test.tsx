import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOpenAIChat, OpenAIMessage } from './useOpenAIChat';

const mockLLMConfig = {
    baseURL: 'https://api.test/v1',
    apiKey: 'sk-test',
    model: 'test-model',
    modelVision: 'test-vision',
    temperature: 0.7,
};

vi.mock('./useLLMConfig', () => ({
    useLLMConfig: () => mockLLMConfig,
}));

vi.mock('./useSetting', () => ({
    useBooleanSetting: () => false,
    settings: { chat_stream: 'chat_stream' },
}));

vi.mock('./settings', () => ({
    settings: { chat_stream: 'chat_stream' },
}));

vi.mock('./useMessageProcessor', () => ({
    useMessageProcessor: () => ({
        processUserMessage: (content: string) => ({
            role: 'user' as const,
            content,
        }),
    }),
}));

vi.mock('../components/contexts/TabContext', () => ({
    useTabName: () => 'T2V',
}));

vi.mock('../components/history/db', () => ({
    db: {
        chatLogs: {
            where: () => ({
                delete: () => Promise.resolve(),
                first: () => Promise.resolve(null),
            }),
            put: () => Promise.resolve(),
        },
    },
}));

const Harness = ({
    initialMessages = [],
}: {
    initialMessages?: OpenAIMessage[];
}) => {
    const chat = useOpenAIChat({ initialMessages });
    return (
        <div>
            <div data-testid="isComplete">{String(chat.isComplete)}</div>
            <div data-testid="isGenerating">{String(chat.isGenerating)}</div>
            <div data-testid="isConnecting">{String(chat.isConnecting)}</div>
            <div data-testid="isThinking">{String(chat.isThinking)}</div>
            <div data-testid="msgCount">{chat.messages.length}</div>
            <button
                data-testid="send"
                onClick={() => chat.sendMessage('hello world')}
            >
                send
            </button>
            <button data-testid="abort" onClick={() => chat.abort()}>
                abort
            </button>
            <button data-testid="reset" onClick={() => chat.reset()}>
                reset
            </button>
        </div>
    );
};

describe('useOpenAIChat state machine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initial state: not generating, not connecting, not complete', () => {
        render(<Harness />);
        expect(screen.getByTestId('isGenerating')).toHaveTextContent('false');
        expect(screen.getByTestId('isConnecting')).toHaveTextContent('false');
        expect(screen.getByTestId('isComplete')).toHaveTextContent('false');
    });

    it('initial messages are present', () => {
        render(
            <Harness
                initialMessages={[
                    { role: 'system', content: 'You are helpful.' },
                ]}
            />,
        );
        expect(screen.getByTestId('msgCount')).toHaveTextContent('1');
    });

    it('sendMessage sets isConnecting and isGenerating to true, completes on success', async () => {
        const fetchMock = vi.fn(() =>
            Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        choices: [{ message: { content: 'Hi there!' } }],
                    }),
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        render(<Harness />);
        screen.getByTestId('send').click();

        await waitFor(() => {
            expect(screen.getByTestId('isComplete')).toHaveTextContent('true');
        });
        expect(screen.getByTestId('msgCount')).toHaveTextContent('2');
        expect(screen.getByTestId('isGenerating')).toHaveTextContent('false');
        expect(fetchMock).toHaveBeenCalled();
    });

    it('sets error state when fetch fails', async () => {
        const fetchMock = vi.fn(() =>
            Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: () => Promise.resolve({}),
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        render(<Harness />);
        screen.getByTestId('send').click();

        await waitFor(() => {
            expect(screen.getByTestId('isGenerating')).toHaveTextContent(
                'false',
            );
        });
        expect(screen.getByTestId('isComplete')).toHaveTextContent('false');
    });
});
