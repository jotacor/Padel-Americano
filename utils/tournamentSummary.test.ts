import { describe, expect, it } from 'vitest';
import { championsOf, describeTournament, tournamentStatus } from './tournamentSummary.ts';
import { makePlayers } from './testing.ts';
import type { Tournament } from '../types.ts';

const withFinal = (scoreA: number, scoreB: number): Tournament => ({
  id: 't', name: 'Americano', players: makePlayers(8), isStarted: true, mode: 'classic', pairMode: 'rotating',
  rounds: [{ index: 0, byes: [], matches: [{ id: 'r0-championship', roundIndex: 0, courtIndex: 0, teamA: ['p0', 'p2'], teamB: ['p1', 'p3'], scoreA, scoreB, isCompleted: true }] }],
});

describe('tournament summary', () => {
  it('names the champions of a completed final', () => {
    expect(championsOf(withFinal(21, 15))).toBe('Player 0 & Player 2');
    expect(championsOf(withFinal(10, 21))).toBe('Player 1 & Player 3');
    expect(championsOf(withFinal(12, 12))).toBeUndefined();
  });

  it('describes progress, leader and dates', () => {
    const s = describeTournament({ ...withFinal(21, 15), createdAt: '2026-10-03T10:00:00.000Z' });
    expect(s).toMatchObject({ name: 'Americano', mode: 'classic', players: 8, roundsPlayed: 1, totalRounds: 1, matchesCompleted: 1, totalMatches: 1, champions: 'Player 0 & Player 2', createdAt: '2026-10-03T10:00:00.000Z' });
    expect(s.leader).toBeTruthy();
  });

  it('derives the status: open > finished (closed or final played) > unfinished', () => {
    expect(tournamentStatus({}, true)).toBe('open');
    expect(tournamentStatus({ finishedAt: '2026-10-03T10:00:00.000Z' }, false)).toBe('finished');
    expect(tournamentStatus({ champions: 'A & B' }, false)).toBe('finished');
    expect(tournamentStatus({}, false)).toBe('unfinished');
  });
});
