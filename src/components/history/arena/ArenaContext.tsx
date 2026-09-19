import { createContext, useContext } from 'react';
import { TaskResult } from '../db';
import { ArenaState } from '../../../utils/arena';

export type Entry = { rec: TaskResult; state: ArenaState };
export type Working = Entry | null;

export type ArenaContextType = {
    // every saved arena (most recent first), parsed
    arenas: Entry[];
    // the arena currently being built / voted on (the most recent building/active)
    working: Working;
    rosterIds: Set<number>;
    selectMode: boolean;
    openArenaId: number | null;
    toggleSelectMode: () => void;
    exitSelectMode: () => void;
    addParticipant: (tr: TaskResult) => Promise<void>;
    toggleParticipant: (tr: TaskResult) => Promise<void>;
    start: () => void;
    openArena: (id: number) => void;
    closeArena: () => void;
    vote: (arenaId: number, aKey: string, bKey: string, winner: string) => Promise<void>;
    finishArena: (arenaId: number) => Promise<void>;
    continueArena: (arenaId: number) => Promise<void>;
    continueVoting: (arenaId: number) => Promise<void>;
};

export const ArenaContext = createContext<ArenaContextType | undefined>(undefined);

export const useArena = (): ArenaContextType => {
    const ctx = useContext(ArenaContext);
    if (!ctx) {
        throw new Error('useArena must be used within an ArenaContextProvider');
    }
    return ctx;
};
