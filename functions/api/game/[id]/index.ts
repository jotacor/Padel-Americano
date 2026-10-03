import type { Env, SharedTournament } from '../../../types';
import { TTL_SECONDS, errorResponse, readTournamentBody } from '../../../types';
import { verifySecret } from '../../../secret';

const publicView = (s: SharedTournament) => ({ id: s.id, tournament: s.tournament, createdAt: s.createdAt, expiresAt: s.expiresAt });

/** Loads the share and checks the write token: the share, or the error response */
async function authorize(request: Request, env: Env, id: string): Promise<SharedTournament | Response> {
  const secret = request.headers.get('X-Tournament-Pin');
  if (!secret) return errorResponse('PIN is required', 401);
  const data = await env.TOURNAMENTS.get(id);
  if (!data) return errorResponse('Tournament not found', 404);
  const shared: SharedTournament = JSON.parse(data);
  if (!(await verifySecret(secret, shared.pinHash))) return errorResponse('Invalid PIN', 403);
  return shared;
}

// GET /api/game/:id - Get tournament data (public)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  try {
    const data = await env.TOURNAMENTS.get(params.id as string);
    if (!data) return errorResponse('Tournament not found', 404);
    return Response.json(publicView(JSON.parse(data)));
  } catch (error) {
    console.error('Error fetching game:', error);
    return errorResponse('Failed to fetch game', 500);
  }
};

// PUT /api/game/:id - Update the tournament (organizer only); the share then lives 24 h more
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  try {
    const shared = await authorize(request, env, params.id as string);
    if (shared instanceof Response) return shared;
    const body = await readTournamentBody(request);
    if (body instanceof Response) return body;

    shared.tournament = body.tournament;
    shared.expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();
    await env.TOURNAMENTS.put(shared.id, JSON.stringify(shared), { expirationTtl: TTL_SECONDS });
    return Response.json(publicView(shared));
  } catch (error) {
    console.error('Error updating game:', error);
    return errorResponse('Failed to update game', 500);
  }
};

// DELETE /api/game/:id - Delete the share (organizer only)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  try {
    const shared = await authorize(request, env, params.id as string);
    if (shared instanceof Response) return shared;
    await env.TOURNAMENTS.delete(shared.id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    return errorResponse('Failed to delete game', 500);
  }
};
