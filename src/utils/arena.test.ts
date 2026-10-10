import { describe, expect, it } from 'vitest';
import {
    addParticipants,
    ArenaState,
    confidence,
    DEFAULT_ARENA_CONFIG,
    eloExpected,
    isInArena,
    newArena,
    nextPair,
    removeParticipants,
    recordVote,
    rosterTaskResultIds,
    standings,
    summarize,
    toggleParticipants,
    totalPairs,
} from './arena';

const mkArena = (n: number, seed = 1): ArenaState => {
    let state = newArena({ seed });
    for (let i = 0; i < n; i++) {
        state = addParticipants(state, i + 1, [`url${i}`], [`label${i}`]);
    }
    return state;
};

describe('arena — state construction', () => {
    it('newArena has defaults and is building', () => {
        const a = newArena();
        expect(a.participants).toEqual([]);
        expect(a.matches).toEqual([]);
        expect(a.status).toBe('building');
        expect(a.config).toEqual(DEFAULT_ARENA_CONFIG);
    });

    it('addParticipants adds every asset of a batch', () => {
        const a = addParticipants(newArena(), 7, ['u0', 'u1', 'u2'], ['a', 'b', 'c']);
        expect(a.participants).toHaveLength(3);
        expect(a.participants.map((p) => p.key)).toEqual(['7:0', '7:1', '7:2']);
    });

    it('addParticipants is idempotent for the same record', () => {
        let a = addParticipants(newArena(), 7, ['u0', 'u1'], ['a', 'b']);
        a = addParticipants(a, 7, ['u0', 'u1'], ['a', 'b']);
        expect(a.participants).toHaveLength(2);
    });

    it('removeParticipants removes the record and its matches', () => {
        let a = addParticipants(newArena(), 1, ['u'], ['x']);
        a = addParticipants(a, 2, ['v'], ['y']);
        a = recordVote(a, '1:0', '2:0', '1:0', 1);
        a = removeParticipants(a, 1);
        expect(a.participants).toHaveLength(1);
        expect(a.matches).toHaveLength(0);
        expect(isInArena(a, 1)).toBe(false);
    });

    it('toggleParticipants adds then removes', () => {
        let a = toggleParticipants(newArena(), 5, ['u'], ['x']);
        expect(isInArena(a, 5)).toBe(true);
        a = toggleParticipants(a, 5, ['u'], ['x']);
        expect(isInArena(a, 5)).toBe(false);
    });

    it('rosterTaskResultIds lists unique source ids', () => {
        const a = mkArena(3);
        expect(rosterTaskResultIds(a)).toEqual(new Set([1, 2, 3]));
    });
});

describe('arena — random pairing', () => {
    it('totalPairs counts unordered pairs', () => {
        expect(totalPairs(2)).toBe(1);
        expect(totalPairs(3)).toBe(3);
        expect(totalPairs(4)).toBe(6);
        expect(totalPairs(1)).toBe(0);
    });

    it('nextPair is deterministic for a given seed', () => {
        const a = mkArena(4, 42);
        const b = mkArena(4, 42);
        expect(nextPair(a, 42)).toEqual(nextPair(b, 42));
    });

    it('nextPair plays every pair once, then STOPS (and re-votes only when continuing)', () => {
        let a = mkArena(3, 7);
        const seen: string[] = [];
        // Round-robin: every pair exactly once, no repeats.
        while (seen.length < totalPairs(3)) {
            const p = nextPair(a, 7);
            expect(p).not.toBeNull();
            const key = [p![0], p![1]].sort().join('|');
            expect(seen).not.toContain(key);
            seen.push(key);
            a = recordVote(a, p![0], p![1], p![0], seen.length);
        }
        expect(seen).toHaveLength(totalPairs(3));
        // After exhaustion the arena STOPS by default (no auto re-vote).
        expect(nextPair(a, 7)).toBeNull();
        // "Continue voting" (allowRevote) lets it keep going (re-votes a pair).
        const again = nextPair(a, 7, true);
        expect(again).not.toBeNull();
    });

    it('nextPair returns null with fewer than 2 participants', () => {
        expect(nextPair(newArena(), 1)).toBeNull();
    });

    it('nextPair picks the closest-rated unplayed pair', () => {
        let a = mkArena(4, 9);
        // Make 1:0 clearly stronger than the rest.
        a = recordVote(a, '1:0', '2:0', '1:0', 1);
        // The closest remaining pair: 3:0 vs 4:0 (both still at the initial
        // rating) — the most informative comparison.
        expect(nextPair(a, 9)).toEqual(['3:0', '4:0']);
    });
});

describe('arena — Elo rating', () => {
    it('eloExpected is 0.5 for equal ratings and symmetric', () => {
        expect(eloExpected(1000, 1000)).toBeCloseTo(0.5);
        expect(eloExpected(1200, 800) + eloExpected(800, 1200)).toBeCloseTo(1);
    });

    it('recordVote moves ratings: winner up, loser down (K=32 from equal)', () => {
        let a = addParticipants(newArena(), 1, ['u'], ['x']);
        a = addParticipants(a, 2, ['v'], ['y']);
        a = recordVote(a, '1:0', '2:0', '1:0', 1);
        const w = a.participants.find((p) => p.key === '1:0')!;
        const l = a.participants.find((p) => p.key === '2:0')!;
        expect(w.rating).toBeCloseTo(1016, 5); // 1000 + 32 * (1 - 0.5)
        expect(l.rating).toBeCloseTo(984, 5); // 1000 + 32 * (0 - 0.5)
        expect(w.wins).toBe(1);
        expect(l.losses).toBe(1);
    });

    it('recordVote with a null winner records a draw (ratings unchanged)', () => {
        let a = addParticipants(newArena(), 1, ['u'], ['x']);
        a = addParticipants(a, 2, ['v'], ['y']);
        a = recordVote(a, '1:0', '2:0', null, 1);
        const p1 = a.participants.find((p) => p.key === '1:0')!;
        const p2 = a.participants.find((p) => p.key === '2:0')!;
        expect(p1.rating).toBeCloseTo(1000, 5); // score 0.5 vs expected 0.5
        expect(p2.rating).toBeCloseTo(1000, 5);
        expect(p1.draws).toBe(1);
        expect(p2.draws).toBe(1);
        expect(p1.wins).toBe(0);
        expect(p2.losses).toBe(0);
        expect(a.matches[0].winnerKey).toBeNull();
    });
});

describe('arena — confidence (Bradley–Terry)', () => {
    it('no participants: null leader', () => {
        const c = confidence(newArena());
        expect(c.leaderKey).toBeNull();
        expect(c.leaderProb).toBe(0);
    });

    it('participants but no matches: leader prob ~0.5, wide CI', () => {
        const a = mkArena(3);
        const c = confidence(a);
        expect(c.leaderProb).toBeCloseTo(0.5, 5);
        expect(c.ciHalfWidth).toBeGreaterThan(10);
    });

    it('a dominant winner yields high confidence', () => {
        let a = mkArena(2, 3);
        // A (id 1) beats B (id 2) five times
        for (let i = 0; i < 5; i++) {
            a = recordVote(a, '1:0', '2:0', '1:0', i + 1);
        }
        const c = confidence(a);
        expect(c.leaderKey).toBe('1:0');
        expect(c.leaderProb).toBeGreaterThan(0.8);
    });

    it('conclusive once the head-to-head edge is decisive, not before', () => {
        let a = mkArena(2, 3);
        for (let i = 0; i < 2; i++) {
            a = recordVote(a, '1:0', '2:0', '1:0', i + 1);
        }
        expect(confidence(a).conclusive).toBe(false);
        for (let i = 2; i < 5; i++) {
            a = recordVote(a, '1:0', '2:0', '1:0', i + 1);
        }
        expect(confidence(a).conclusive).toBe(true);
    });

    it('draws keep the arena undecided', () => {
        let a = mkArena(2, 3);
        for (let i = 0; i < 6; i++) {
            a = recordVote(a, '1:0', '2:0', null, i + 1);
        }
        const c = confidence(a);
        expect(c.leaderProb).toBeCloseTo(0.5, 5);
        expect(c.conclusive).toBe(false);
    });

    it('transitive 6-player round-robin is decided by the tournament rule', () => {
        // A single round-robin can never reach 95% Bayesian confidence (the
        // top two meet once), but an unbeaten leader that beat the runner-up
        // face-to-face must be recognized as decided — and well before the
        // last pair.
        let a = mkArena(6, 1);
        let decidedAt = 0;
        for (let step = 1; step <= 15; step++) {
            const p = nextPair(a, 1, false);
            if (!p) break;
            // the lower-indexed player always wins (perfectly transitive)
            a = recordVote(a, p[0], p[1], p[0] < p[1] ? p[0] : p[1], step);
            if (confidence(a).conclusive) {
                decidedAt = step;
                break;
            }
        }
        expect(decidedAt).toBeGreaterThan(0);
        expect(decidedAt).toBeLessThanOrEqual(9);
    });
});

describe('arena — standings / summarize', () => {
    it('standings sorts by rating descending', () => {
        let a = mkArena(2, 2);
        a = recordVote(a, '1:0', '2:0', '2:0', 1); // B wins
        const s = standings(a);
        expect(s[0].key).toBe('2:0');
        expect(s[0].rating).toBeGreaterThan(s[1].rating);
    });

    it('summarize reports matches played and pairs left', () => {
        let a = mkArena(3, 5);
        const summary = summarize(a);
        expect(summary.pairsTotal).toBe(3);
        expect(summary.matchesPlayed).toBe(0);
        expect(summary.pairsLeft).toBe(3);
        expect(summary.winner).toBeTruthy();
        a = recordVote(a, summary.standings[0].key, summary.standings[1].key, summary.standings[0].key, 1);
        const after = summarize(a);
        expect(after.matchesPlayed).toBe(1);
        expect(after.pairsLeft).toBe(2);
    });
});
