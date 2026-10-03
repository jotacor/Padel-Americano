// Progress summary of a tournament (no YAML dependency: cheap to import anywhere).
import type { Tournament, ExportHistoryEntry, PairMode } from '../types.ts';
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

/** What the saved-tournaments list shows for each tournament (stored next to it, so listing never loads full data) */
export interface TournamentSummary extends Omit<ExportHistoryEntry, 'revision' | 'exportedAt'> {
  name: string;
  mode: 'classic' | 'event';
  pairMode: PairMode;
  players: number;
  pairs?: number;
  courts?: number;
  champions?: string; // winners of a completed final
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
}

/** Winners of the completed final ("Ana & Luis"), if any */
export const championsOf = (t: Tournament): string | undefined => {
  const final = t.rounds.flatMap(r => r.matches).find(m => m.id.includes('championship') && m.isCompleted);
  if (!final || final.scoreA === null || final.scoreB === null || final.scoreA === final.scoreB) return undefined;
  const team = final.scoreA > final.scoreB ? final.teamA : final.teamB;
  return team.map(id => t.players.find(p => p.id === id)?.name ?? '?').join(' & ');
};

export const describeTournament = (t: Tournament): TournamentSummary => {
  const champions = championsOf(t);
  return {
    name: t.name,
    mode: t.mode ?? 'classic',
    pairMode: t.pairMode ?? 'rotating',
    players: t.players.length,
    ...(t.pairMode === 'fixed' && { pairs: t.pairs?.length ?? 0 }),
    ...(t.numCourts !== undefined && { courts: t.numCourts }),
    ...summarizeTournament(t),
    ...(champions && { champions }),
    ...(t.createdAt && { createdAt: t.createdAt }),
    ...(t.updatedAt && { updatedAt: t.updatedAt }),
    ...(t.finishedAt && { finishedAt: t.finishedAt }),
  };
};

export type TournamentStatus = 'open' | 'unfinished' | 'finished';

/** Never stored: the open one is "in progress"; finished = closed by the organizer or final played */
export const tournamentStatus = (s: Pick<TournamentSummary, 'finishedAt' | 'champions'>, isOpen: boolean): TournamentStatus =>
  isOpen ? 'open' : s.finishedAt || s.champions ? 'finished' : 'unfinished';
