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
  it('sorts by wins, then points, then point difference; ignores unfinished matches', () => {
    const lb = computeLeaderboard(tournament([
      match(0, ['p0', 'p1'], ['p2', 'p3'], 13, 11), // p0,p1: 13 pts, 1 win, +2
      match(1, ['p4', 'p5'], ['p6', 'p7'], null, null),
    ]));
    expect(lb.slice(0, 4).map(e => e.playerId)).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(lb[0]).toMatchObject({ totalPoints: 13, wins: 1, losses: 0, pointDifferential: 2, matchesPlayed: 1, avgPoints: 13 });
    expect(lb.find(e => e.playerId === 'p4')?.matchesPlayed).toBe(0);

    // Same wins and points: better difference first
    const tie = computeLeaderboard(tournament([
      match(0, ['p0', 'p1'], ['p2', 'p3'], 12, 10),
      match(1, ['p4', 'p5'], ['p6', 'p7'], 12, 6),
    ]));
    expect(tie.slice(0, 2).map(e => e.playerId)).toEqual(['p4', 'p5']);
  });

  it('a win counts more than points: two 6-5 wins beat a 5-6 loss + an 11-0 win', () => {
    const t = tournament([]);
    t.rounds = [
      { index: 0, byes: [], matches: [match(0, ['p0', 'p1'], ['p2', 'p3'], 6, 5), match(1, ['p4', 'p5'], ['p6', 'p7'], 6, 5)] },
      { index: 1, byes: [], matches: [match(0, ['p0', 'p1'], ['p4', 'p5'], 6, 5), match(1, ['p2', 'p3'], ['p6', 'p7'], 11, 0)] },
    ];
    const lb = computeLeaderboard(t);
    expect(lb.slice(0, 4).map(e => [e.playerId, e.wins, e.totalPoints])).toEqual([
      ['p0', 2, 12], ['p1', 2, 12], ['p2', 1, 16], ['p3', 1, 16],
    ]);
  });

  it('fixed pairs: one entry per pair', () => {
    const t = tournament([match(0, ['p0', 'p1'], ['p2', 'p3'], 10, 14)], { pairMode: 'fixed', pairs: [['p0', 'p1'], ['p2', 'p3']] });
    const lb = computeLeaderboard(t);
    expect(lb.map(e => e.playerName)).toEqual(['Player 2 & Player 3', 'Player 0 & Player 1']);
    expect(pairOfEntry(t, lb[0])).toEqual(['p2', 'p3']);
  });
});
