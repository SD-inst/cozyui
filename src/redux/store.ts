import { configureStore } from '@reduxjs/toolkit';
import { progress } from './progress';
import { result } from './result';
import { config } from './config';
import { tab } from './tab';

export type CUIState = {
    execution_state: {};
};

export const store = configureStore({
    reducer: {
        progress,
        result,
        config,
        tab,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
