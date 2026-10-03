import type { Tournament } from '../types';
import { randomWordId } from './words';

export interface Env {
  TOURNAMENTS: KVNamespace;
}

export interface SharedTournament {
  id: string;
  pinHash: string; // 'sha256:<hex>' of the write token (legacy: 32-bit hash of a 4-digit PIN)
  tournament: Tournament;
  createdAt: string;
  expiresAt: string;
}

export interface CreateGameResponse {
  id: string;
  pin: string; // write token, sent back as X-Tournament-Pin (name kept for compatibility)
  shareUrl: string;
}

export interface ErrorResponse {
  error: string;
}

// Memorable share ID: two Spanish words (`bala-zapato`), optional numeric suffix on collision fallback.
// Old 6-char alphanumeric IDs stay valid: routes/KV treat the ID as an opaque string.
export function generateId(withNumber = false): string {
  return randomWordId(withNumber);
}

// Shares live 24 h after their last update
export const TTL_SECONDS = 24 * 60 * 60;

export const MAX_BODY_BYTES = 512 * 1024;

export const errorResponse = (error: string, status: number) => Response.json({ error } as ErrorResponse, { status });

/** `{ tournament }` request body: 413 if too big, 400 if malformed */
export async function readTournamentBody(request: Request): Promise<{ tournament: Tournament } | Response> {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) return errorResponse('Tournament too large', 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return errorResponse('Tournament too large', 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse('Invalid JSON', 400);
  }
  const tournament = (body as { tournament?: Tournament } | null)?.tournament;
  if (!tournament || !Array.isArray(tournament.players) || !Array.isArray(tournament.rounds)) {
    return errorResponse('Tournament data is required', 400);
  }
  return { tournament };
}
