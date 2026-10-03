import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateFixedPairsChampionship, generateFixedPairsRound, generateFixedPairsSchedule, pairKey } from './fixedPairs.ts';
import { expectValidRound, key, makePlayers, playersOf, seedRandom } from './testing.ts';
import type { Pair, Round } from '../types.ts';

afterEach(() => vi.restoreAllMocks());

const pairsOf = (n: number): Pair[] => Array.from({ length: n }, (_, i) => [`p${2 * i}`, `p${2 * i + 1}`]);
const meetings = (rounds: Round[]) => {
  const met = new Map<string, number>();
  rounds.forEach(r => r.matches.forEach(m => {
    const k = key(pairKey(m.teamA), pairKey(m.teamB));
    met.set(k, (met.get(k) || 0) + 1);
  }));
  return met;
};

describe('generateFixedPairsSchedule (Random)', () => {
  it.each([4, 5, 6, 7, 8])('%i pairs: every pair meets every other pair exactly once', n => {
    seedRandom(n);
    const pairs = pairsOf(n);
    const rounds = generateFixedPairsSchedule(pairs);
    const all = pairs.flat();
    rounds.forEach(r => {
      expectValidRound(r, all);
      r.matches.forEach(m => [m.teamA, m.teamB].forEach(t => expect(pairs.map(pairKey)).toContain(pairKey(t))));
    });
    const met = meetings(rounds);
    expect(met.size).toBe(n * (n - 1) / 2);
    expect(new Set(met.values())).toEqual(new Set([1]));
  });
});

describe('generateFixedPairsRound (League)', () => {
  it.each([false, true])('partners never split; fewest-played pairs first (ranked: %s)', ranked => {
    seedRandom(ranked ? 2 : 1);
    const players = makePlayers(14);
    const pairs = pairsOf(7);
    const rounds: Round[] = [];
    for (let r = 0; r < 10; r++) {
      const played = new Map<string, number>();
      rounds.forEach(x => x.matches.forEach(m => [m.teamA, m.teamB].forEach(t => played.set(pairKey(t), (played.get(pairKey(t)) || 0) + 1))));
      const round = generateFixedPairsRound(pairs, players, rounds, r, 3, { ranked });
      expectValidRound(round, pairs.flat(), 3);
      expect(round.matches).toHaveLength(3);
      const playing = round.matches.flatMap(m => [pairKey(m.teamA), pairKey(m.teamB)]);
      playing.forEach(k => expect(pairs.map(pairKey)).toContain(k));
      const maxPlaying = Math.max(...playing.map(k => played.get(k) || 0));
      pairs.filter(p => !playing.includes(pairKey(p))).forEach(p => expect(played.get(pairKey(p)) || 0).toBeGreaterThanOrEqual(maxPlaying));
      round.matches.forEach(m => { m.scoreA = 15; m.scoreB = 9; m.isCompleted = true; });
      rounds.push(round);
    }
    // Ranked mode still makes everyone meet: 7 pairs, 30 matches → all 21 pairings
    expect(meetings(rounds).size).toBe(21);
  });

  it('only active pairs play', () => {
    seedRandom(5);
    const players = makePlayers(12);
    const active = pairsOf(6).slice(0, 4);
    const round = generateFixedPairsRound(active, players, [], 0, 3);
    expect(round.matches).toHaveLength(2);
    expect(new Set(playersOf(round))).toEqual(new Set(active.flat()));
  });
});

describe('generateFixedPairsChampionship', () => {
  it('1st vs 2nd on court 1, then 3rd vs 4th', () => {
    const ranked = pairsOf(5);
    const round = generateFixedPairsChampionship(ranked, 9, 2);
    expect(round.matches[0].id).toBe('r9-championship');
    expect([round.matches[0].teamA, round.matches[0].teamB]).toEqual([ranked[0], ranked[1]]);
    expect([round.matches[1].teamA, round.matches[1].teamB]).toEqual([ranked[2], ranked[3]]);
    expect(round.byes).toEqual(ranked[4]);
  });
});
