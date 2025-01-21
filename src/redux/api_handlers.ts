import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { set } from 'lodash';

export type handlerType = {
    [control_name: string]: (api: any, value: any[]) => void;
};

export type tabHandlers = {
    [tab_name: string]: handlerType;
};

const slice = createSlice({
    name: 'handlers',
    initialState: {} as tabHandlers,
    reducers: {
        setHandler: (
            s,
            action: PayloadAction<{
                tab_name: string;
                control_name: string;
                handler: (api: any, value: any[]) => void;
            }>
        ) =>
            set(
                s,
                `["${action.payload.tab_name}"]["${action.payload.control_name}"]`,
                action.payload.handler
            ),
    },
});

export const {
    reducer: handlers,
    actions: { setHandler },
} = slice;
