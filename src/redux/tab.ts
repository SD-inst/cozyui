import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type tabType = {
    current_tab: boolean | string;
    api: any;
    prompt_id: string;
};

const slice = createSlice({
    name: 'tab',
    initialState: {
        current_tab: false,
        api: {} as any,
        prompt_id: '',
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
        setPromptId: (s, action: PayloadAction<string>) => ({
            ...s,
            prompt_id: action.payload,
        }),
    },
});

export const {
    reducer: tab,
    actions: { setApi, setTab, setPromptId },
} = slice;
