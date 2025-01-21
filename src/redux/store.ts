import { configureStore } from '@reduxjs/toolkit';
import { config } from './config';
import { progress } from './progress';
import { result } from './result';
import { tab } from './tab';
import { handlers } from './api_handlers';

export const store = configureStore({
    reducer: {
        progress,
        result,
        config,
        tab,
        handlers,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
