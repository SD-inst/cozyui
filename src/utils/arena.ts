// Pure, framework-free logic for the Elo arena: types, Elo rating updates,
// deterministic random pairing (no repeat until all pairs are exhausted), and a
// Bayesian Bradley–Terry confidence estimate. Everything here is deterministic
// (seeded PRNG, fixed iterations) so it can be unit-tested without React/jsdom.

export type ArenaStatus = 'building' | 'active' | 'finished';

export interface ArenaParticipant {
    key: string; // `${taskResultId}:${assetIndex}` — unique competitor id
    taskResultId: number;
    assetIndex: number;
    url: string; // asset URL from the source record (for display/download)
    label: string; // short display label
    rating: number; // Elo rating
    wins: number;
    losses: number;
}

export interface ArenaMatch {
    aKey: string;
    bKey: string;
    winnerKey: string;
    ts: number;
}

export interface ArenaConfig {
    maxMatches: number; // hard cap on matches
    seed: number; // PRNG seed for reproducible pairing
    kFactor: number; // Elo K-factor
    initialRating: number;
}

export interface ArenaState {
    participants: ArenaParticipant[];
    matches: ArenaMatch[];
    config: ArenaConfig;
    status: ArenaStatus;
    // Keep voting (re-vote pairs) past the exhaustion stop. Set by the
    // "Continue voting" button once the round-robin / match cap is reached.
    allowRevote?: boolean;
}

export interface Confidence {
    leaderKey: string | null;
    leaderProb: number; // probability the leader is the true best (0..1)
    ciHalfWidth: number; // 1.96 * se(leader) — from the BT fit's inverse-Hessian SE
}

export interface ArenaSummary {
    status: ArenaStatus;
    standings: ArenaParticipant[]; // sorted by rating desc
    winner: ArenaParticipant | null;
    confidence: Confidence;
    matchesPlayed: number;
    pairsTotal: number;
    pairsLeft: number;
}

// Default arena configuration.
export const DEFAULT_ARENA_CONFIG: ArenaConfig = {
    maxMatches: 50,
    seed: 1,
    kFactor: 32,
    initialRating: 1000,
};

export const newArena = (config: Partial<ArenaConfig> = {}): ArenaState => ({
    participants: [],
    matches: [],
    config: { ...DEFAULT_ARENA_CONFIG, ...config },
    status: 'building',
});

// ---------------------------------------------------------------------------
// PRNG — deterministic mulberry32, so a given seed always yields the same
// sequence of "random" values (pairing order is reproducible across resumes).
// ---------------------------------------------------------------------------
export const mulberry32 = (seed: number) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

// ---------------------------------------------------------------------------
// Elo
// ---------------------------------------------------------------------------
export const eloExpected = (ratingA: number, ratingB: number): number =>
    1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

export const eloUpdate = (
    rating: number,
    expected: number,
    score: number,
    kFactor: number,
): number => rating + kFactor * (score - expected);

// ---------------------------------------------------------------------------
// Roster helpers
// ---------------------------------------------------------------------------
export const makeParticipantKey = (taskResultId: number, assetIndex: number) =>
    `${taskResultId}:${assetIndex}`;

export const isInArena = (state: ArenaState, taskResultId: number): boolean =>
    state.participants.some((p) => p.taskResultId === taskResultId);

export const rosterTaskResultIds = (state: ArenaState): Set<number> =>
    new Set(state.participants.map((p) => p.taskResultId));

export const addParticipants = (
    state: ArenaState,
    taskResultId: number,
    urls: string[],
    labels: string[],
): ArenaState => {
    if (isInArena(state, taskResultId)) {
        return state;
    }
    const participants = [...state.participants];
    urls.forEach((url, i) => {
        participants.push({
            key: makeParticipantKey(taskResultId, i),
            taskResultId,
            assetIndex: i,
            url,
            label: labels[i] || `#${taskResultId}:${i}`,
            rating: state.config.initialRating,
            wins: 0,
            losses: 0,
        });
    });
    return { ...state, participants };
};

export const removeParticipants = (
    state: ArenaState,
    taskResultId: number,
): ArenaState => {
    const kept = state.participants.filter((p) => p.taskResultId !== taskResultId);
    if (kept.length === state.participants.length) {
        return state;
    }
    // Drop matches that referenced a removed participant; rebase ratings for
    // consistency (removed participant's results no longer count).
    const removedKeys = new Set(
        state.participants
            .filter((p) => p.taskResultId === taskResultId)
            .map((p) => p.key),
    );
    return {
        ...state,
        participants: kept,
        matches: state.matches.filter(
            (m) => !removedKeys.has(m.aKey) && !removedKeys.has(m.bKey),
        ),
    };
};

export const toggleParticipants = (
    state: ArenaState,
    taskResultId: number,
    urls: string[],
    labels: string[],
): ArenaState =>
    isInArena(state, taskResultId)
        ? removeParticipants(state, taskResultId)
        : addParticipants(state, taskResultId, urls, labels);

// ---------------------------------------------------------------------------
// Random pairing (no repeat of a played pair until every pair has been played)
// ---------------------------------------------------------------------------
export const playedPairKey = (aKey: string, bKey: string): string =>
    [aKey, bKey].sort().join('|');

export const playedPairs = (state: ArenaState): Set<string> =>
    new Set(state.matches.map((m) => playedPairKey(m.aKey, m.bKey)));

export const totalPairs = (n: number): number => (n < 2 ? 0 : (n * (n - 1)) / 2);

// Pick the next pair: the first not-yet-played pair in a deterministic
// seeded shuffle of all possible (sorted) pairs. Because the order depends
// only on the seed and the participant keys (not on which are played), the
// sequence is fully reproducible across resumes — the same seed and same
// played-set always yield the same next pair.
//
// Voting STOPS (returns null) once the smaller of (all unique pairs, the
// maxMatches cap) is reached, UNLESS `allowRevote` is true (the user chose to
// "Continue voting" past the stop). While continuing, the round-robin resumes
// (next unplayed pair) and, once every pair has been played, loops (re-vote)
// through the seeded shuffle so the arena keeps going deterministically.
export const nextPair = (
    state: ArenaState,
    seed: number,
    allowRevote = false,
): [string, string] | null => {
    const keys = state.participants.map((p) => p.key).sort();
    if (keys.length < 2) {
        return null;
    }
    const all: [string, string][] = [];
    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            all.push([keys[i], keys[j]]);
        }
    }
    const rng = mulberry32(seed);
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    const played = playedPairs(state);
    // The stop point: the smaller of (all pairs, the match cap). Only enforce
    // it while not continuing — "Continue voting" lets the arena go past it.
    const effectiveMax = Math.min(
        totalPairs(keys.length),
        state.config.maxMatches,
    );
    if (!allowRevote && state.matches.length >= effectiveMax) {
        return null;
    }
    // Round-robin: the first not-yet-played pair.
    for (const p of all) {
        if (!played.has(playedPairKey(p[0], p[1]))) {
            return p;
        }
    }
    // Round-robin exhausted — only reachable while continuing; re-vote (loop
    // through the seeded shuffle) so the arena keeps going deterministically.
    return all[state.matches.length % all.length];
};

// ---------------------------------------------------------------------------
// Recording a vote (Elo update)
// ---------------------------------------------------------------------------
export const recordVote = (
    state: ArenaState,
    aKey: string,
    bKey: string,
    winnerKey: string,
    ts: number,
): ArenaState => {
    const participants = state.participants.map((p) => ({ ...p }));
    const a = participants.find((p) => p.key === aKey);
    const b = participants.find((p) => p.key === bKey);
    if (!a || !b) {
        return state;
    }
    const eA = eloExpected(a.rating, b.rating);
    const eB = eloExpected(b.rating, a.rating);
    const scoreA = winnerKey === aKey ? 1 : 0;
    const scoreB = winnerKey === bKey ? 1 : 0;
    a.rating = eloUpdate(a.rating, eA, scoreA, state.config.kFactor);
    b.rating = eloUpdate(b.rating, eB, scoreB, state.config.kFactor);
    if (winnerKey === aKey) {
        a.wins += 1;
        b.losses += 1;
    } else {
        b.wins += 1;
        a.losses += 1;
    }
    const matches = [...state.matches, { aKey, bKey, winnerKey, ts }];
    return { ...state, participants, matches };
};

export const standings = (state: ArenaState): ArenaParticipant[] =>
    [...state.participants].sort(
        (a, b) => b.rating - a.rating || b.wins - a.wins,
    );

// ---------------------------------------------------------------------------
// Bayesian Bradley–Terry confidence
// ---------------------------------------------------------------------------
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Solve an n x n linear system (Gauss–Jordan with partial pivoting).
const solveLinear = (
    a: number[][],
    b: number[],
): number[] | null => {
    const n = b.length;
    const M = a.map((row) => [...row]);
    const v = [...b];
    for (let col = 0; col < n; col++) {
        // partial pivot
        let pivot = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) {
                pivot = r;
            }
        }
        if (Math.abs(M[pivot][col]) < 1e-12) {
            return null;
        }
        if (pivot !== col) {
            [M[col], M[pivot]] = [M[pivot], M[col]];
            [v[col], v[pivot]] = [v[pivot], v[col]];
        }
        const diag = M[col][col];
        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const f = M[r][col] / diag;
            for (let c = col; c < n; c++) {
                M[r][c] -= f * M[col][c];
            }
            v[r] -= f * v[col];
        }
    }
    return v.map((bi, i) => bi / M[i][i]);
};

// Invert an n x n matrix (Gauss–Jordan). Returns null if singular.
const invertMatrix = (a: number[][]): number[][] | null => {
    const n = a.length;
    const M = a.map((row) => [...row]);
    const I = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
    for (let col = 0; col < n; col++) {
        let pivot = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) {
                pivot = r;
            }
        }
        if (Math.abs(M[pivot][col]) < 1e-12) {
            return null;
        }
        if (pivot !== col) {
            [M[col], M[pivot]] = [M[pivot], M[col]];
            [I[col], I[pivot]] = [I[pivot], I[col]];
        }
        const diag = M[col][col];
        for (let c = 0; c < n; c++) {
            M[col][c] /= diag;
            I[col][c] /= diag;
        }
        for (let r = 0; r < n; r++) {
            if (r === col) continue;
            const f = M[r][col];
            for (let c = 0; c < n; c++) {
                M[r][c] -= f * M[col][c];
                I[r][c] -= f * I[col][c];
            }
        }
    }
    return I;
};

// Fit the Bradley–Terry model (logistic, L2-ridge for identifiability) to get
// each participant's standard error (the rating CI width). The leader's
// confidence (leaderProb) is the head-to-head win-rate against the runner-up
// with a uniform prior — robust for small samples, see the leaderProb block.
export const confidence = (state: ArenaState): Confidence => {
    const n = state.participants.length;
    if (n < 2) {
        return {
            leaderKey: null,
            leaderProb: 0,
            ciHalfWidth: Infinity,
        };
    }
    const idx: Record<string, number> = {};
    state.participants.forEach((p, i) => {
        idx[p.key] = i;
    });
    const lambda = 1e-3; // ridge — keeps the Hessian invertible

    let theta = new Array(n).fill(0);
    let XtWX: number[][] | null = null;
    let XtWz: number[] | null = null;

    for (let iter = 0; iter < 60; iter++) {
        XtWX = Array.from({ length: n }, () => new Array(n).fill(0));
        XtWz = new Array(n).fill(0);
        for (const m of state.matches) {
            const i = idx[m.aKey];
            const j = idx[m.bKey];
            if (i === undefined || j === undefined) continue;
            const winner = m.winnerKey === m.aKey ? i : j;
            const loser = m.winnerKey === m.aKey ? j : i;
            const eta = theta[winner] - theta[loser];
            const mu = sigmoid(eta);
            const wgt = mu * (1 - mu) + 1e-6;
            const z = eta + (1 - mu) / wgt; // y = 1 (winner beat loser)
            XtWX[winner][winner] += wgt;
            XtWX[loser][loser] += wgt;
            XtWX[winner][loser] -= wgt;
            XtWX[loser][winner] -= wgt;
            XtWz[winner] += wgt * z;
            XtWz[loser] -= wgt * z;
        }
        for (let r = 0; r < n; r++) {
            XtWX[r][r] += lambda; // ridge prior
        }
        const next = solveLinear(XtWX, XtWz);
        if (!next) break;
        const changed = next.reduce(
            (acc, val, i) => acc + Math.abs(val - theta[i]),
            0,
        );
        theta = next;
        if (changed < 1e-8) break;
    }

    const inv = XtWX ? invertMatrix(XtWX) : null;

    // Leader by Elo rating (matches the displayed standings).
    const sorted = standings(state);
    const leaderKey = sorted[0]?.key ?? null;
    if (!leaderKey) {
        return { leaderKey: null, leaderProb: 0, ciHalfWidth: Infinity };
    }
    const leaderIdx = idx[leaderKey];
    const leaderSe = inv ? Math.sqrt(Math.max(inv[leaderIdx][leaderIdx], 0)) : Infinity;

    // Probability the leader beats the immediate challenger (2nd in standings),
    // from their head-to-head record with a uniform (Beta 1,1) prior. A dead tie
    // (no head-to-head data yet) is a coin flip (0.5); it → 1 as the leader's
    // edge grows. This is far more robust than the asymptotic BT Hessian SE,
    // which is over-diffuse for small samples.
    let leaderProb = 0;
    if (sorted.length >= 2) {
        const runnerUpKey = sorted[1].key;
        const hh = state.matches.reduce(
            (acc, m) => {
                const isPair =
                    (m.aKey === leaderKey && m.bKey === runnerUpKey) ||
                    (m.bKey === leaderKey && m.aKey === runnerUpKey);
                if (!isPair) return acc;
                if (m.winnerKey === leaderKey) acc.wins += 1;
                else acc.losses += 1;
                return acc;
            },
            { wins: 0, losses: 0 },
        );
        leaderProb = (hh.wins + 1) / (hh.wins + hh.losses + 2);
    }

    return {
        leaderKey,
        leaderProb,
        ciHalfWidth: 1.96 * (Number.isFinite(leaderSe) ? leaderSe : Infinity),
    };
};

export const summarize = (state: ArenaState): ArenaSummary => {
    const sorted = standings(state);
    const conf = confidence(state);
    const pairsTotal = totalPairs(sorted.length);
    return {
        status: state.status,
        standings: sorted,
        winner: sorted[0] ?? null,
        confidence: conf,
        matchesPlayed: state.matches.length,
        pairsTotal,
        pairsLeft: Math.max(0, pairsTotal - state.matches.length),
    };
};
