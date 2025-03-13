import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const slice = createSlice({
    name: 'preview',
    initialState: {
        frames: [] as ImageBitmap[],
        rate: 0,
    },
    reducers: {
        setFrame: (
            s,
            action: PayloadAction<{ idx: number; image: ImageBitmap }>
        ) => {
            s.frames[action.payload.idx] = action.payload.image;
        },
        initPreview: (
            s,
            action: PayloadAction<{ length: number; rate: number }>
        ) => {
            s.frames = [];
            s.frames.length = action.payload.length;
            s.rate = action.payload.rate;
        },
    },
});

export const {
    reducer: preview,
    actions: { setFrame, initPreview },
} = slice;
