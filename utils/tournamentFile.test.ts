import { describe, expect, it } from 'vitest';
import { bumpExportMeta, exportFilename, parseTournamentFile, serializeTournament, summarizeTournament } from './tournamentFile.ts';
import { generateAmericanoSchedule } from './scheduler.ts';
import { ymd } from './dates.ts';
import { makePlayers } from './testing.ts';
import type { Tournament } from '../types.ts';

const sample = (): Tournament => {
  const players = makePlayers(8, 'mixed');
  const rounds = generateAmericanoSchedule(players);
  rounds[0].matches.forEach((m, i) => { m.scoreA = 15 + i; m.scoreB = 9 - i; m.isCompleted = true; });
  return {
    id: 'tour-1', name: 'Americano - 3/10/2026', players, rounds, isStarted: true,
    mode: 'classic', pairMode: 'rotating', numCourts: 2,
  };
};

describe('YAML export/import', () => {
  it('round-trips a tournament exactly', () => {
    const t = sample();
    const parsed = parseTournamentFile(serializeTournament(t));
    expect(parsed).toEqual({ ok: true, tournament: t });
  });

  it('keeps revision history across exports (import v2 → export = v3)', () => {
    const v1 = bumpExportMeta(sample(), new Date('2026-10-03T10:00:00Z'));
    const v2 = bumpExportMeta(v1, new Date('2026-10-03T11:00:00Z'));
    const parsed = parseTournamentFile(serializeTournament(v2));
    expect(parsed.ok && parsed.tournament.exportMeta?.revision).toBe(2);
    const v3 = parsed.ok ? bumpExportMeta(parsed.tournament) : null;
    expect(v3?.exportMeta?.history.map(h => h.revision)).toEqual([1, 2, 3]);
    expect(exportFilename(v2, 'americano')).toBe(`padel-americano-${ymd()}-v2.yaml`); // automatic name: left out; local date like the app
    const named = { ...v2, name: 'Liga de los Martes', mode: 'event' as const, createdAt: new Date(2026, 9, 4, 20).toISOString() };
    expect(exportFilename(named, 'liga')).toBe('padel-liga-de-los-martes-2026-10-04-v2.yaml');
    expect(exportFilename({ ...named, name: 'Martes' }, 'liga')).toBe('padel-liga-martes-2026-10-04-v2.yaml');
  });

  it('summarizes progress', () => {
    const s = summarizeTournament(sample());
    expect(s).toMatchObject({ roundsPlayed: 1, totalRounds: 7, matchesCompleted: 2, totalMatches: 14 });
    expect(s.leader).toBeTruthy();
  });

  it.each([
    ['tooLarge', 'x'.repeat(5 * 1024 * 1024 + 1)],
    ['invalidYaml', 'format: [unclosed'],
    ['invalidYaml', 'hello: world'],
    ['unsupportedFormat', 'format: padel-americano/v9\ntournament: {}'],
  ])('rejects bad input: %s', (error, text) => {
    expect(parseTournamentFile(text)).toMatchObject({ ok: false, error });
  });

  it('rejects invalid data with a path', () => {
    const text = serializeTournament(sample()).replace(/name: Player 3/, 'name: ""');
    expect(parseTournamentFile(text)).toMatchObject({ ok: false, error: 'invalidData', detail: expect.stringContaining('players[3].name') });
    const unknown = serializeTournament(sample()).replace('teamA: [ p0', 'teamA: [ nobody');
    expect(parseTournamentFile(unknown)).toMatchObject({ ok: false, error: 'invalidData' });
  });
});
