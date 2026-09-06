import { describe, expect, it } from 'vitest';
import {
    addNodeEvent,
    clearNodeEvents,
    progress as reducer,
    setGenerationEnd,
    setGenerationStart,
    setStatus,
    statusEnum,
} from './progress';

const initialState = () => reducer(undefined, { type: 'INIT' });

type ProgressState = ReturnType<typeof reducer>;

const withStatus = (status: statusEnum): ProgressState => ({
    ...initialState(),
    status,
});

describe('progress slice — node events', () => {
    it('starts with an empty node_events list', () => {
        expect(initialState().node_events).toEqual([]);
    });

    it('appends events in order and clears on demand', () => {
        let s = initialState();
        s = reducer(s, addNodeEvent({ node: '105:14', ts: 100, type: 'executing' }));
        s = reducer(s, addNodeEvent({ node: '105:14', ts: 40000, type: 'executed' }));
        expect(s.node_events).toHaveLength(2);
        s = reducer(s, clearNodeEvents());
        expect(s.node_events).toEqual([]);
    });

    it('does not mutate the previous state', () => {
        const s = initialState();
        const next = reducer(s, addNodeEvent({ node: '1', ts: 1, type: 'executing' }));
        expect(next.node_events).toHaveLength(1);
        expect(s.node_events).toEqual([]);
    });

    it('tracks generation timestamps', () => {
        let s = initialState();
        const before = Date.now();
        s = reducer(s, setGenerationStart());
        expect(s.start_ts).toBeGreaterThanOrEqual(before);
        expect(s.end_ts).toBe(0);
        s = reducer(s, setGenerationEnd());
        expect(s.end_ts).toBeGreaterThanOrEqual(s.start_ts);
    });
});

describe('progress slice — setStatus INTERRUPTED guard', () => {
    // INTERRUPTED may replace an active run (proxy timeout) or a user cancel,
    // but must not clobber terminal or initial states.
    const expectAllowed = (from: statusEnum) => {
        const s = reducer(withStatus(from), setStatus(statusEnum.INTERRUPTED));
        expect(s.status).toBe(statusEnum.INTERRUPTED);
    };
    const expectBlocked = (from: statusEnum) => {
        const s = reducer(withStatus(from), setStatus(statusEnum.INTERRUPTED));
        expect(s.status).toBe(from);
    };

    it('allows INTERRUPTED from an active run (proxy timeout)', () => {
        expectAllowed(statusEnum.RUNNING);
        expectAllowed(statusEnum.WAITING);
    });

    it('allows INTERRUPTED from a user-initiated cancel', () => {
        expectAllowed(statusEnum.CANCELLED);
    });

    it('blocks INTERRUPTED from terminal / initial states', () => {
        expectBlocked(statusEnum.FINISHED);
        expectBlocked(statusEnum.ERROR);
    });

    it('applies non-INTERRUPTED statuses unconditionally', () => {
        let s = withStatus(statusEnum.RUNNING);
        s = reducer(s, setStatus(statusEnum.FINISHED));
        expect(s.status).toBe(statusEnum.FINISHED);
    });
});
