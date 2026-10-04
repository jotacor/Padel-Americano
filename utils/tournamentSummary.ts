// Progress summary of a tournament (no YAML dependency: cheap to import anywhere).
import type { Tournament, ExportHistoryEntry } from '../types.ts';
import { computeLeaderboard } from './leaderboard.ts';

/** Progress snapshot stored in each export history entry. */
export const summarizeTournament = (t: Tournament): Omit<ExportHistoryEntry, 'revision' | 'exportedAt'> => {
  const matches = t.rounds.flatMap(r => r.matches);
  const completed = matches.filter(m => m.isCompleted).length;
  const roundsPlayed = t.rounds.filter(r => r.matches.length > 0 && r.matches.every(m => m.isCompleted)).length;
  const leader = completed ? computeLeaderboard(t)[0] : undefined;
  return {
    roundsPlayed,
    totalRounds: t.rounds.length,
    matchesCompleted: completed,
    totalMatches: matches.length,
    ...(leader && { leader: leader.playerName, leaderPoints: leader.totalPoints }),
  };
};
