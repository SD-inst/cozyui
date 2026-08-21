import { describe, expect, it } from 'vitest';
import {
    buildNodeTimings,
    filterNodeTimings,
    MAX_TIMINGS,
    MIN_TIMING_MS,
    NodeEvent,
    NodeTiming,
} from './nodeTimings';

const ev = (node: string, ts: number, type: NodeEvent['type']): NodeEvent => ({
    node,
    ts,
    type,
});
const timing = (node: string, ms: number, offset_ms = 0): NodeTiming => ({
    node,
    cls: '',
    label: node,
    ms,
    offset_ms,
});

describe('buildNodeTimings', () => {
    it('brackets each node by its own executing/executed pair', () => {
        const events = [
            ev('A', 1100, 'executing'),
            ev('A', 3000, 'executed'),
            ev('B', 3050, 'executing'),
            ev('B', 4000, 'executed'),
        ];
        expect(buildNodeTimings(events, 1000)).toEqual([
            { node: 'A', cls: '', label: 'A', ms: 1900, offset_ms: 100 },
            { node: 'B', cls: '', label: 'B', ms: 950, offset_ms: 2050 },
        ]);
    });

    it('dedupes repeated events per node (multi-output nodes)', () => {
        const events = [
            ev('A', 1100, 'executing'),
            ev('A', 1200, 'executing'), // repeated start — ignored
            ev('A', 3000, 'executed'),
            ev('A', 3100, 'executed'), // second output — ignored
        ];
        const t = buildNodeTimings(events, 1000);
        expect(t).toHaveLength(1);
        expect(t[0].ms).toBe(1900);
    });

    it('skips nodes that never completed (e.g. interrupted run)', () => {
        const events = [
            ev('A', 1100, 'executing'),
            ev('A', 3000, 'executed'),
            ev('B', 3100, 'executing'), // no 'executed' — never completed
        ];
        expect(buildNodeTimings(events, 1000).map((t) => t.node)).toEqual(['A']);
    });

    it('skips non-positive durations (clock anomalies)', () => {
        const events = [
            ev('A', 3000, 'executing'),
            ev('A', 2900, 'executed'), // end before start
        ];
        expect(buildNodeTimings(events, 1000)).toEqual([]);
    });

    it('falls back to the first progress event when executing was missed', () => {
        const events = [
            ev('A', 1100, 'executing'),
            ev('A', 3000, 'executed'),
            ev('B', 3200, 'progress'), // first progress of B (≈ start + 1 step)
            ev('B', 4000, 'executed'),
        ];
        const t = buildNodeTimings(events, 1000);
        const b = t.find((x) => x.node === 'B')!;
        expect(b.ms).toBe(800);
        expect(b.offset_ms).toBe(2200);
    });

    it('falls back to the previous completed node when no start marker exists', () => {
        const events = [
            ev('A', 1100, 'executing'),
            ev('A', 3000, 'executed'),
            ev('B', 4000, 'executed'), // 'executing' and 'progress' both lost
        ];
        const t = buildNodeTimings(events, 1000);
        expect(t.find((x) => x.node === 'B')!.ms).toBe(1000);
    });

    it('falls back to the job start for the first observed node', () => {
        const events = [ev('B', 4000, 'executed')];
        const t = buildNodeTimings(events, 1000);
        expect(t[0].ms).toBe(3000);
        expect(t[0].offset_ms).toBe(0);
    });

    it('resolves label and cls from the api workflow (title > class_type > id)', () => {
        const api = {
            '105:14': {
                class_type: 'SamplerCustomAdvanced',
                _meta: { title: 'SamplerCustomAdvanced' },
            },
            '105:121': { class_type: 'VHS_VideoCombine' },
        };
        const events = [
            ev('105:14', 1000, 'executing'),
            ev('105:14', 2000, 'executed'),
            ev('105:121', 2000, 'executing'),
            ev('105:121', 2500, 'executed'),
        ];
        const t = buildNodeTimings(events, 900, api);
        expect(t[0].label).toBe('SamplerCustomAdvanced');
        expect(t[0].cls).toBe('SamplerCustomAdvanced');
        expect(t[1].label).toBe('VHS_VideoCombine');
        expect(t[1].cls).toBe('VHS_VideoCombine');
    });

    it('returns nodes in order of first appearance', () => {
        const events = [
            ev('B', 100, 'executing'),
            ev('A', 150, 'executing'),
            ev('B', 300, 'executed'),
            ev('A', 400, 'executed'),
        ];
        expect(buildNodeTimings(events, 0).map((t) => t.node)).toEqual(['B', 'A']);
    });

    it('ignores events without node or timestamp', () => {
        const events = [
            { node: '', ts: 100, type: 'executing' as const },
            { node: 'A', ts: 0, type: 'executed' as const },
            ev('B', 500, 'executed'),
        ];
        expect(buildNodeTimings(events, 100)).toEqual([
            { node: 'B', cls: '', label: 'B', ms: 400, offset_ms: 0 },
        ]);
    });
    it('bounds every node by the next node start when only the final node sends executed (proxy behavior)', () => {
        // The proxy forwards 'executed' only for the final node; mid-run
        // nodes are bounded by the next node's 'executing' event.
        const events = [
            ev('A', 1000, 'executing'),
            ev('B', 3000, 'executing'),
            ev('C', 6000, 'executing'),
            ev('C', 6500, 'executed'), // only the final node completes
        ];
        const t = buildNodeTimings(events, 900);
        expect(t.map((x) => ({ node: x.node, ms: x.ms }))).toEqual([
            { node: 'A', ms: 2000 },
            { node: 'B', ms: 3000 },
            { node: 'C', ms: 500 },
        ]);
    });

    it('falls back to the job end for the last node without an executed event', () => {
        const events = [
            ev('A', 1000, 'executing'),
            ev('B', 3000, 'executing'),
        ];
        const t = buildNodeTimings(events, 900, undefined, 3500);
        expect(t.map((x) => ({ node: x.node, ms: x.ms }))).toEqual([
            { node: 'A', ms: 2000 },
            { node: 'B', ms: 500 },
        ]);
    });

    it('caps an executed timestamp by the next node start (WS reordering)', () => {
        const events = [
            ev('A', 1000, 'executing'),
            ev('B', 2000, 'executing'),
            ev('A', 2500, 'executed'), // arrived after B had already started
            ev('B', 2600, 'executed'),
        ];
        const t = buildNodeTimings(events, 900);
        expect(t.map((x) => ({ node: x.node, ms: x.ms }))).toEqual([
            { node: 'A', ms: 1000 },
            { node: 'B', ms: 600 },
        ]);
    });

});

describe('filterNodeTimings', () => {
    it('drops nodes shorter than MIN_TIMING_MS', () => {
        const timings = [timing('A', MIN_TIMING_MS - 1), timing('B', 2000)];
        expect(filterNodeTimings(timings).map((t) => t.node)).toEqual(['B']);
    });

    it('keeps nodes exactly at the threshold', () => {
        const timings = [timing('A', MIN_TIMING_MS)];
        expect(filterNodeTimings(timings)).toHaveLength(1);
    });

    it('caps the number of phases at MAX_TIMINGS, keeping the longest', () => {
        const count = MAX_TIMINGS + 5;
        const timings = Array.from({ length: count }, (_, i) =>
            timing(`n${i}`, (i + 1) * 2000, i * 1000),
        );
        const out = filterNodeTimings(timings);
        expect(out).toHaveLength(MAX_TIMINGS);
        expect(out.some((x) => x.node === `n${count - 1}`)).toBe(true);
        expect(out.some((x) => x.node === 'n0')).toBe(false);
    });

    it('returns chronological order', () => {
        const timings = [
            timing('B', 5000, 4000),
            timing('A', 9000, 0),
        ];
        expect(filterNodeTimings(timings).map((t) => t.node)).toEqual(['A', 'B']);
    });
});
