import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { planImport, tournamentFingerprint } from './planImport.ts';
import { readImportFiles, zipTournaments } from './bundle.ts';
import { parseTournamentFile, serializeTournament } from '../tournamentFile.ts';
import { makePlayers } from '../testing.ts';
import type { Tournament } from '../../types.ts';

const tournament = (id: string, name = id, extra: Partial<Tournament> = {}): Tournament =>
  ({ id, name, players: makePlayers(4), rounds: [], isStarted: true, mode: 'classic', ...extra });

describe('planImport', () => {
  it('adds new ones, skips identical ones, copies changed ones (never overwrites)', () => {
    const saved = new Map([['a', tournament('a', 'Liga', { updatedAt: '2026-10-01T00:00:00.000Z' })], ['b', tournament('b')]]);
    let n = 0;
    const actions = planImport(
      [tournament('a', 'Liga'), tournament('b', 'Cambiado'), tournament('c'), tournament('c')],
      saved, () => `new-${++n}`, ' (copia)',
    );
    expect(actions.map(a => a.kind)).toEqual(['skip', 'copy', 'add', 'skip']);
    expect(actions[1].tournament).toMatchObject({ id: 'new-1', name: 'Cambiado (copia)' });
  });

  it('fingerprint ignores key order, updatedAt and export history', () => {
    const a = tournament('x');
    const b = { mode: 'classic', isStarted: true, rounds: [], players: makePlayers(4), name: 'x', id: 'x', updatedAt: 'now', exportMeta: { revision: 3, history: [] } } as Tournament;
    expect(tournamentFingerprint(a)).toBe(tournamentFingerprint(b));
  });
});

describe('zip bundles', () => {
  it('export all → import all gives the same tournaments', async () => {
    const list = [tournament('t1', 'Liga martes'), tournament('t2', 'Americano jueves')];
    const blob = await zipTournaments(list, serializeTournament);
    const { files, errors } = await readImportFiles([new File([blob], 'backup.zip')]);
    expect(errors).toEqual([]);
    const parsed = files.map(f => parseTournamentFile(f.text)).map(r => (r.ok ? r.tournament : null));
    expect(parsed.sort((x, y) => x!.id.localeCompare(y!.id))).toEqual(list);
  });

  it('ignores non-YAML entries and rejects oversized ones', async () => {
    const zip = zipSync({
      'notes.txt': strToU8('hola'),
      '.hidden.yaml': strToU8('x'),
      'big.yaml': new Uint8Array(5 * 1024 * 1024 + 1),
      'ok.yml': strToU8(serializeTournament(tournament('ok'))),
    });
    const { files, errors } = await readImportFiles([new File([zip], 'mix.zip'), new File(['plain'], 'readme.md')]);
    expect(files.map(f => f.name)).toEqual(['mix.zip/ok.yml']);
    expect(errors).toEqual([{ name: 'mix.zip/big.yaml', detail: 'tooLarge' }]);
  });
});
