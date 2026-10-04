import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildClassicSchedule, nextClassicRound } from './classicSchedule.ts';
import { generateEventRound } from './scheduler.ts';
import { generateRankedRound } from './ranking.ts';
import { generateFixedPairsRound } from './fixedPairs.ts';
import { expectValidRound, makePlayers, seedRandom } from './testing.ts';
import type { Pair, Round } from '../types.ts';

afterEach(() => vi.restoreAllMocks());

/** Who rests right after resting: "round 5: p3" */
const backToBack = (rounds: Round[]) => rounds.flatMap((r, i) =>
  i ? r.byes.filter(id => rounds[i - 1].byes.includes(id)).map(id => `round ${i + 1}: ${id}`) : []);

// Every players/courts combination where it is possible: no more players resting than playing
const CASES = Array.from({ length: 26 }, (_, i) => i + 5).flatMap(n =>
  Array.from({ length: Math.floor(n / 4) }, (_, c) => c + 1)
    .filter(c => n - c * 4 <= c * 4)
    .map(c => ({ n, c })));
const pairsOf = (n: number): Pair[] => Array.from({ length: n / 2 }, (_, i) => [`p${2 * i}`, `p${2 * i + 1}`]);

describe('nobody rests two rounds in a row', () => {
  for (const fixed of [false, true]) {
    it(`Americano By skill (${fixed ? 'fixed pairs' : 'rotating'}): whole schedule + 3 extra rounds, every players/courts combination`, () => {
      seedRandom(1);
      for (const { n, c } of CASES) {
        if (fixed && n % 2) continue;
        const players = makePlayers(n, 'mixed');
        const setup = { players, pairs: fixed ? pairsOf(n) : [], fixed, balanced: true };
        const rounds = buildClassicSchedule(setup, c);
        for (let i = 0; i < 3; i++) rounds.push(nextClassicRound(setup, rounds, c));
        rounds.forEach(r => expectValidRound(r, players.map(p => p.id), c));
        expect(backToBack(rounds), `${n} players, ${c} courts`).toEqual([]);
      }
    });
  }

  it('Americano Classic: keeps every match of the schedule when reordering is enough (19 players, 4 courts)', () => {
    seedRandom(2);
    const players = makePlayers(19);
    const rounds = buildClassicSchedule({ players, pairs: [], fixed: false, balanced: false }, 4);
    const partners = rounds.flatMap(r => r.matches.flatMap(m => [m.teamA, m.teamB].map(t => [...t].sort().join('+'))));
    expect(rounds).toHaveLength(19);
    expect(partners).toHaveLength(19 * 4 * 2);
    expect(new Set(partners).size).toBe(partners.length); // the Berger schedule: no partnership repeats
    expect(backToBack(rounds)).toEqual([]);
  });

  for (const mode of ['skill', 'ranking', 'fixed', 'fixed ranking'] as const) {
    it(`League (${mode}): 12 rounds, every players/courts combination`, () => {
      seedRandom(3);
      for (const { n, c } of CASES) {
        if (mode.startsWith('fixed') && n % 2) continue;
        const players = makePlayers(n, 'mixed');
        const rounds: Round[] = [];
        for (let i = 0; i < 12; i++) {
          rounds.push(mode === 'skill' ? generateEventRound(players, players, rounds, i, c)
            : mode === 'ranking' ? generateRankedRound(players, players, rounds, i, c, id => 1 + Number(id.slice(1)) % 3)
            : generateFixedPairsRound(pairsOf(n), players, rounds, i, c, { ranked: mode === 'fixed ranking', strength: () => 2 }));
        }
        expect(backToBack(rounds), `${n} players, ${c} courts`).toEqual([]);
      }
    });
  }
});

describe('Americano Classic: same matches for everyone, with and against everyone', () => {
  const partnerships = (rounds: Round[]) => rounds.flatMap(r => r.matches.flatMap(m => [m.teamA, m.teamB].map(t => [...t].sort().join('+'))));
  const meetings = (rounds: Round[]) => rounds.flatMap(r => r.matches.map(m => [m.teamA.join('+'), m.teamB.join('+')].sort().join(' vs ')));
  const played = (rounds: Round[]) => {
    const count = new Map<string, number>();
    rounds.forEach(r => r.matches.forEach(m => [...m.teamA, ...m.teamB].forEach(id => count.set(id, (count.get(id) ?? 0) + 1))));
    return count;
  };

  it('rotating, 4–30 players, any courts: everyone plays the same, no partnership repeats; with all courts nobody rests twice in a row', () => {
    for (let n = 4; n <= 30; n++) {
      const players = makePlayers(n, 'mixed');
      for (let c = 1; c <= Math.floor(n / 4); c++) {
        const rounds = buildClassicSchedule({ players, pairs: [], fixed: false, balanced: false }, c);
        const label = `${n} players, ${c} courts`;
        rounds.forEach(r => expectValidRound(r, players.map(p => p.id), c));
        const counts = played(rounds);
        expect(counts.size, label).toBe(n);
        expect(new Set(counts.values()).size, label).toBe(1);
        const ps = partnerships(rounds);
        expect(new Set(ps).size, label).toBe(ps.length);
        if (n % 4 <= 1) expect(ps.length, label).toBe(n * (n - 1) / 2);
        if (c === Math.floor(n / 4)) expect(backToBack(rounds), label).toEqual([]);
      }
    }
  });

  it('fixed pairs, 2–15 pairs, any courts: round robin (every pair meets every other once); with all courts nobody rests twice in a row', () => {
    for (let n = 4; n <= 30; n += 2) {
      const pairs = pairsOf(n);
      for (let c = 1; c <= Math.max(1, Math.floor(pairs.length / 2)); c++) {
        const rounds = buildClassicSchedule({ players: makePlayers(n), pairs, fixed: true, balanced: false }, c);
        const label = `${pairs.length} pairs, ${c} courts`;
        const ms = meetings(rounds);
        expect(new Set(ms).size, label).toBe(pairs.length * (pairs.length - 1) / 2);
        expect(ms, label).toHaveLength(new Set(ms).size);
        if (c === Math.floor(pairs.length / 2)) expect(backToBack(rounds), label).toEqual([]);
      }
    }
  });
});
