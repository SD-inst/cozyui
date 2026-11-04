import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { setWith, unset } from 'lodash-es';
import { Workflow } from '../api/graph';

export enum actionEnum {
    STORE,
    RESTORE,
    RESTORE_HISTORY,
    APPLY_PRESET,
    RESTORE_SESSION,
}

type paramsType = {
    tab?: string;
    values?: any;
    action?: actionEnum;
    presetId?: string;
    sessionId?: string;
    deleteAfter?: boolean;
};

type resultType = {
    [tab: string]: {
        [node_id: string]: {
            [type: string]: any;
        };
    };
};

type tabType = {
    current_tab: string;
    api: Workflow;
    prompt: {
        [id: string]: {
            tab_name: string;
        };
    };
    params: paramsType;
    result: resultType;
    /**
     * Which generation each stored result came from. `run` is the prompt_id of
     * the newest generation of a tab, `result_run` records the generation that
     * produced each node's result, so `pruneResults` can drop what this
     * generation did not produce while leaving the results it did alone.
     */
    run: { [tab: string]: string };
    result_run: {
        [tab: string]: { [node_id: string]: string };
    };
};

const slice = createSlice({
    name: 'tab',
    initialState: {
        current_tab: '',
        api: {},
        prompt: {},
        params: {
            tab: '',
            values: {},
        },
        result: {},
        run: {},
        result_run: {},
    } as tabType,
    reducers: {
        setTab: (s, action: PayloadAction<string>) => ({
            ...s,
            current_tab: action.payload,
        }),
        setApi: (s, action: PayloadAction<Workflow>) => ({
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
            // this prompt is the current generation of its tab: results tagged
            // with an older one are dropped once it finishes
            setWith(
                s,
                ['run', action.payload.tab_name],
                action.payload.prompt_id,
                Object
            );
            const temp_result = s.result[action.payload.prompt_id];
            if (temp_result) {
                // found temporary result, must be a race condition when
                // /api/prompt returned *after* the results arrived via
                // the websocket; move the result and its run tags with it
                setWith(
                    s,
                    ['result', action.payload.tab_name],
                    temp_result,
                    Object
                );
                const temp_run = s.result_run[action.payload.prompt_id];
                if (temp_run) {
                    setWith(
                        s,
                        ['result_run', action.payload.tab_name],
                        {
                            ...(s.result_run[action.payload.tab_name] || {}),
                            ...temp_run,
                        },
                        Object
                    );
                    unset(s, ['result_run', action.payload.prompt_id]);
                }
                unset(s, ['result', action.payload.prompt_id]);
                console.warn(
                    `Found temporary prompt results for ${action.payload.prompt_id}, moving to tab ${action.payload.tab_name}`
                );
                return;
            }
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
            const output = { ...action.payload.output };
            // Native SaveVideo outputs `images` + `animated: [true]` instead of `gifs`.
            // Normalize so the existing result lookup (type: "gifs") works.
            if (output.images && output.animated?.[0]) {
                output.gifs = output.images;
            }
            const tab_name =
                action.payload.tab_name ||
                s.prompt[action.payload.prompt_id!]?.tab_name;
            if (!tab_name) {
                if (action.payload.prompt_id) {
                    setWith(
                        s,
                        [
                            'result',
                            action.payload.prompt_id,
                            action.payload.node_id,
                        ],
                        output,
                        Object
                    );
                    setWith(
                        s,
                        [
                            'result_run',
                            action.payload.prompt_id,
                            action.payload.node_id,
                        ],
                        action.payload.prompt_id,
                        Object
                    );
                    console.warn(
                        `Prompt origin tab is not defined, storing prompt result under id ${action.payload.prompt_id} for later.`
                    );
                    return;
                }
                console.warn(
                    'Prompt origin tab is not defined, discarding result'
                );
                return s;
            }
            setWith(
                s,
                ['result', tab_name, action.payload.node_id],
                output,
                Object
            );
            // remember which generation produced it, so the ones this
            // generation never reached can be dropped when it finishes
            setWith(
                s,
                ['result_run', tab_name, action.payload.node_id],
                s.run[tab_name] || action.payload.prompt_id || '',
                Object
            );
        },
        delResult: (
            s,
            action: PayloadAction<{ tab_name: string; id: string }>
        ) => {
            unset(s, ['result', action.payload.tab_name, action.payload.id]);
            unset(
                s,
                ['result_run', action.payload.tab_name, action.payload.id],
            );
        },
        /**
         * Drop the results of a tab that the finished generation did not
         * produce. A node that ran has already written its fresh result, so
         * anything still tagged with an older generation is a leftover the
         * current workflow no longer creates — and the panel that would
         * otherwise keep showing it.
         */
        pruneResults: (
            s,
            action: PayloadAction<{ prompt_id?: string; tab_name?: string }>
        ) => {
            const tab_name =
                action.payload.tab_name ||
                s.prompt[action.payload.prompt_id!]?.tab_name;
            const run = tab_name && s.run[tab_name];
            const tags = tab_name && s.result_run[tab_name];
            if (!tab_name || !run || !tags) {
                return;
            }
            for (const node_id of Object.keys(s.result[tab_name] || {})) {
                if (tags[node_id] !== run) {
                    unset(s, ['result', tab_name, node_id]);
                    unset(s, ['result_run', tab_name, node_id]);
                }
            }
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
        pruneResults,
    },
} = slice;
