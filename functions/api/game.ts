import type { Env, SharedTournament, CreateGameResponse } from '../types';
import { generateId, TTL_SECONDS, errorResponse, readTournamentBody } from '../types';
import { generateToken, hashSecret } from '../secret';

const ID_ATTEMPTS = 5;

// Unused word-word ID; after ID_ATTEMPTS collisions, fall back to word-word-N
async function generateUniqueId(kv: KVNamespace): Promise<string> {
  for (let i = 0; i < ID_ATTEMPTS * 2; i++) {
    const id = generateId(i >= ID_ATTEMPTS);
    if ((await kv.get(id)) === null) return id;
  }
  throw new Error('Could not generate a unique game ID');
}

// POST /api/game - Create a new shared tournament
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await readTournamentBody(request);
    if (body instanceof Response) return body;

    const id = await generateUniqueId(env.TOURNAMENTS);
    const token = generateToken();
    const now = new Date();

    const sharedTournament: SharedTournament = {
      id,
      pinHash: await hashSecret(token),
      tournament: body.tournament,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + TTL_SECONDS * 1000).toISOString(),
    };

    await env.TOURNAMENTS.put(id, JSON.stringify(sharedTournament), { expirationTtl: TTL_SECONDS });

    const response: CreateGameResponse = { id, pin: token, shareUrl: `/game/${id}` };
    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating game:', error);
    return errorResponse('Failed to create game', 500);
  }
};
