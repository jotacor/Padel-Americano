import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateAdditionalRound,
  generateAmericanoSchedule,
  generateChampionshipRound,
  generateEventRound,
  packRounds,
  shortScheduleRounds,
} from './scheduler.ts';
import { buildClassicSchedule, classicRoundCount } from './classicSchedule.ts';
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
  it.each(SIZES.filter(n => n <= 28))('%i players (short schedule): everyone faces everyone, nobody partners twice, same matches (±1), about half the rounds', n => {
    const players = makePlayers(n);
    const rounds = scheduleFor(n);
    expect(rounds).toHaveLength(shortScheduleRounds(n)!);
    // shorter than the full Whist/Berger schedule (7 players: same length, the full one doesn't face everyone)
    if (n === 7) expect(rounds).toHaveLength(7); else expect(rounds.length).toBeLessThan(n % 4 === 0 ? n - 1 : n);
    const played = [...matchesPlayed(rounds).values()];
    expect(played).toHaveLength(n);
    expect(Math.max(...played) - Math.min(...played)).toBeLessThanOrEqual(n % 4 === 0 ? 0 : 1);
    rounds.forEach(r => {
      expectValidRound(r, ids(players), Math.floor(n / 4));
      expect(r.matches).toHaveLength(Math.floor(n / 4));
    });
    const { partners, opponents } = pairCounts(rounds);
    expect(Math.max(...partners.values())).toBe(1);
    expect(opponents.size).toBe(n * (n - 1) / 2);
  });

  it.each([8, 12, 16])('full Whist %i (generateAmericanoSchedule(players, true)): partners once, opposes everyone twice', n => {
    const { partners, opponents } = pairCounts(generateAmericanoSchedule(makePlayers(n), true));
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

describe('Americano By skill (buildClassicSchedule balanced)', () => {
  it.each([8, 11, 14])('%i players: valid rounds, same round count as Classic', n => {
    seedRandom(n);
    const players = makePlayers(n, 'mixed');
    const rounds = buildClassicSchedule({ players, pairs: [], fixed: false, balanced: true }, Math.floor(n / 4));
    expect(rounds).toHaveLength(classicRoundCount(n, false, Math.floor(n / 4)));
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
  it('respects the chosen courts; who rested last round plays, then rests go to whoever played most', () => {
    seedRandom(3);
    const players = makePlayers(14);
    const rounds = packRounds(scheduleFor(14), 2, ids(players));
    const played = matchesPlayed(rounds);
    const rested = new Set(rounds[rounds.length - 1].byes);
    const round = generateAdditionalRound(players, rounds, rounds.length, 2);
    expectValidRound(round, ids(players), 2);
    expect(round.matches).toHaveLength(2);
    const playing = playersOf(round);
    // whoever rested plays (all of them if they fit in the 8 places, else the 8 places go to them)
    if (rested.size <= playing.length) round.byes.forEach(id => expect(rested.has(id)).toBe(false));
    else playing.forEach(id => expect(rested.has(id)).toBe(true));
    const others = playing.filter(id => !rested.has(id));
    if (others.length) {
      const maxPlaying = Math.max(...others.map(id => played.get(id) || 0));
      round.byes.filter(id => !rested.has(id)).forEach(id => expect(played.get(id) || 0).toBeGreaterThanOrEqual(maxPlaying));
    }
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
  it('short schedules up to 28 players; more → full schedule, still quick (40 players)', () => {
    expect(shortScheduleRounds(28)).not.toBeNull();
    expect(shortScheduleRounds(29)).toBeNull();
    const t = performance.now();
    const full = generateAmericanoSchedule(makePlayers(40));
    expect(performance.now() - t).toBeLessThan(1500);
    expect(full).toHaveLength(39);
    full.forEach(r => expectValidRound(r, ids(makePlayers(40)), 10));
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
