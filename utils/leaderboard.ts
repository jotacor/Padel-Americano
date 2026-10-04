import type { Tournament, LeaderboardEntry, Pair } from '../types.ts';
import { pairKey } from './fixedPairs.ts';

const sortEntries = (entries: LeaderboardEntry[]) => entries.sort((a, b) =>
  b.wins - a.wins ||
  b.totalPoints - a.totalPoints ||
  b.pointDifferential - a.pointDifferential
);

/**
 * Standings: wins → total points → point differential (the match won is what counts).
 * Fixed pairs: one entry per pair (playerId = pairKey, name "Ana & Luis").
 */
export const computeLeaderboard = (tournament: Tournament | null | undefined): LeaderboardEntry[] => {
  if (!tournament) return [];
  const stats: Record<string, LeaderboardEntry> = {};
  tournament.players.forEach(p => stats[p.id] = {
    playerId: p.id, playerName: p.name,
    totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0, pointDifferential: 0,
  });

  tournament.rounds.forEach(r => r.matches.forEach(m => {
    if (!m.isCompleted || m.scoreA === null || m.scoreB === null) return;
    const processTeam = (ids: [string, string], s: number, os: number) => ids.forEach(id => {
      const e = stats[id];
      if (!e) return;
      e.totalPoints += s;
      e.pointDifferential += s - os;
      e.matchesPlayed++;
      if (s > os) e.wins++;
      else if (s < os) e.losses++;
      else e.ties++;
    });
    processTeam(m.teamA, m.scoreA, m.scoreB);
    processTeam(m.teamB, m.scoreB, m.scoreA);
  }));

  const withAvg = (e: LeaderboardEntry): LeaderboardEntry =>
    ({ ...e, avgPoints: e.matchesPlayed ? Number((e.totalPoints / e.matchesPlayed).toFixed(1)) : 0 });

  if (tournament.pairMode === 'fixed' && tournament.pairs?.length) {
    // Partners always play together, so a pair's stats are either member's stats
    return sortEntries(tournament.pairs.filter(([a, b]) => stats[a] && stats[b]).map(([a, b]) => withAvg({
      ...stats[a],
      playerId: pairKey([a, b]),
      playerName: `${stats[a].playerName} & ${stats[b].playerName}`,
    })));
  }
  return sortEntries(Object.values(stats).map(withAvg));
};

/** The pair behind a fixed-pairs leaderboard entry */
export const pairOfEntry = (tournament: Tournament, entry: LeaderboardEntry): Pair | undefined =>
  tournament.pairs?.find(p => pairKey(p) === entry.playerId);
