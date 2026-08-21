import { describe, expect, it } from 'vitest';
import {
    addNodeEvent,
    clearNodeEvents,
    progress as reducer,
    setGenerationEnd,
    setGenerationStart,
} from './progress';

const initialState = () => reducer(undefined, { type: 'INIT' });

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
