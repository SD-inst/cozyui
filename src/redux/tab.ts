import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type tabType = {
    current_tab: boolean | string;
    api: any;
    workflow: any;
};

const slice = createSlice({
    name: 'tab',
    initialState: {
        current_tab: false,
        api: {} as any,
        workflow: {} as any,
    } as tabType,
    reducers: {
        setTab: (s, action: PayloadAction<string | boolean>) => ({
            ...s,
            current_tab: action.payload,
        }),
        setApi: (s, action: PayloadAction<any>) => ({
            ...s,
            api: action.payload,
        }),
        setWorkflow: (s, action: PayloadAction<any>) => ({
            ...s,
            workflow: action.payload,
        }),
    },
});

export const {
    reducer: tab,
    actions: { setApi, setTab, setWorkflow },
} = slice;
