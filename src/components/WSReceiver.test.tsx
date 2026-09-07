import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { WSReceiver } from './WSReceiver';
import { progress } from '../redux/progress';
import { tab } from '../redux/tab';
import { config } from '../redux/config';
import { preview } from '../redux/preview';
import { I18nContext, defaultValue } from '../i18n/I18nContext';
import Polyglot from 'node-polyglot';
import { setStatus, statusEnum } from '../redux/progress';
import { setPrompt } from '../redux/tab';

let mockWS: {
    onmessage: ((ev: any) => void) | null;
    onopen: ((ev: any) => void) | null;
    onclose: (() => void) | null;
    close: () => void;
};

const MockWebSocket = class {
    onmessage: ((ev: any) => void) | null = null;
    onopen: ((ev: any) => void) | null = null;
    onclose: (() => void) | null = null;
    binaryType = '';
    close = () => {};
    constructor(_url: string) {
        void _url;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockWS = this;
    }
};

const sendJson = (type: string, data: any) => {
    mockWS.onmessage?.({ data: JSON.stringify({ type, data }) });
};

const makeStore = (overrides: any = {}) =>
    configureStore({
        reducer: { progress, config, tab, preview },
        preloadedState: {
            config: {
                client_id: 'test-client',
                api: 'http://localhost:8188',
                tabs: {},
                object_info: {},
                loaded: [true, true] as [boolean, boolean],
            },
            progress: {
                min: 0,
                max: 0,
                value: -1,
                current_node: '',
                queue: 0,
                status: '',
                status_message: '',
                start_ts: 0,
                end_ts: 0,
                connected: false,
                node_events: [] as any[],
                ...overrides,
            },
            tab: {
                current_tab: '',
                api: {},
                prompt: {},
                params: { tab: '', values: {} },
                result: {},
            },
            preview: { frames: [], length: 0, rate: 0 },
        } as any,
        middleware: (gdm: any) => gdm({ serializableCheck: false }),
    } as any);

const renderReceiver = (store: ReturnType<typeof makeStore>) => {
    const polyglot = new Polyglot({ locale: 'en' });
    return render(
        <Provider store={store}>
            <I18nContext.Provider
                value={{ ...defaultValue, polyglot, locale: 'en' }}
            >
                <WSReceiver />
            </I18nContext.Provider>
        </Provider>,
    );
};

describe('WSReceiver message dispatch', () => {
    let store: ReturnType<typeof makeStore>;

    vi.stubGlobal('WebSocket', MockWebSocket);

    const setup = () => {
        store = makeStore();
        renderReceiver(store);
        mockWS.onopen?.({});
        return store;
    };

    it('sets status to RUNNING and clears node events on execution_start', () => {
        setup();
        sendJson('execution_start', {});
        const s = store.getState();
        expect(s.progress.status).toBe(statusEnum.RUNNING);
        expect(s.progress.node_events).toEqual([]);
    });

    it('sets status to FINISHED on execution_success and resets progress', () => {
        setup();
        store.dispatch(setStatus(statusEnum.RUNNING));
        sendJson('execution_success', {});
        const s = store.getState();
        expect(s.progress.status).toBe(statusEnum.FINISHED);
        expect(s.progress.value).toBe(-1);
    });

    it('adds executing node events with timestamps', () => {
        setup();
        store.dispatch(setStatus(statusEnum.RUNNING));
        sendJson('executing', { node: '105:14' });
        const s = store.getState();
        expect(s.progress.node_events.length).toBe(1);
        expect(s.progress.node_events[0].node).toBe('105:14');
        expect(s.progress.node_events[0].type).toBe('executing');
    });

    it('adds executed events and dispatches addResult', () => {
        setup();
        store.dispatch(setStatus(statusEnum.RUNNING));
        store.dispatch(setPrompt({ prompt_id: 'p1', tab_name: 'T2V' }));
        sendJson('executed', {
            node: '16',
            prompt_id: 'p1',
            output: { images: ['out.png'] },
        });
        const s = store.getState();
        expect(s.progress.node_events.length).toBe(1);
        expect(s.progress.node_events[0].type).toBe('executed');
        expect(s.tab.result.T2V['16']).toEqual({ images: ['out.png'] });
    });

    it('sets queue on status message', () => {
        setup();
        sendJson('status', { status: { exec_info: { queue_remaining: 5 } } });
        expect(store.getState().progress.queue).toBe(5);
    });

    it('sets ERROR status and message on execution_error', () => {
        setup();
        store.dispatch(setStatus(statusEnum.RUNNING));
        sendJson('execution_error', { exception_message: 'Something broke' });
        const s = store.getState();
        expect(s.progress.status).toBe(statusEnum.ERROR);
        expect(s.progress.status_message).toBe('Something broke');
    });

    it('sets INTERRUPTED status on execution_interrupted', () => {
        setup();
        store.dispatch(setStatus(statusEnum.RUNNING));
        sendJson('execution_interrupted', {});
        expect(store.getState().progress.status).toBe(statusEnum.INTERRUPTED);
    });
});
