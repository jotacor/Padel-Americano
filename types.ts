
export interface Player {
  id: string;
  name: string;
  skillLevel?: 'low' | 'medium' | 'high';
  isActive?: boolean;
}

export interface Match {
  id: string;
  roundIndex: number;
  courtIndex: number;
  teamA: [string, string]; // Player IDs
  teamB: [string, string]; // Player IDs
  scoreA: number | null;
  scoreB: number | null;
  isCompleted: boolean;
}

export interface Round {
  index: number;
  matches: Match[];
  byes: string[]; // Player IDs sitting out
}

export interface Tournament {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
  isStarted: boolean;
  courtNames?: string[];
  mode?: 'classic' | 'event';
  numCourts?: number;
  pairMode?: PairMode;
  pairs?: Pair[]; // fixed pairs (player IDs), only when pairMode === 'fixed'
  prioritizeSkill?: boolean; // Random + rotating: skill-balanced rounds instead of Whist rotation. League: balance by declared skill (undefined = true, legacy)
  prioritizeRanking?: boolean; // League: re-match every round by current standings (utils/ranking.ts)
  ranking?: 'total' | 'average'; // standings order (utils/leaderboard.ts); absent = total
  pointsPerMatch?: number; // matches to a fixed total (16/21/24/32): auto-fills the other score; absent = free
  createdAt?: string; // ISO; set when the tournament starts (absent on older data)
  updatedAt?: string; // ISO; stamped when saved to the library
  finishedAt?: string; // ISO; set by "Finalizar"
  exportMeta?: ExportMeta; // YAML export versioning (utils/tournamentFile.ts)
}

export interface ExportHistoryEntry {
  revision: number;
  exportedAt: string; // ISO timestamp
  roundsPlayed: number; // rounds with every match completed
  totalRounds: number;
  matchesCompleted: number;
  totalMatches: number;
  leader?: string;
  leaderPoints?: number;
}

export interface ExportMeta {
  revision: number; // bumped on every export
  history: ExportHistoryEntry[];
}

export type PairMode = 'rotating' | 'fixed';
export type Pair = [string, string];

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  totalPoints: number;
  matchesPlayed: number;
  avgPoints: number;
  wins: number;
  losses: number;
  ties: number;
  pointDifferential: number;
  qualified: boolean; // average ranking: played enough matches to rank among the rest (always true by total points)
}
