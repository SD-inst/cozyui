import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { merge, unset } from 'lodash';

export enum actionEnum {
    STORE,
    RESTORE,
}

type paramsType = {
    tab?: string;
    values?: any;
    action?: actionEnum;
};

type resultType = {
    [tab: string]: {
        [node_id: string]: {
            [type: string]: any;
        };
    };
};

type tabType = {
    current_tab: boolean | string;
    api: any;
    prompt_id: string;
    prompt_origin_tab: string;
    params: paramsType;
    result: resultType;
};

const slice = createSlice({
    name: 'tab',
    initialState: {
        current_tab: false,
        api: {} as any,
        prompt_id: '',
        prompt_origin_tab: '',
        params: {
            tab: '',
            values: {},
        },
        result: {},
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
        setOriginTab: (s, action: PayloadAction<string>) => ({
            ...s,
            prompt_origin_tab: action.payload,
        }),
        setParams: (s, action: PayloadAction<paramsType>) => ({
            ...s,
            params: action.payload,
        }),
        addResult: (
            s,
            action: PayloadAction<{ node_id: string; output: any }>
        ) => {
            if (!s.prompt_origin_tab) {
                console.log(
                    'Prompt origin tab is not defined, discarding result'
                );
                return s;
            }
            return merge({}, s, {
                result: {
                    [s.prompt_origin_tab]: {
                        [action.payload.node_id]: action.payload.output,
                    },
                },
            });
        },
        delResult: (
            s,
            action: PayloadAction<{ tab_name: string; node_id: string }>
        ) => {
            unset(s, [
                'result',
                action.payload.tab_name,
                action.payload.node_id,
            ]);
        },
    },
});

export const {
    reducer: tab,
    actions: {
        setApi,
        setTab,
        setPromptId,
        setOriginTab,
        setParams,
        addResult,
        delResult,
    },
} = slice;
