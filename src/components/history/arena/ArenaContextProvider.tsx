import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { db, markEnum, TaskResult } from '../db';
import {
    addParticipants,
    ArenaState,
    newArena,
    rosterTaskResultIds,
    recordVote,
    standings,
} from '../../../utils/arena';
import { useTranslate } from '../../../i18n/I18nContext';
import {
    ArenaContext,
    ArenaContextType,
    Entry,
    Working,
} from './ArenaContext';

const parseArena = (rec: TaskResult): ArenaState | null => {
    if (!rec.arena) return null;
    try {
        return JSON.parse(rec.arena) as ArenaState;
    } catch {
        return null;
    }
};

const topUrl = (state: ArenaState) => standings(state)[0]?.url ?? '';

// A history record's assets: a batch can hold several (url/data arrays).
const urlsOf = (rec: TaskResult): string[] =>
    Array.isArray(rec.url) ? rec.url : rec.url ? [rec.url] : [];

const assetLabel = (url: string, fallback: string): string => {
    try {
        const u = new URL(url, 'http://localhost');
        const fn = u.searchParams.get('filename');
        if (fn) return fn;
        const last = u.pathname.split('/').filter(Boolean).pop();
        return last || fallback;
    } catch {
        return fallback;
    }
};

// The arena being edited: the most recent saved arena with status
// building/active, or null.
const findWorking = (list: Entry[]): Working => {
    const w = list.find(
        (e) => e.state.status === 'building' || e.state.status === 'active',
    );
    return w ?? null;
};

const persist = (rec: TaskResult, state: ArenaState) =>
    db.taskResults.update(rec.id, {
        arena: JSON.stringify(state),
        url: topUrl(state),
    });

// In-memory participant selection: a source record's urls/labels captured when
// the user picks it, keyed by taskResultId so a re-pick is a no-op. The arena
// record is only written to IndexedDB on "Start arena", so picking participants
// never re-renders the history list or jumps the scroll.
type Draft = Map<number, { urls: string[]; labels: string[] }>;

export const ArenaContextProvider = ({ children }: PropsWithChildren) => {
    const tr = useTranslate();
    const [selectMode, setSelectMode] = useState(false);
    const [openArenaId, setOpenArenaId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft>(new Map());

    const arenas = useLiveQuery(async (): Promise<Entry[]> => {
        const all = await db.taskResults.where('type').equals('elo').toArray();
        const sorted = [...all].sort((a, b) => b.timestamp - a.timestamp);
        return sorted
            .map((rec) => ({ rec, state: parseArena(rec) }))
            .filter((e): e is Entry => !!e.state);
    }, []);

    const arenaList = useMemo(() => arenas ?? [], [arenas]);
    const working = findWorking(arenaList);

    // Checkbox state in the history list. In selection mode it reflects the
    // in-memory draft (a pure staging roster — it never touches existing
    // arenas). Outside it, show the trophy on assets belonging to the
    // in-progress arena.
    const rosterIds = useMemo(() => {
        if (selectMode) return new Set(draft.keys());
        return working ? rosterTaskResultIds(working.state) : new Set<number>();
    }, [selectMode, draft, working]);

    // Current selection size in participants (a batch card counts one per
    // asset). Always from the in-memory draft — the selection is a pure
    // staging roster, never the existing arena's roster. Enables "Start arena"
    // (needs >= 2).
    const participantCount = useMemo(() => {
        let n = 0;
        for (const e of draft.values()) n += e.urls.length;
        return n;
    }, [draft]);

    // Latest arena list, read at action time so memoized actions (stable
    // callbacks) never act on a stale first-render snapshot. The live query
    // below keeps this current, so no second db read is needed per action.
    const arenaListRef = useRef<Entry[]>(arenaList);
    useEffect(() => {
        arenaListRef.current = arenaList;
    }, [arenaList]);
    const draftRef = useRef(draft);
    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);
    // Entering selection mode always starts a FRESH empty draft: the selection
    // is a pure staging roster, independent of any existing arena.
    useEffect(() => {
        if (selectMode) setDraft(new Map());
    }, [selectMode]);

    const loadWorking = (): Working => findWorking(arenaListRef.current);

    // Selection always edits the in-memory draft — it never touches existing
    // arenas. The arena record is created on "Start arena", so selecting never
    // touches IndexedDB (no history-list re-render / scroll jump).
    const toggleParticipant = useCallback((rec: TaskResult) => {
        const urls = urlsOf(rec);
        if (!urls.length) return;
        const labels = urls.map((u, i) => assetLabel(u, `${rec.id}:${i}`));
        setDraft((prev) => {
            const next = new Map(prev);
            if (next.has(rec.id)) next.delete(rec.id);
            else next.set(rec.id, { urls, labels });
            return next;
        });
    }, []);

    const openArena = useCallback((id: number) => {
        // Opening an arena means leaving participant selection: the arena is
        // being viewed/voted on, so selection mode is off. (Covers both the
        // "Start" action and clicking an arena card in history.) Do NOT change
        // the arena's status — the finish/continue toggle is handled explicitly
        // by the dialog buttons.
        setSelectMode(false);
        setOpenArenaId(id);
    }, []);

    const closeArena = useCallback(() => setOpenArenaId(null), []);

    const start = useCallback(async () => {
        if (participantCount < 2) {
            toast(tr('arena.start_min'));
            return;
        }
        // Starting a new arena ends any in-progress one: it's preserved in
        // history as finished (browsable via its card) so only one arena is
        // ever "working" at a time.
        const working = loadWorking();
        if (working) {
            await db.taskResults.update(working.rec.id, {
                arena: JSON.stringify({ ...working.state, status: 'finished' }),
                timestamp: Date.now(),
            });
        }
        // Build the new arena from the in-memory draft.
        let state = newArena();
        for (const [id, entry] of draftRef.current) {
            state = addParticipants(state, id, entry.urls, entry.labels);
        }
        const id = await db.taskResults.add({
            timestamp: Date.now(),
            duration: 0,
            type: 'elo',
            node_id: 'arena',
            tab: 'arena',
            params: '{}',
            url: topUrl(state),
            mark: markEnum.NONE,
            arena: JSON.stringify(state),
        } as TaskResult);
        setDraft(new Map());
        openArena(id);
    }, [participantCount, openArena, tr]);

    const vote = useCallback(
        async (arenaId: number, aKey: string, bKey: string, winner: string) => {
            const rec = await db.taskResults.get(arenaId);
            if (!rec?.arena) return;
            const state = parseArena(rec);
            if (!state) return;
            // The arena re-votes pairs once exhausted, so a previously-played
            // pair is valid again. Racing double-clicks are prevented in the UI
            // (the vote button is disabled while a vote is in flight), not here.
            await persist(rec, recordVote(state, aKey, bKey, winner, Date.now()));
        },
        [],
    );

    const finishArena = useCallback(async (arenaId: number) => {
        const rec = await db.taskResults.get(arenaId);
        if (!rec?.arena) return;
        const state = parseArena(rec);
        if (!state) return;
        await db.taskResults.update(arenaId, {
            arena: JSON.stringify({ ...state, status: 'finished' }),
            timestamp: Date.now(),
        });
    }, []);

    const continueArena = useCallback(async (arenaId: number) => {
        const rec = await db.taskResults.get(arenaId);
        if (!rec?.arena) return;
        const state = parseArena(rec);
        if (!state) return;
        await db.taskResults.update(arenaId, {
            arena: JSON.stringify({ ...state, status: 'active' }),
            timestamp: Date.now(),
        });
    }, []);

    // "Continue voting" in the exhausted (active) view: let the arena keep
    // going past the exhaustion stop (re-vote pairs). Keeps status active.
    const continueVoting = useCallback(async (arenaId: number) => {
        const rec = await db.taskResults.get(arenaId);
        if (!rec?.arena) return;
        const state = parseArena(rec);
        if (!state) return;
        await db.taskResults.update(arenaId, {
            arena: JSON.stringify({
                ...state,
                status: 'active',
                allowRevote: true,
            }),
            timestamp: Date.now(),
        });
    }, []);

    const value: ArenaContextType = {
        arenas: arenaList,
        working,
        rosterIds,
        selectMode,
        openArenaId,
        toggleSelectMode: () => setSelectMode((v) => !v),
        exitSelectMode: () => setSelectMode(false),
        participantCount,
        toggleParticipant,
        start,
        openArena,
        closeArena,
        vote,
        finishArena,
        continueArena,
        continueVoting,
    };

    return (
        <ArenaContext.Provider value={value}>
            {children}
        </ArenaContext.Provider>
    );
};
