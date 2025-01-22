import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type resultType = {
    [node_id: string]: {
        [type: string]: any;
    };
};

const slice = createSlice({
    name: 'result',
    initialState: {} as resultType,
    reducers: {
        addResult: (
            s,
            action: PayloadAction<{ node_id: string; output: any }>
        ) => ({ ...s, [action.payload.node_id]: action.payload.output }),
        delResult: (s, action: PayloadAction<{ node_id: string }>) => {
            delete s[action.payload.node_id];
        },
    },
});

export const {
    reducer: result,
    actions: { addResult, delResult },
} = slice;
