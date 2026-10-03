import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateRankedRound, leagueMatchmaking, playerStrengths, repeatCost } from './ranking.ts';
import { skillValue } from './scheduler.ts';
import { expectValidRound, makePlayers, matchesPlayed, pairCounts, playersOf, seedRandom } from './testing.ts';
import type { Round } from '../types.ts';

afterEach(() => vi.restoreAllMocks());

describe('leagueMatchmaking', () => {
  it('treats legacy Leagues (no flags) as skill-only', () => {
    expect(leagueMatchmaking({})).toEqual({ skill: true, ranking: false });
    expect(leagueMatchmaking({ prioritizeSkill: false, prioritizeRanking: true })).toEqual({ skill: false, ranking: true });
  });
});

describe('playerStrengths', () => {
  const players = makePlayers(8, 'mixed');
  const played: Round[] = [{
    index: 0, byes: [],
    matches: [
      { id: 'r0-c0', roundIndex: 0, courtIndex: 0, teamA: ['p0', 'p1'], teamB: ['p2', 'p3'], scoreA: 20, scoreB: 4, isCompleted: true },
      { id: 'r0-c1', roundIndex: 0, courtIndex: 1, teamA: ['p4', 'p5'], teamB: ['p6', 'p7'], scoreA: null, scoreB: null, isCompleted: false },
    ],
  }];

  it('skill only → declared skill', () => {
    const s = playerStrengths(players, played, { skill: true, ranking: false });
    players.forEach(p => expect(s.get(p.id)).toBe(skillValue(p)));
  });

  it('nothing prioritized → everyone equal', () => {
    const s = playerStrengths(players, played, { skill: false, ranking: false });
    expect(new Set(s.values())).toEqual(new Set([2]));
  });

  it('standings → winners above losers, unplayed keep the prior', () => {
    const s = playerStrengths(players, played, { skill: false, ranking: true });
    expect(s.get('p0')!).toBeGreaterThan(s.get('p2')!);
    expect(s.get('p0')).toBe(s.get('p1'));
    expect(s.get('p4')).toBe(2); // unfinished match doesn't count
  });
});

describe('repeatCost', () => {
  it('is free for first meetings and new cycles, grows with the excess, punishes recent rematches', () => {
    expect(repeatCost(0, 0, 0, Infinity, 3, 3)).toBe(0);
    expect(repeatCost(1, 1, 1, 5, 3, 3)).toBe(0);
    expect(repeatCost(2, 0, 0, 5, 3, 3)).toBeGreaterThan(repeatCost(1, 0, 0, 5, 3, 3));
    expect(repeatCost(1, 1, 1, 1, 3, 3)).toBe(3);
    expect(repeatCost(1, 1, 1, 2, 3, 3)).toBe(1.5);
  });
});

describe('generateRankedRound', () => {
  it.each([[12, 3], [14, 3], [16, 4], [10, 2]])('%i players, %i courts over 10 rounds: valid, fair rests, varied partners', (n, courts) => {
    seedRandom(n + courts);
    const players = makePlayers(n, 'mixed');
    const rounds: Round[] = [];
    for (let r = 0; r < 10; r++) {
      const played = matchesPlayed(rounds);
      // Fake results so standings move
      const strengths = playerStrengths(players, rounds, { skill: true, ranking: true });
      const round = generateRankedRound(players, players, rounds, r, courts, id => strengths.get(id)!);
      expectValidRound(round, players.map(p => p.id), courts);
      expect(round.matches).toHaveLength(Math.min(courts, Math.floor(n / 4)));
      const maxPlaying = Math.max(...playersOf(round).map(id => played.get(id) || 0));
      round.byes.forEach(id => expect(played.get(id) || 0).toBeGreaterThanOrEqual(maxPlaying));
      round.matches.forEach((m, i) => { m.scoreA = 12 + i; m.scoreB = 12 - i; m.isCompleted = true; });
      rounds.push(round);
    }
    // Partners still rotate: no pair together more than twice in 10 rounds
    expect(Math.max(...pairCounts(rounds).partners.values())).toBeLessThanOrEqual(2);
  });
});

describe('generateRankedRound: rests', () => {
  it('fewer courts than players: whoever played most rests, rounds stay valid', () => {
    seedRandom(5);
    const players = makePlayers(14, 'mixed');
    const pool = players.map(p => p.id);
    const rounds: Round[] = [];
    for (let i = 0; i < 6; i++) {
      const played = matchesPlayed(rounds);
      const round = generateRankedRound(players, players, rounds, i, 3, () => 2);
      expectValidRound(round, pool, 3);
      expect(round.matches).toHaveLength(3);
      const maxPlaying = Math.max(...playersOf(round).map(id => played.get(id) || 0));
      round.byes.forEach(id => expect(played.get(id) || 0).toBeGreaterThanOrEqual(maxPlaying));
      rounds.push(round);
    }
    const counts = [...matchesPlayed(rounds).values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});
