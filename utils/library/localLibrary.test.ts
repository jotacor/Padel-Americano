import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { autosave, flushAutosave, getTournament, listTournaments, removeTournament, saveTournament } from './localLibrary.ts';
import { makePlayers } from '../testing.ts';
import type { Tournament } from '../../types.ts';

const tournament = (id: string, name = id): Tournament => ({ id, name, players: makePlayers(4), rounds: [], isStarted: true, mode: 'classic' });

afterEach(async () => {
  for (const e of await listTournaments()) await removeTournament(e.id);
});

describe('saved tournaments (IndexedDB)', () => {
  it('saves, lists newest first with a summary, and loads', async () => {
    await saveTournament(tournament('a', 'Liga martes'));
    await saveTournament(tournament('b', 'Americano'));
    const list = await listTournaments();
    expect(list.map(e => e.id)).toEqual(['b', 'a']);
    expect(list[1].summary).toMatchObject({ name: 'Liga martes', mode: 'classic', players: 4, totalMatches: 0 });
    const loaded = await getTournament('a');
    expect(loaded?.name).toBe('Liga martes');
    expect(loaded?.updatedAt).toBeTruthy();
  });

  it('autosave waits, then writes the latest version', async () => {
    autosave(tournament('x', 'v1'));
    autosave(tournament('x', 'v2'));
    expect(await listTournaments()).toHaveLength(0);
    await flushAutosave();
    expect((await getTournament('x'))?.name).toBe('v2');
  });

  it('a pending autosave cannot bring back a deleted tournament', async () => {
    await saveTournament(tournament('d'));
    autosave(tournament('d', 'late edit'));
    await removeTournament('d');
    await flushAutosave();
    expect(await getTournament('d')).toBeUndefined();
    expect(await listTournaments()).toHaveLength(0);
  });

  it('an explicit save after deleting restores it (e.g. import)', async () => {
    await saveTournament(tournament('e'));
    await removeTournament('e');
    await saveTournament(tournament('e', 'again'));
    expect((await getTournament('e'))?.name).toBe('again');
  });
});
