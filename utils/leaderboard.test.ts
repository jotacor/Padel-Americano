import { describe, expect, it } from 'vitest';
import { computeLeaderboard, pairOfEntry } from './leaderboard.ts';
import { makePlayers } from './testing.ts';
import type { Match, Tournament } from '../types.ts';

const match = (i: number, teamA: [string, string], teamB: [string, string], scoreA: number | null, scoreB: number | null): Match => ({
  id: `r0-c${i}`, roundIndex: 0, courtIndex: i, teamA, teamB, scoreA, scoreB, isCompleted: scoreA !== null && scoreB !== null,
});

const tournament = (matches: Match[], extra: Partial<Tournament> = {}): Tournament => ({
  id: 't', name: 't', players: makePlayers(8), isStarted: true, rounds: [{ index: 0, matches, byes: [] }], ...extra,
});

describe('computeLeaderboard', () => {
  it('sorts by points, then wins, then point difference; ignores unfinished matches', () => {
    const lb = computeLeaderboard(tournament([
      match(0, ['p0', 'p1'], ['p2', 'p3'], 13, 11), // p0,p1: 13 pts, 1 win, +2
      match(1, ['p4', 'p5'], ['p6', 'p7'], null, null),
    ]));
    expect(lb.slice(0, 4).map(e => e.playerId)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(lb[0]).toMatchObject({ totalPoints: 13, wins: 1, losses: 0, pointDifferential: 2, matchesPlayed: 1, avgPoints: 13 });
    expect(lb.find(e => e.playerId === 'p4')?.matchesPlayed).toBe(0);

    // Same points: more wins first; same wins: better difference first
    const tie = computeLeaderboard(tournament([
      match(0, ['p0', 'p1'], ['p2', 'p3'], 12, 12),
      match(1, ['p4', 'p5'], ['p6', 'p7'], 12, 10),
    ]));
    expect(tie.slice(0, 2).map(e => e.playerId)).toEqual(['p4', 'p5']);
  });

  it('fixed pairs: one entry per pair', () => {
    const t = tournament([match(0, ['p0', 'p1'], ['p2', 'p3'], 10, 14)], { pairMode: 'fixed', pairs: [['p0', 'p1'], ['p2', 'p3']] });
    const lb = computeLeaderboard(t);
    expect(lb.map(e => e.playerName)).toEqual(['Player 2 & Player 3', 'Player 0 & Player 1']);
    expect(pairOfEntry(t, lb[0])).toEqual(['p2', 'p3']);
  });
});

describe('ranking by average (rests, late arrivals)', () => {
  // p0+p1 play 3 matches (13-11 each); p2+p3 only one (21-3); p4..p7 two each
  const rounds = [
    { index: 0, byes: [], matches: [match(0, ['p0', 'p1'], ['p4', 'p5'], 13, 11), match(1, ['p2', 'p3'], ['p6', 'p7'], 21, 3)] },
    { index: 1, byes: [], matches: [match(0, ['p0', 'p1'], ['p4', 'p5'], 13, 11)] },
    { index: 2, byes: [], matches: [match(0, ['p0', 'p1'], ['p6', 'p7'], 13, 11)] },
  ];
  const t = (ranking?: 'total' | 'average'): Tournament => ({ id: 't', name: 't', players: makePlayers(8), isStarted: true, rounds, ...(ranking && { ranking }) });

  it('older tournaments (no ranking) keep total points', () => {
    expect(computeLeaderboard(t()).slice(0, 2).map(e => e.playerId)).toEqual(['p0', 'p1']);
  });

  it('average: qualified players (≥ half the max matches) first, by points per match', () => {
    const lb = computeLeaderboard(t('average'));
    // max 3 matches → need 2. p0,p1: 13/match; p4,p5: 22 in 2 → 11; p6,p7: 14 in 2 → 7.
    // p2,p3 scored the best average (21) but in 1 match → listed after the qualified ones
    expect(lb.map(e => [e.playerId, e.qualified])).toEqual([
      ['p0', true], ['p1', true], ['p4', true], ['p5', true], ['p6', true], ['p7', true],
      ['p2', false], ['p3', false],
    ]);
  });

  it('total: same points, wins and difference → fewer matches first', () => {
    const tie = computeLeaderboard({
      ...t('total'),
      rounds: [{ index: 0, byes: [], matches: [match(0, ['p0', 'p1'], ['p2', 'p3'], 10, 10), match(1, ['p4', 'p5'], ['p6', 'p7'], 5, 5)] },
        { index: 1, byes: [], matches: [match(0, ['p4', 'p5'], ['p6', 'p7'], 5, 5)] }],
    });
    // p0..p3: 10 pts in 1 match; p4..p7: 10 pts in 2 matches
    expect(tie.slice(0, 4).map(e => e.playerId).sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
  });
});
