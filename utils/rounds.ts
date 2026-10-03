import type { Tournament } from '../types.ts';

/** Round being played: first one with unfinished matches, else the last one */
export const liveRoundIndex = (t: Pick<Tournament, 'rounds'>): number => {
  const open = t.rounds.findIndex(r => r.matches.some(m => !m.isCompleted));
  return open >= 0 ? open : Math.max(0, t.rounds.length - 1);
};
