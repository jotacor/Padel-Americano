import type { Tournament, LeaderboardEntry, Pair } from '../types.ts';
import { pairKey } from './fixedPairs.ts';

export type RankingMode = 'total' | 'average';
/** Absent = total points (older tournaments keep their order) */
export const rankingModeOf = (t: Pick<Tournament, 'ranking'> | null | undefined): RankingMode => t?.ranking ?? 'total';

/** Average ranking: who played fewer than half the max matches is listed after everyone else */
export const minMatchesToQualify = (entries: Pick<LeaderboardEntry, 'matchesPlayed'>[]) =>
  Math.max(1, Math.ceil(Math.max(0, ...entries.map(e => e.matchesPlayed)) / 2));

const perMatch = (e: LeaderboardEntry, v: number) => e.matchesPlayed ? v / e.matchesPlayed : 0;

const sortEntries = (entries: LeaderboardEntry[], mode: RankingMode) => {
  if (mode === 'total') {
    // Points → wins → difference → fewer matches (same points in fewer matches is better)
    entries.forEach(e => { e.qualified = true; });
    return entries.sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.wins - a.wins ||
      b.pointDifferential - a.pointDifferential ||
      a.matchesPlayed - b.matchesPlayed
    );
  }
  // Average per match (fair with rests and late arrivals) → win rate (tie = ½) → difference per match → more matches
  const min = minMatchesToQualify(entries);
  entries.forEach(e => { e.qualified = e.matchesPlayed >= min; });
  return entries.sort((a, b) =>
    Number(b.qualified) - Number(a.qualified) ||
    perMatch(b, b.totalPoints) - perMatch(a, a.totalPoints) ||
    perMatch(b, b.wins + b.ties / 2) - perMatch(a, a.wins + a.ties / 2) ||
    perMatch(b, b.pointDifferential) - perMatch(a, a.pointDifferential) ||
    b.matchesPlayed - a.matchesPlayed
  );
};

/**
 * Standings in the tournament's ranking mode (see sortEntries).
 * Fixed pairs: one entry per pair (playerId = pairKey, name "Ana & Luis").
 */
export const computeLeaderboard = (tournament: Tournament | null | undefined): LeaderboardEntry[] => {
  if (!tournament) return [];
  const stats: Record<string, LeaderboardEntry> = {};
  tournament.players.forEach(p => stats[p.id] = {
    playerId: p.id, playerName: p.name,
    totalPoints: 0, matchesPlayed: 0, avgPoints: 0, wins: 0, losses: 0, ties: 0, pointDifferential: 0, qualified: true,
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
    })), rankingModeOf(tournament));
  }
  return sortEntries(Object.values(stats).map(withAvg), rankingModeOf(tournament));
};

/** The pair behind a fixed-pairs leaderboard entry */
export const pairOfEntry = (tournament: Tournament, entry: LeaderboardEntry): Pair | undefined =>
  tournament.pairs?.find(p => pairKey(p) === entry.playerId);
