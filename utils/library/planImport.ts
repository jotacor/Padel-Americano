// What to do with each tournament of a multi-file import (pure: easy to test).
import type { Tournament } from '../../types.ts';

export type ImportAction =
  | { kind: 'add'; tournament: Tournament }
  | { kind: 'copy'; tournament: Tournament } // same id, different content → new id, never overwrite
  | { kind: 'skip'; tournament: Tournament }; // already saved, identical

/** JSON with sorted keys, ignoring fields that change without the tournament changing */
export const tournamentFingerprint = (t: Tournament): string => {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined).map(k => [k, sort((v as Record<string, unknown>)[k])]))
      : v;
  const { updatedAt: _u, exportMeta: _e, ...rest } = t;
  return JSON.stringify(sort(rest));
};

export const planImport = (
  incoming: Tournament[],
  existing: Map<string, Tournament>,
  newId: () => string,
  copySuffix: string,
): ImportAction[] => {
  const known = new Map(existing);
  return incoming.map(t => {
    const saved = known.get(t.id);
    if (!saved) {
      known.set(t.id, t);
      return { kind: 'add', tournament: t };
    }
    if (tournamentFingerprint(saved) === tournamentFingerprint(t)) return { kind: 'skip', tournament: t };
    const copy = { ...t, id: newId(), name: t.name + copySuffix };
    known.set(copy.id, copy);
    return { kind: 'copy', tournament: copy };
  });
};
