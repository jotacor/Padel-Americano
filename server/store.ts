// Shared tournaments on disk: one JSON file per share in <dataDir>/shares, expiring 24 h after the last update.
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Tournament } from '../types.ts';

export const TTL_MS = 24 * 60 * 60 * 1000;

export interface SharedTournament {
  id: string;
  pinHash: string; // 'sha256:<hex>' of the write token (legacy: 32-bit hash of a 4-digit PIN)
  tournament: Tournament;
  createdAt: string;
  expiresAt: string;
}

// Share ids are word-word(-N) (old ones: 6 alphanumerics); anything else never touches the disk
const VALID_ID = /^[a-z0-9]+(?:-[a-z0-9]+){0,2}$/i;
export const isValidId = (id: string) => id.length <= 64 && VALID_ID.test(id);

export const createStore = (dataDir: string, now: () => number = Date.now) => {
  const dir = path.join(dataDir, 'shares');
  const file = (id: string) => path.join(dir, `${id}.json`);
  const ready = mkdir(dir, { recursive: true });

  const get = async (id: string): Promise<SharedTournament | null> => {
    if (!isValidId(id)) return null;
    await ready;
    try {
      const share = JSON.parse(await readFile(file(id), 'utf8')) as SharedTournament;
      if (Date.parse(share.expiresAt) <= now()) {
        await rm(file(id), { force: true });
        return null;
      }
      return share;
    } catch {
      return null; // missing or unreadable
    }
  };

  /** Atomic write (temp file + rename) so a crash never leaves half a file */
  const put = async (share: SharedTournament): Promise<void> => {
    await ready;
    const tmp = `${file(share.id)}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(share));
    await rename(tmp, file(share.id));
  };

  const remove = async (id: string): Promise<void> => {
    if (isValidId(id)) await rm(file(id), { force: true });
  };

  /** Delete expired (and unreadable) shares; run periodically */
  const sweep = async (): Promise<number> => {
    await ready;
    let removed = 0;
    for (const name of await readdir(dir)) {
      if (!name.endsWith('.json')) continue;
      try {
        const share = JSON.parse(await readFile(path.join(dir, name), 'utf8')) as SharedTournament;
        if (Date.parse(share.expiresAt) > now()) continue;
      } catch {
        // unreadable → remove too
      }
      await rm(path.join(dir, name), { force: true });
      removed++;
    }
    return removed;
  };

  return { get, put, remove, sweep, exists: async (id: string) => (await get(id)) !== null };
};

export type Store = ReturnType<typeof createStore>;
