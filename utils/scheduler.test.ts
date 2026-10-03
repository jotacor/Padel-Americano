import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateAdditionalRound,
  generateAmericanoSchedule,
  generateChampionshipRound,
  generateEventRound,
  generateSkillBalancedSchedule,
  packRounds,
} from './scheduler.ts';
import { expectValidRound, key, makePlayers, matchesPlayed, pairCounts, playersOf, scheduleText, seedRandom } from './testing.ts';
import type { Player, Round } from '../types.ts';

afterEach(() => vi.restoreAllMocks());

const ids = (players: Player[]) => players.map(p => p.id);

// Equal skills → deterministic; shared by the invariant and snapshot tests
const schedules = new Map<number, Round[]>();
const scheduleFor = (n: number) => {
  if (!schedules.has(n)) schedules.set(n, generateAmericanoSchedule(makePlayers(n)));
  return schedules.get(n)!;
};
const SIZES = Array.from({ length: 27 }, (_, i) => i + 4); // 4..30

describe('generateAmericanoSchedule', () => {
  it.each(SIZES)('%i players: valid rounds, N−1 rounds (N if odd), nobody partners twice', n => {
    const players = makePlayers(n);
    const rounds = scheduleFor(n);
    expect(rounds).toHaveLength(n % 2 ? n : n - 1);
    rounds.forEach(r => {
      expectValidRound(r, ids(players), Math.floor(n / 4));
      expect(r.matches).toHaveLength(Math.floor(n / 4));
    });
    const { partners } = pairCounts(rounds);
    expect(Math.max(...partners.values())).toBe(1);
    // Everyone partners everyone when the byes allow it (N ≡ 0 or 1 mod 4)
    if (n % 4 <= 1) expect(partners.size).toBe(n * (n - 1) / 2);
  });

  it.each([8, 12, 16])('Whist %i: everyone partners once and opposes everyone twice', n => {
    const { partners, opponents } = pairCounts(scheduleFor(n));
    const pairs = n * (n - 1) / 2;
    expect(partners.size).toBe(pairs);
    expect(opponents.size).toBe(pairs);
    expect(new Set(opponents.values())).toEqual(new Set([2]));
  });

  it.each([5, 7, 10, 13, 18, 22])('%i players with mixed skills keep the guarantees', n => {
    seedRandom(n);
    const players = makePlayers(n, 'mixed');
    const rounds = generateAmericanoSchedule(players);
    rounds.forEach(r => expectValidRound(r, ids(players), Math.floor(n / 4)));
    expect(Math.max(...pairCounts(rounds).partners.values())).toBe(1);
  });

  // Golden output: any scheduler/optimizer change must keep these identical
  it('matches the golden schedules (4–30 players)', () => {
    const text = SIZES.map(n => `## ${n} players\n${scheduleText(scheduleFor(n))}`).join('\n\n');
    expect(text).toMatchSnapshot();
  });
});

describe('generateSkillBalancedSchedule', () => {
  it.each([8, 11, 14])('%i players: valid rounds, same round count as Whist', n => {
    seedRandom(n);
    const players = makePlayers(n, 'mixed');
    const rounds = generateSkillBalancedSchedule(players);
    expect(rounds).toHaveLength(n % 2 ? n : n - 1);
    rounds.forEach(r => expectValidRound(r, ids(players), Math.floor(n / 4)));
  });
});

describe('packRounds', () => {
  const matchKeys = (rounds: Round[]) =>
    rounds.flatMap(r => r.matches.map(m => `${key(m.teamA[0], m.teamA[1])}v${key(m.teamB[0], m.teamB[1])}`)).sort();

  it.each([[16, 2], [16, 3], [20, 3], [24, 5], [30, 2], [13, 2]])('%i players into %i courts keeps every match', (n, courts) => {
    const players = makePlayers(n);
    const full = scheduleFor(n);
    const packed = packRounds(full, courts, ids(players));
    expect(matchKeys(packed)).toEqual(matchKeys(full));
    packed.forEach((r, i) => {
      expect(r.index).toBe(i);
      expect(r.matches.length).toBeLessThanOrEqual(courts);
      expectValidRound(r, ids(players), courts);
    });
    expect(matchesPlayed(packed)).toEqual(matchesPlayed(full));
  });

  it('returns the schedule untouched when it already fits', () => {
    const full = scheduleFor(12);
    expect(packRounds(full, 3, ids(makePlayers(12)))).toBe(full);
  });
});

describe('generateEventRound (League)', () => {
  it.each([[14, 4], [10, 3], [12, 2], [9, 4], [17, 3]])('%i active players, %i courts: fewest matches play first', (n, courts) => {
    seedRandom(n * 31 + courts);
    const players = makePlayers(n, 'mixed');
    const rounds: Round[] = [];
    for (let r = 0; r < 12; r++) {
      const played = matchesPlayed(rounds);
      const round = generateEventRound(players, players, rounds, r, courts);
      expectValidRound(round, ids(players), courts);
      expect(round.matches).toHaveLength(Math.min(courts, Math.floor(n / 4)));
      const playing = new Set(playersOf(round));
      const maxPlaying = Math.max(...[...playing].map(id => played.get(id) || 0));
      round.byes.forEach(id => expect(played.get(id) || 0, `${id} rests with fewer matches`).toBeGreaterThanOrEqual(maxPlaying));
      rounds.push(round);
    }
  });

  it('only active players play', () => {
    seedRandom(7);
    const players = makePlayers(12);
    const active = players.slice(0, 9);
    const round = generateEventRound(active, players, [], 0, 3);
    expectValidRound(round, ids(active), 3);
    expect(round.matches).toHaveLength(2);
  });
});

describe('generateAdditionalRound (Random "+")', () => {
  it('respects the chosen courts and gives rests to whoever played most', () => {
    seedRandom(3);
    const players = makePlayers(14);
    const rounds = packRounds(scheduleFor(14), 2, ids(players));
    const played = matchesPlayed(rounds);
    const round = generateAdditionalRound(players, rounds, rounds.length, 2);
    expectValidRound(round, ids(players), 2);
    expect(round.matches).toHaveLength(2);
    const maxPlaying = Math.max(...playersOf(round).map(id => played.get(id) || 0));
    round.byes.forEach(id => expect(played.get(id) || 0).toBeGreaterThanOrEqual(maxPlaying));
  });
});

describe('generateChampionshipRound', () => {
  it('puts 1st+3rd vs 2nd+4th on court 1', () => {
    const players = makePlayers(8);
    const leaderboard = ['p5', 'p2', 'p7', 'p0', 'p1', 'p3', 'p4', 'p6'].map(playerId => ({ playerId }));
    const round = generateChampionshipRound(players, leaderboard, [], 7);
    const final = round.matches.find(m => m.id.includes('championship'))!;
    expect(final.courtIndex).toBe(0);
    expect(final.teamA).toEqual(['p5', 'p7']);
    expect(final.teamB).toEqual(['p2', 'p0']);
    expectValidRound(round, ids(players), 2);
  });
});

describe('performance', () => {
  it('generates a 40-player Random schedule quickly', () => {
    const t = performance.now();
    const rounds = generateAmericanoSchedule(makePlayers(40));
    expect(performance.now() - t).toBeLessThan(1500);
    expect(rounds).toHaveLength(39);
    rounds.forEach(r => expectValidRound(r, ids(makePlayers(40)), 10));
  });

  it('generates a League round with 40 players on 10 courts quickly', () => {
    seedRandom(1);
    const players = makePlayers(40, 'mixed');
    const t = performance.now();
    const round = generateEventRound(players, players, [], 0, 10);
    expect(performance.now() - t).toBeLessThan(100);
    expect(round.matches).toHaveLength(10);
  });
});
