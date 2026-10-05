import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateLeagueClassicRound } from './leagueClassic.ts';
import { shortScheduleRounds } from './scheduler.ts';
import { expectValidRound, makePlayers, seedRandom } from './testing.ts';
import type { Pair, Round } from '../types.ts';

afterEach(() => vi.restoreAllMocks());

const pairsOf = (n: number): Pair[] => Array.from({ length: n / 2 }, (_, i) => [`p${2 * i}`, `p${2 * i + 1}`]);
const play = (n: number, courts: number, rounds: number, pairs: Pair[] | null, absent: (r: number) => string[] = () => []) => {
  const players = makePlayers(n, 'mixed');
  const out: Round[] = [];
  for (let r = 0; r < rounds; r++) {
    const off = new Set(absent(r));
    const active = new Set(players.map(p => p.id).filter(id => !off.has(id)));
    const round = generateLeagueClassicRound(players, active, pairs, out, r, courts);
    expectValidRound(round, [...active], courts);
    out.push(round);
  }
  return out;
};
const meetings = (rounds: Round[]) => rounds.flatMap(r => r.matches.map(m => [m.teamA.join('+'), m.teamB.join('+')].sort().join(' vs ')));
const partnerships = (rounds: Round[]) => rounds.flatMap(r => r.matches.flatMap(m => [m.teamA, m.teamB].map(t => [...t].sort().join('+'))));

describe('League Classic (everyone with and against everyone)', () => {
  it('fixed pairs, everyone present: a full round robin in the planned rounds', () => {
    seedRandom(1);
    for (const [n, c] of [[8, 2], [12, 3], [16, 4], [12, 2], [10, 2]]) {
      const P = n / 2;
      const rounds = play(n, c, Math.ceil((P % 2 ? P : P - 1) * Math.floor(P / 2) / c), pairsOf(n));
      const ms = meetings(rounds);
      expect(new Set(ms).size, `${P} pairs, ${c} courts`).toBe(P * (P - 1) / 2);
    }
  });

  it('rotating, everyone present: the short Americano Classic schedule — everyone faces everyone, no partner repeats (8, 12, 16 players)', () => {
    seedRandom(2);
    for (const n of [8, 12, 16]) {
      const rounds = play(n, n / 4, shortScheduleRounds(n)!, null);
      const ps = partnerships(rounds);
      expect(ps, `${n} players`).toHaveLength(new Set(ps).size);
      const opp = new Set(rounds.flatMap(r => r.matches.flatMap(m => m.teamA.flatMap(a => m.teamB.map(b => [a, b].sort().join('|'))))));
      expect(opp.size, `${n} players`).toBe(n * (n - 1) / 2);
    }
  });

  it('absent players never play; pending matches are played later', () => {
    seedRandom(3);
    const rounds = play(16, 4, 9, pairsOf(16), r => (r === 1 ? ['p0', 'p1'] : []));
    expect(rounds[1].matches.some(m => [...m.teamA, ...m.teamB].includes('p0'))).toBe(false);
    const ms = meetings(rounds);
    expect(new Set(ms).size).toBeGreaterThanOrEqual(26); // 28 in a full round robin: at most 2 left after one absence
  });
});
