import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerateButton } from './GenerateButton';
import { TabContext, TabContextValueType } from '../contexts/TabContext';
import { db } from '../history/db';
import { progress } from '../../redux/progress';
import { tab } from '../../redux/tab';
import { config } from '../../redux/config';
import { preview } from '../../redux/preview';
import { I18nContext, defaultValue } from '../../i18n/I18nContext';
import { polyglot } from '../../testUtils';

// Mutable so a test can hand the button a workflow with a file input.
const mockApi = vi.hoisted((): { current: Record<string, any> } => ({
    current: {
        '1': { inputs: { prompt: '', steps: 0 }, class_type: 'Sampler' },
    },
}));

vi.mock('../../hooks/useGet', () => ({
    useGet: () => ({ data: mockApi.current, isSuccess: true }),
}));

vi.mock('../../hooks/settings', () => ({
    settings: { enable_previews: 'enable_previews' },
}));

vi.mock('../../hooks/useSetting', () => ({
    useBooleanSetting: () => false,
}));

vi.mock('../../hooks/useApiURL', () => ({
    useApiURL: () => 'http://localhost:8188',
}));

vi.mock('../../hooks/useElementVisibility', () => ({
    useElementVisibility: () => ({ visible: true, ref: null }),
}));

vi.mock('../../hooks/useIsPhone', () => ({
    useIsPhone: () => false,
}));

const makeStore = (
    overrides: any = {},
    extraControls: Record<string, any> = {},
) =>
    configureStore({
        reducer: { progress, config, tab, preview },
        preloadedState: {
            config: {
                client_id: 'test',
                api: 'http://localhost:8188',
                tabs: {
                    T2V: {
                        api: 'api/t2v.json',
                        controls: {
                            prompt: { id: '1', field: 'prompt', order: 0 },
                            steps: { id: '1', field: 'steps', order: 1 },
                            ...extraControls,
                        },
                        result: { id: '16', type: 'images' },
                    },
                },
                object_info: {},
                loaded: [true, true] as [boolean, boolean],
            },
            progress: {
                min: 0,
                max: 0,
                value: -1,
                current_node: '',
                queue: 0,
                status: 'IDLE',
                status_message: '',
                start_ts: 0,
                end_ts: 0,
                connected: true,
                node_events: [] as any[],
                ...overrides,
            },
            tab: {
                current_tab: 'T2V',
                api: {},
                prompt: {},
                params: { tab: '', values: {} },
                result: {},
            },
            preview: { frames: [], length: 0, rate: 0 },
        } as any,
        middleware: (gdm: any) => gdm({ serializableCheck: false }),
    } as any);

const renderButton = (
    values: Record<string, any>,
    storeOverrides: any = {},
    requiredControls?: string | readonly string[],
    extraControls?: Record<string, any>,
) => {
    const store = makeStore(storeOverrides, extraControls);

    const Inner = () => {
        const form = useForm({ defaultValues: values });
        const ctx: TabContextValueType = {
            tab_name: 'T2V',
            api: 'T2V',
            handlers: {},
            setValue: () => {},
            handleCtrlEnter: () => {},
        };
        return (
            <TabContext.Provider value={ctx}>
                <FormProvider {...form}>
                    <GenerateButton requiredControls={requiredControls} />
                </FormProvider>
            </TabContext.Provider>
        );
    };

    return render(
        <Provider store={store}>
            <I18nContext.Provider
                value={{ ...defaultValue, polyglot, locale: 'en' }}
            >
                <Inner />
            </I18nContext.Provider>
        </Provider>,
    );
};

describe('GenerateButton pipeline', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        await db.uploads.clear();
        mockApi.current = {
            '1': { inputs: { prompt: '', steps: 0 }, class_type: 'Sampler' },
        };
        mockFetch = vi.fn(() =>
            Promise.resolve({
                status: 200,
                json: () => Promise.resolve({ prompt_id: 'test-prompt-id' }),
            }),
        );
        vi.stubGlobal('fetch', mockFetch);
    });

    it('is disabled when not connected', () => {
        renderButton(
            { prompt: 'hi', steps: 10 },
            { connected: false },
        );
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).toBeDisabled();
    });

    it('is disabled while a generation is RUNNING', () => {
        renderButton(
            { prompt: 'hi', steps: 10 },
            { status: 'Running' },
        );
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).toBeDisabled();
    });

    it('is enabled when connected and IDLE', () => {
        renderButton({ prompt: 'hi', steps: 10 });
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).not.toBeDisabled();
    });

    it('is disabled when a required array control is empty', () => {
        renderButton({ prompt: '', steps: 5 }, {}, ['prompt']);
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).toBeDisabled();
    });

    it('is enabled when a required array control has a value', () => {
        renderButton({ prompt: 'hi', steps: 5 }, {}, ['prompt']);
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).not.toBeDisabled();
    });

    it('is disabled when a required string control is empty', () => {
        renderButton({ prompt: '', steps: 5 }, {}, 'prompt');
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).toBeDisabled();
    });

    it('is enabled when a required string control has a value', () => {
        renderButton({ prompt: 'hi', steps: 5 }, {}, 'prompt');
        const btn = screen.getByRole('button', { name: 'Generate' });
        expect(btn).not.toBeDisabled();
    });

    it('sends the prompt via fetch when clicked', async () => {
        renderButton({ prompt: 'hello', steps: 5 });
        const btn = screen.getByRole('button', { name: 'Generate' });
        fireEvent.click(btn);

        await waitFor(() => {
            // The button calls /api/queue first (warm-up), then /api/prompt
            expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
        });

        const promptCall = mockFetch.mock.calls.find((c: any) =>
            c[0].includes('/api/prompt'),
        );
        expect(promptCall).toBeDefined();
        const body = JSON.parse(promptCall![1].body);
        expect(body.prompt['1'].inputs.prompt).toBe('hello');
        expect(body.prompt['1'].inputs.steps).toBe(5);
    });

    it('re-uploads a file the server lost and sends the new name', async () => {
        await db.uploads.put({
            id: '1700000001000_gone.png',
            filename: '1700000001000_gone.png',
            file: new File(['bytes'], 'cat.png'),
            lastUsedAt: 1,
        });
        mockApi.current = {
            '1': {
                inputs: { prompt: '', steps: 0, image: '' },
                class_type: 'Sampler',
            },
        };
        mockFetch.mockImplementation((url: string, init?: { method?: string }) => {
            if (init?.method === 'HEAD') {
                return Promise.resolve({ ok: false, status: 404 });
            }
            if (url.includes('/api/upload/image')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: () =>
                        Promise.resolve({ name: '1700000002000_uploaded.png' }),
                });
            }
            return Promise.resolve({
                status: 200,
                json: () => Promise.resolve({ prompt_id: 'test-prompt-id' }),
            });
        });

        renderButton(
            { prompt: 'hello', steps: 5, image: '1700000001000_gone.png' },
            {},
            undefined,
            { image: { id: '1', field: 'image' } },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

        await waitFor(() => {
            const promptCall = mockFetch.mock.calls.find((c: any) =>
                c[0].includes('/api/prompt'),
            );
            expect(promptCall).toBeDefined();
            const body = JSON.parse(promptCall![1].body);
            // The workflow carries the restored name, not the stale one.
            expect(body.prompt['1'].inputs.image).toBe(
                '1700000002000_uploaded.png',
            );
        });
    });
});
