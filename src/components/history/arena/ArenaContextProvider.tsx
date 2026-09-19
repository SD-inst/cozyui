import { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { db, markEnum, TaskResult } from '../db';
import {
    addParticipants,
    ArenaState,
    newArena,
    removeParticipants,
    rosterTaskResultIds,
    recordVote,
    standings,
    summarize,
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

export const ArenaContextProvider = ({ children }: PropsWithChildren) => {
    const tr = useTranslate();
    const [selectMode, setSelectMode] = useState(false);
    const [openArenaId, setOpenArenaId] = useState<number | null>(null);

    const arenas = useLiveQuery(async (): Promise<Entry[]> => {
        const all = await db.taskResults.where('type').equals('elo').toArray();
        const sorted = [...all].sort((a, b) => b.timestamp - a.timestamp);
        return sorted
            .map((rec) => ({ rec, state: parseArena(rec) }))
            .filter((e): e is Entry => !!e.state);
    }, []);

    const arenaList = useMemo(() => arenas ?? [], [arenas]);
    const working = findWorking(arenaList);
    const rosterIds = useMemo(
        () => (working ? rosterTaskResultIds(working.state) : new Set<number>()),
        [working],
    );

    // Latest arena list, read at action time so memoized actions (stable
    // callbacks) never act on a stale first-render snapshot. The live query
    // below keeps this current, so no second db read is needed per action.
    const arenaListRef = useRef<Entry[]>(arenaList);
    useEffect(() => {
        arenaListRef.current = arenaList;
    }, [arenaList]);

    const loadWorking = (): Working => findWorking(arenaListRef.current);

    const addParticipant = useCallback(async (rec: TaskResult) => {
        const urls = urlsOf(rec);
        if (!urls.length) return;
        const labels = urls.map((u, i) => assetLabel(u, `${rec.id}:${i}`));
        const working = await loadWorking();
        if (working) {
            await persist(
                working.rec,
                addParticipants(working.state, rec.id, urls, labels),
            );
        } else {
            const state = addParticipants(newArena(), rec.id, urls, labels);
            await db.taskResults.add({
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
        }
    }, []);

    const toggleParticipant = useCallback(async (rec: TaskResult) => {
        const urls = urlsOf(rec);
        if (!urls.length) return;
        const labels = urls.map((u, i) => assetLabel(u, `${rec.id}:${i}`));
        const working = await loadWorking();
        if (!working) {
            await addParticipant(rec);
            return;
        }
        const inArena = working.state.participants.some(
            (p) => p.taskResultId === rec.id,
        );
        await persist(
            working.rec,
            inArena
                ? removeParticipants(working.state, rec.id)
                : addParticipants(working.state, rec.id, urls, labels),
        );
    }, [addParticipant]);

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

    const start = useCallback(() => {
        if (!working) return;
        if (summarize(working.state).standings.length < 2) {
            toast(tr('arena.start_min'));
            return;
        }
        openArena(working.rec.id);
    }, [working, openArena, tr]);

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
        addParticipant,
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
