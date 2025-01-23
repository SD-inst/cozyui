import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const progressSlice = createSlice({
    name: 'progress',
    initialState: {
        min: 0,
        max: 0,
        value: -1,
        current_node: '',
        queue: 0,
        status: '',
        generation_disabled: true,
        start_ts: 0,
        end_ts: 0,
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
        setStatus: (s, action: PayloadAction<string>) => ({
            ...s,
            status: action.payload,
        }),
        setGenerationDisabled: (s, action: PayloadAction<boolean>) => ({
            ...s,
            generation_disabled: action.payload,
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
        setGenerationDisabled,
        clearGenerationTS,
        setGenerationStart,
        setGenerationEnd,
    },
} = progressSlice;
