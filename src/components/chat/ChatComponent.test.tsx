import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatComponent } from './ChatComponent';

const sendMessage = vi.fn();

// The chat hook owns the network and the per-tab IndexedDB log; what is under
// test here is only the wiring of the input field.
vi.mock('../../hooks/useOpenAIChat', () => ({
    useOpenAIChat: () => ({
        messages: [],
        error: null,
        sendMessage,
        reset: () => {},
        resetTo: () => {},
        abort: () => {},
        isComplete: false,
        isGenerating: false,
        isThinking: false,
        isConnecting: false,
    }),
}));

vi.mock('../../hooks/useLLMConfig', () => ({
    useLLMConfig: () => ({
        baseURL: 'https://llm.test/v1',
        apiKey: 'sk-test',
        model: 'test-model',
    }),
}));

vi.mock('../../hooks/useApiURL', () => ({
    useApiURL: () => 'http://comfy.test',
}));

// The chat reads the tab form through useFormContext.
const Harness = () => {
    const form = useForm({ defaultValues: { prompt: '' } });
    return (
        <FormProvider {...form}>
            <ChatComponent promptFieldName='prompt' />
        </FormProvider>
    );
};

// MUI mounts the accordion body only once it is open, so the field only exists
// after the header is clicked.
const openChat = (): HTMLTextAreaElement => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Chat'));
    return screen.getByRole('textbox') as HTMLTextAreaElement;
};

// A throw inside a React event handler never reaches `fireEvent` — React
// rethrows it as an uncaught window error, which is how the user's page went
// down. Capturing it is what makes the test fail on the throw itself.
const captureWindowErrors = () => {
    const messages: string[] = [];
    const listener = (e: ErrorEvent) => messages.push(e.message);
    window.addEventListener('error', listener);
    return () => {
        window.removeEventListener('error', listener);
        return messages;
    };
};

describe('ChatComponent input keys', () => {
    beforeEach(() => {
        sendMessage.mockReset();
    });

    it('sends on Enter and clears the field', async () => {
        const area = openChat();
        fireEvent.change(area, { target: { value: '  a cat  ' } });

        // Enter must be cancelled: left to the browser it would also append a
        // line break to the field the send has just emptied.
        expect(fireEvent.keyDown(area, { key: 'Enter' })).toBe(false);

        await waitFor(() =>
            expect(sendMessage).toHaveBeenCalledWith(
                'a cat',
                undefined,
                undefined,
            ),
        );
        expect(area.value).toBe('');
    });

    it('leaves the Shift+Enter line break to the browser', () => {
        const area = openChat();
        fireEvent.change(area, { target: { value: 'one two' } });
        area.setSelectionRange(3, 3);
        const uncaught = captureWindowErrors();

        // The break is the browser's own doing in a <textarea>, so the handler
        // must neither send nor cancel the key. It used to rebuild the value by
        // hand off `e.currentTarget`, which MUI points at the wrapper <div>:
        // reading its missing `value` threw on every Shift+Enter, and the
        // uncaught throw took the whole page down.
        expect(fireEvent.keyDown(area, { key: 'Enter', shiftKey: true })).toBe(
            true,
        );
        expect(uncaught()).toEqual([]);
        expect(sendMessage).not.toHaveBeenCalled();
        expect(area.value).toBe('one two');
    });

    it('does not send on Ctrl+Enter', () => {
        const area = openChat();
        fireEvent.change(area, { target: { value: 'a cat' } });

        expect(
            fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true }),
        ).toBe(true);
        expect(sendMessage).not.toHaveBeenCalled();
    });
});
