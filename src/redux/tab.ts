import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { setWith, unset } from 'lodash';

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
    prompt: {
        [id: string]: {
            tab_name: string;
        };
    };
    params: paramsType;
    result: resultType;
};

const slice = createSlice({
    name: 'tab',
    initialState: {
        current_tab: false,
        api: {} as any,
        prompt: {},
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
        setPrompt: (
            s,
            action: PayloadAction<{ prompt_id: string; tab_name: string }>
        ) => {
            setWith(
                s,
                ['prompt', action.payload.prompt_id],
                { tab_name: action.payload.tab_name },
                Object
            );
        },
        clearPrompt: (s) => ({ ...s, prompt: {} }),
        setParams: (s, action: PayloadAction<paramsType>) => ({
            ...s,
            params: action.payload,
        }),
        /**
         * Either action.prompt_id (for WS receiver which works outside of tabs) or action.tab_name (inside tabs) should be specified
         * @param action.prompt_id UUID of the prompt returned, the result tab is then picked from the s.prompt branch
         * @param action.tab_name explicitly specify the result tab
         */
        addResult: (
            s,
            action: PayloadAction<{
                prompt_id?: string;
                tab_name?: string;
                node_id: string;
                output: any;
            }>
        ) => {
            if (!action.payload.tab_name && !action.payload.prompt_id) {
                console.error(
                    'addResult action should provide either tab_name or prompt_id to have any effect! Discarding result.'
                );
                return s;
            }
            const tab_name =
                action.payload.tab_name ||
                s.prompt[action.payload.prompt_id!].tab_name;
            if (!tab_name) {
                console.warn(
                    'Prompt origin tab is not defined, discarding result'
                );
                return s;
            }
            setWith(
                s,
                ['result', tab_name, action.payload.node_id],
                action.payload.output,
                Object
            );
        },
        delResult: (
            s,
            action: PayloadAction<{ tab_name: string; id: string }>
        ) => {
            unset(s, ['result', action.payload.tab_name, action.payload.id]);
        },
    },
});

export const {
    reducer: tab,
    actions: {
        setApi,
        setTab,
        setPrompt,
        clearPrompt,
        setParams,
        addResult,
        delResult,
    },
} = slice;
