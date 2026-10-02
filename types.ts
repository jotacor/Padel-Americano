
export interface Player {
  id: string;
  name: string;
  nickname?: string;
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
  prioritizeSkill?: boolean; // Random + rotating: skill-balanced rounds instead of Whist rotation
}

export type PairMode = 'rotating' | 'fixed';
export type Pair = [string, string];

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerNickname?: string;
  totalPoints: number;
  matchesPlayed: number;
  avgPoints: number;
  wins: number;
  losses: number;
  ties: number;
  pointDifferential: number;
}
