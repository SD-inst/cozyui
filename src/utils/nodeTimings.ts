export type NodeEventType = 'executing' | 'executed' | 'progress';

export type NodeEvent = {
    node: string;
    ts: number;
    type: NodeEventType;
};

export type NodeTiming = {
    node: string;
    cls?: string;
    label: string;
    ms: number;
    offset_ms: number;
};

// Nodes shorter than this are not interesting for phase comparison
export const MIN_TIMING_MS = 1000;
// Safety cap on the number of stored timings
export const MAX_TIMINGS = 20;

// Builds per-node durations from raw WS events (executing/executed/progress),
// in arrival order.
//
// ComfyUI executes nodes strictly one at a time, so the moment the NEXT node
// starts is the moment the CURRENT node finished. The proxy forwards 'executed'
// only for the final node (intermediate ones only get 'executing'), so a node's
// END is resolved as:
//   1. its own 'executed' event, if present — capped by the next node's start
//      (guards against WS reordering);
//   2. else the next node's first event (the sequential boundary);
//   3. else the job end (execution_success timestamp).
// A node's START is its 'executing' event, falling back to its first 'progress'
// event, the previous node's resolved end, or the job start.
export const buildNodeTimings = (
    events: NodeEvent[],
    jobStartTs: number,
    api?: any,
    jobEndTs?: number,
): NodeTiming[] => {
    const nodes = api || {};
    const executingByNode = new Map<string, number>();
    const progressByNode = new Map<string, number>();
    const executedByNode = new Map<string, number>();
    const firstTsByNode = new Map<string, number>();
    const order: string[] = [];
    for (const e of events) {
        if (!e.node || !e.ts) {
            continue;
        }
        if (e.type === 'executing' && !executingByNode.has(e.node)) {
            executingByNode.set(e.node, e.ts);
        }
        if (e.type === 'progress' && !progressByNode.has(e.node)) {
            progressByNode.set(e.node, e.ts);
        }
        if (e.type === 'executed' && !executedByNode.has(e.node)) {
            executedByNode.set(e.node, e.ts);
        }
        if (!firstTsByNode.has(e.node)) {
            firstTsByNode.set(e.node, e.ts);
            order.push(e.node);
        }
    }
    const timings: NodeTiming[] = [];
    const endResolved: (number | undefined)[] = [];
    for (let i = 0; i < order.length; i++) {
        const node = order[i];
        const nextStart =
            i + 1 < order.length ? firstTsByNode.get(order[i + 1]) : undefined;
        const executed = executedByNode.get(node);
        // See the header comment for the end-resolution rules.
        const end =
            nextStart !== undefined
                ? executed !== undefined
                    ? Math.min(executed, nextStart)
                    : nextStart
                : executed ?? jobEndTs;
        endResolved.push(end);
        if (end === undefined) {
            // No reliable end (single node, no executed, no job end)
            continue;
        }
        const start =
            executingByNode.get(node) ??
            progressByNode.get(node) ??
            endResolved[i - 1] ??
            jobStartTs;
        const ms = end - start;
        if (ms <= 0) {
            continue;
        }
        const nodeInfo = nodes[node] || {};
        timings.push({
            node,
            cls: nodeInfo.class_type || '',
            label:
                nodeInfo._meta?.title ||
                nodeInfo.class_type ||
                node,
            ms,
            offset_ms: Math.max(0, start - jobStartTs),
        });
    }
    return timings;
};

// Keeps only nodes longer than MIN_TIMING_MS (capped at MAX_TIMINGS, in
// chronological order). Short nodes are dropped because they don't help
// comparing generation phases.
export const filterNodeTimings = (timings: NodeTiming[]): NodeTiming[] => {
    return timings
        .filter((t) => t.ms >= MIN_TIMING_MS)
        .sort((a, b) => b.ms - a.ms)
        .slice(0, MAX_TIMINGS)
        .sort((a, b) => a.offset_ms - b.offset_ms);
};
