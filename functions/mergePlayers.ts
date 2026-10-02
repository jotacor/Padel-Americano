import type { Player } from '../types';

/**
 * Event mode: the organizer's PUT carries a possibly stale player list, while the kiosk
 * writes players straight to KV (PATCH). KV is the source of truth for kiosk-owned data:
 * - players only in KV (added from the kiosk) are kept
 * - `isActive` comes from KV (every toggle, organizer's included, is PATCHed to KV)
 * Everything else comes from the organizer's copy.
 */
export function mergeEventPlayers(incoming: Player[], stored: Player[]): Player[] {
  const storedById = new Map(stored.map(p => [p.id, p]));
  const incomingIds = new Set(incoming.map(p => p.id));

  const merged = incoming.map(p => {
    const kv = storedById.get(p.id);
    return kv && kv.isActive !== p.isActive ? { ...p, isActive: kv.isActive } : p;
  });
  const kioskOnly = stored.filter(p => !incomingIds.has(p.id));

  return [...merged, ...kioskOnly];
}
