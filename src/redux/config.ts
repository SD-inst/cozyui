import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { isArray, mergeWith } from 'lodash';

export type tabConfigType = {
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
    defaults?: Record<string, any>;
    handler_options: {
        lora_params: {
            input_node_id?: string;
            lora_input_name: string;
            api_input_name: string;
            output_idx?: number;
            output_node_ids: string[];
            class_name: string;
            strength_field_name: string;
            name_field_name: string;
        };
        node_params: {
            sampler_id: string;
            text_encode_id: string;
            loader_id: string;
        };
    };
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
        [name: string]: {
            name: string;
            path: string;
            quantization?: string;
        }[];
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
        models: {},
    } as configType,
    reducers: {
        setConfig: (s: any, action: PayloadAction<configType>) => ({
            ...s,
            ...action.payload,
        }),
        mergeConfig: (
            s: any,
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
    actions: { setConfig, mergeConfig },
} = slice;
