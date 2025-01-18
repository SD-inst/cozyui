import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type configType = {
    tabs: {
        [tabName: string]: {
            workflow: string;
            api: string;
            controls: {
                [control: string]: {
                    id: string;
                    field: string;
                };
            };
            result: {
                id: string;
                type: string;
            };
        };
    };
    api: string;
    client_id: string;
};

const slice = createSlice({
    name: 'config',
    initialState: {
        client_id: [...Array(32)]
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
    } as configType,
    reducers: {
        setConfig: (s, action: PayloadAction<configType>) => ({
            ...s,
            ...action.payload,
        }),
    },
});

export const {
    reducer: config,
    actions: { setConfig },
} = slice;
