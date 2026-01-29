import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isArray, mergeWith } from 'lodash';
import { mergeType } from '../api/mergeType';

export type controlType = {
    id: string;
    field: string;
    [key: string]: any;
};

export type tabConfigType = {
    api: string;
    controls: {
        [control: string]: controlType;
    };
    result: {
        id: string;
        type: string;
    };
    defaults?: Record<string, any>;
    handler_options: {
        lora_params: {
            lora_input_name: string;
            clip_input_name?: string;
            api_input_name: string;
            output_idx?: number;
            output_node_ids: string[];
            output_clip_ids?: string[];
            class_name: string;
            strength_field_name: string;
            clip_strength_field_name?: string;
            name_field_name: string;
            additional_inputs: { [key: string]: string };
        };
        node_params: {
            sampler_id: string;
            text_encode_id: string;
            loader_id: string;
        };
    };
};

export type modelType = {
    name: string;
    path: string;
};

export type loraDefaults = {
    [path: string]: {
        strength?: number;
        merge?: mergeType;
    };
};

export type llmConfigType = {
    apiKey: string;
    baseURL: string;
    model: string;
    modelVision?: string;
};

export type configType = {
    tabs: {
        [tabName: string]: tabConfigType;
    };
    object_info: {
        [obj: string]: {
            category: string;
            description: string;
            display_name: string;
            input: {
                optional: {
                    [key: string]: any[];
                };
                required: {
                    [key: string]: any[];
                };
            };
            input_order: {
                optional: string[];
                required: string[];
            };
            name?: string;
            output: string[];
            output_is_list: boolean[];
            output_name: string[];
            output_node: boolean;
            python_module: string;
        };
    };
    models: {
        [name: string]: modelType[];
    };
    loras: {
        [name: string]: {
            filter: string;
            defaults: loraDefaults;
        };
    };
    api: string;
    llm?: llmConfigType;
    client_id: string;
    loaded: boolean[];
    preview_root: string;
};

const slice = createSlice({
    name: 'config',
    initialState: {
        client_id: [...Array(32)]
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(''),
        models: {},
        loras: {},
        loaded: [false, false],
    } as configType,
    reducers: {
        setConfig: (s: configType, action: PayloadAction<configType>) => ({
            ...s,
            ...action.payload,
        }),
        setLoaded: (s: configType, action: PayloadAction<number>) => {
            s.loaded[action.payload] = true;
        },
        mergeConfig: (
            s: configType,
            action: PayloadAction<{
                config: Partial<configType>;
                concatArrays: boolean;
            }>
        ) =>
            mergeWith({}, s, action.payload.config, (objValue, srcValue) => {
                if (isArray(objValue)) {
                    if (action.payload.concatArrays) {
                        return objValue.concat(srcValue);
                    } else {
                        return srcValue;
                    }
                }
            }),
    },
});

export const {
    reducer: config,
    actions: { setConfig, setLoaded, mergeConfig },
} = slice;
