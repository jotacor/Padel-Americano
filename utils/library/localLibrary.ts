// Saved tournaments on this device (IndexedDB). The open tournament stays in localStorage
// (`padel_tournament`, synchronous at startup) and is mirrored here by the autosave.
import type { Tournament } from '../../types.ts';
import { describeTournament, type TournamentSummary } from '../tournamentSummary.ts';
import { DATA, META, idbGet, idbGetAll, idbWrite } from './idb.ts';

export interface LibraryEntry {
  id: string;
  summary: TournamentSummary;
  savedAt: string; // ISO
}

// --- change notifications (this tab + other tabs) ---
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('padel-library') : null;
channel?.addEventListener('message', () => listeners.forEach(l => l()));
const notify = () => {
  listeners.forEach(l => l());
  channel?.postMessage('changed');
};
export const onLibraryChange = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

// Last write error (storage full / unavailable), shown by the Tournaments tab
let saveError: unknown = null;
export const librarySaveError = () => saveError;

export const listTournaments = async (): Promise<LibraryEntry[]> =>
  (await idbGetAll<LibraryEntry>(META)).sort((a, b) => b.savedAt.localeCompare(a.savedAt));

export const getTournament = (id: string) => idbGet<Tournament>(DATA, id);

// Writes run one after another, so a late autosave can't bring back a deleted tournament
let queue: Promise<unknown> = Promise.resolve();
const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
};
const deleted = new Set<string>();
let persistRequested = false;

/** Save (insert or replace); stamps `updatedAt` */
export const saveTournament = (t: Tournament): Promise<LibraryEntry> => enqueue(async () => {
  deleted.delete(t.id);
  const now = new Date().toISOString();
  const saved: Tournament = { ...t, updatedAt: now };
  const entry: LibraryEntry = { id: t.id, summary: describeTournament(saved), savedAt: now };
  try {
    await idbWrite((meta, data) => {
      meta.put(entry);
      data.put(saved, t.id);
    });
    saveError = null;
  } catch (e) {
    saveError = e;
    notify();
    throw e;
  }
  if (!persistRequested) {
    persistRequested = true;
    // Ask the browser not to evict our data (Safari wipes site storage after 7 days without visits otherwise)
    navigator.storage?.persist?.().catch(() => undefined);
  }
  notify();
  return entry;
});

export const removeTournament = (id: string): Promise<void> => enqueue(async () => {
  deleted.add(id);
  if (pending?.id === id) cancelAutosave();
  await idbWrite((meta, data) => {
    meta.delete(id);
    data.delete(id);
  });
  notify();
});

// --- autosave of the open tournament ---
const AUTOSAVE_MS = 800;
let pending: Tournament | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export const autosave = (t: Tournament) => {
  pending = t;
  clearTimeout(timer);
  timer = setTimeout(() => { flushAutosave().catch(() => undefined); }, AUTOSAVE_MS);
};

/** Write the pending autosave now (before switching, finishing, leaving the page…) */
export const flushAutosave = async (): Promise<void> => {
  clearTimeout(timer);
  const t = pending;
  pending = null;
  if (t && !deleted.has(t.id)) await saveTournament(t);
  else await queue;
};

export const cancelAutosave = () => {
  clearTimeout(timer);
  pending = null;
};
