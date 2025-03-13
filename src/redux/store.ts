import { configureStore } from '@reduxjs/toolkit';
import { config } from './config';
import { progress } from './progress';
import { tab } from './tab';
import { preview } from './preview';

export const store = configureStore({
    reducer: {
        progress,
        config,
        tab,
        preview
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
