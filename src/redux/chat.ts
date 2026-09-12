import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Per-tab signal telling `useOpenAIChat` to re-read its `db.chatLogs` record.
// The DB record is the single source of truth: resetting a tab's chat deletes
// the record, restoring a session writes it back — in both cases the hook just
// re-reads and follows. Bumping the nonce is the only thing the hook reacts to.
const slice = createSlice({
    name: 'chat',
    initialState: {
        nonce: {} as Record<string, number>,
    },
    reducers: {
        reloadChat: (s, action: PayloadAction<string>) => {
            const tab = action.payload;
            s.nonce[tab] = (s.nonce[tab] ?? 0) + 1;
        },
    },
});

export const {
    reducer: chat,
    actions: { reloadChat },
} = slice;
