import { describe, expect, it } from 'vitest';
import { validateTournament } from './tournamentSchema.ts';
import { parseTournamentFile, serializeTournament } from './tournamentFile.ts';
import { makePlayers } from './testing.ts';
import type { Tournament } from '../types.ts';

const base = (): Tournament => ({ id: 't', name: 'Liga', players: makePlayers(4), rounds: [], isStarted: true, mode: 'event' });

describe('validateTournament', () => {
  it('keeps the dates and an embedded revision history (library/server JSON)', () => {
    const t: Tournament = {
      ...base(),
      createdAt: '2026-10-03T10:00:00.000Z', updatedAt: '2026-10-03T12:00:00.000Z', finishedAt: '2026-10-03T13:00:00.000Z',
      exportMeta: { revision: 2, history: [{ revision: 1, exportedAt: '2026-10-03T11:00:00.000Z', roundsPlayed: 0, totalRounds: 0, matchesCompleted: 0, totalMatches: 0 }] },
    };
    expect(validateTournament(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });

  it('drops unknown keys and rejects bad dates', () => {
    expect(validateTournament({ ...base(), color: 'red' })).toEqual(base());
    expect(() => validateTournament({ ...base(), finishedAt: 'ayer' })).toThrow('tournament.finishedAt: expected ISO date');
  });

  it('the dates survive a YAML round trip', () => {
    const t = { ...base(), createdAt: '2026-10-03T10:00:00.000Z', finishedAt: '2026-10-03T13:00:00.000Z' };
    expect(parseTournamentFile(serializeTournament(t))).toEqual({ ok: true, tournament: t });
  });
});
