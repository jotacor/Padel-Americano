
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
  scoreA: number | null; // points; best-of-3 sets: sets won
  scoreB: number | null;
  isCompleted: boolean;
  sets?: SetScore[]; // best-of-3 sets only: games per set as entered (up to 3)
}

/** Games of each team in one set, as entered (null = empty) */
export type SetScore = [number | null, number | null];

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
  mode?: 'classic' | 'event';
  numCourts?: number;
  pairMode?: PairMode;
  pairs?: Pair[]; // fixed pairs (player IDs), only when pairMode === 'fixed'
  prioritizeSkill?: boolean; // Random + rotating: skill-balanced rounds instead of Whist rotation. League: balance by declared skill (undefined = true, legacy)
  prioritizeRanking?: boolean; // League: re-match every round by current standings (utils/ranking.ts)
  pointsPerMatch?: number; // matches to a fixed total (11/15/21): auto-fills the other score
  scoring?: 'sets'; // best of 3 tennis sets (pointsPerMatch absent); neither = free scoring (older tournaments)
  createdAt?: string; // ISO; set when the tournament starts (absent on older data)
  updatedAt?: string; // ISO; reserved for server-side saving
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
}
