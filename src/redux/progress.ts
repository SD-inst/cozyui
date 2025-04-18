import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export enum statusEnum {
    WAITING = 'Waiting...',
    RUNNING = 'Running',
    FINISHED = 'Finished',
    ERROR = 'Error',
    INTERRUPTED = 'Interrupted',
    CANCELLED = 'Cancelled',
}

const progressSlice = createSlice({
    name: 'progress',
    initialState: {
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
    },
    reducers: {
        setMin: (s, action: PayloadAction<number>) => ({
            ...s,
            min: action.payload,
        }),
        setProgress: (
            s,
            action: PayloadAction<{ max: number; value: number }>
        ) => ({
            ...s,
            ...action.payload,
        }),
        setQueue: (s, action: PayloadAction<number>) => ({
            ...s,
            queue: action.payload,
        }),
        setCurrentNode: (s, action: PayloadAction<string>) => ({
            ...s,
            current_node: action.payload,
        }),
        setStatus: (s, action: PayloadAction<statusEnum>) => {
            if (
                action.payload === statusEnum.INTERRUPTED &&
                s.status !== statusEnum.CANCELLED
            ) {
                // Only show interrupted status if it's currently cancelled, otherwise ignore. if execution was interrupted but user started another generation, don't change the status as it would cause a race condition and bad GB/IB behavior.
                return s;
            }
            return {
                ...s,
                status: action.payload,
            };
        },
        setStatusMessage: (
            s,
            action: PayloadAction<{ status: statusEnum; message: string }>
        ) => ({
            ...s,
            status: action.payload.status,
            status_message: action.payload.message,
        }),
        clearGenerationTS: (s) => ({
            ...s,
            start_ts: 0,
            end_ts: 0,
        }),
        setGenerationStart: (s) => ({
            ...s,
            start_ts: new Date().getTime(),
            end_ts: 0,
        }),
        setGenerationEnd: (s) => ({
            ...s,
            end_ts: new Date().getTime(),
        }),
        setConnected: (s, action: PayloadAction<boolean>) => ({
            ...s,
            connected: action.payload,
        }),
    },
});

export const {
    reducer: progress,
    actions: {
        setMin: setMinProgress,
        setProgress,
        setCurrentNode,
        setQueue,
        setStatus,
        setStatusMessage,
        clearGenerationTS,
        setGenerationStart,
        setGenerationEnd,
        setConnected,
    },
} = progressSlice;
