// Tournament shape validation, shared by YAML import and (later) the server.
// Pure functions, no dependencies: throws Error("<path>: <problem>") on invalid data.
import type { Tournament, Player, Round, Match, Pair, ExportMeta, ExportHistoryEntry } from '../types.ts';

export const fail = (msg: string): never => { throw new Error(msg); };
export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, path: string): string => typeof v === 'string' && v.length > 0 ? v : fail(`${path}: expected non-empty string`);
const num = (v: unknown, path: string): number => typeof v === 'number' && Number.isFinite(v) ? v : fail(`${path}: expected number`);
export const int = (v: unknown, path: string): number => Number.isInteger(v) && (v as number) >= 0 ? v as number : fail(`${path}: expected integer ≥ 0`);
const bool = (v: unknown, path: string): boolean => typeof v === 'boolean' ? v : fail(`${path}: expected true/false`);
export const iso = (v: unknown, path: string): string =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fail(`${path}: expected ISO date`);
export const arr = (v: unknown, path: string): unknown[] => Array.isArray(v) ? v : fail(`${path}: expected list`);
const opt = <T>(v: unknown, f: (v: unknown, path: string) => T, path: string): T | undefined =>
  v === undefined || v === null ? undefined : f(v, path);
const pairOf = (v: unknown, path: string, ids: Set<string>): Pair => {
  const a = arr(v, path);
  if (a.length !== 2) fail(`${path}: expected 2 player ids`);
  const pair = a.map((id, i) => str(id, `${path}[${i}]`)) as Pair;
  pair.forEach((id, i) => { if (!ids.has(id)) fail(`${path}[${i}]: unknown player "${id}"`); });
  return pair;
};
/** Copy only defined optional fields so a round-trip keeps the exact shape. */
const defined = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

const toPlayer = (v: unknown, path: string): Player => {
  if (!isObj(v)) return fail(`${path}: expected player`);
  const skill = v.skillLevel;
  if (skill != null && skill !== 'low' && skill !== 'medium' && skill !== 'high') fail(`${path}.skillLevel: expected low/medium/high`);
  return defined({
    id: str(v.id, `${path}.id`),
    name: str(v.name, `${path}.name`),
    skillLevel: (skill ?? undefined) as Player['skillLevel'],
    isActive: opt(v.isActive, bool, `${path}.isActive`),
  });
};

const toScore = (v: unknown, path: string): number | null => v === null || v === undefined ? null : num(v, path);

const toMatch = (v: unknown, path: string, ids: Set<string>): Match => {
  if (!isObj(v)) return fail(`${path}: expected match`);
  return {
    id: str(v.id, `${path}.id`),
    roundIndex: int(v.roundIndex, `${path}.roundIndex`),
    courtIndex: int(v.courtIndex, `${path}.courtIndex`),
    teamA: pairOf(v.teamA, `${path}.teamA`, ids),
    teamB: pairOf(v.teamB, `${path}.teamB`, ids),
    scoreA: toScore(v.scoreA, `${path}.scoreA`),
    scoreB: toScore(v.scoreB, `${path}.scoreB`),
    isCompleted: bool(v.isCompleted, `${path}.isCompleted`),
  };
};

const toRound = (v: unknown, path: string, ids: Set<string>): Round => {
  if (!isObj(v)) return fail(`${path}: expected round`);
  return {
    index: int(v.index, `${path}.index`),
    matches: arr(v.matches, `${path}.matches`).map((m, i) => toMatch(m, `${path}.matches[${i}]`, ids)),
    byes: arr(v.byes ?? [], `${path}.byes`).map((id, i) => str(id, `${path}.byes[${i}]`)),
  };
};

export const toHistoryEntry = (v: unknown, path: string): ExportHistoryEntry => {
  if (!isObj(v)) return fail(`${path}: expected history entry`);
  return defined({
    revision: int(v.revision, `${path}.revision`),
    exportedAt: str(v.exportedAt, `${path}.exportedAt`),
    roundsPlayed: int(v.roundsPlayed ?? 0, `${path}.roundsPlayed`),
    totalRounds: int(v.totalRounds ?? 0, `${path}.totalRounds`),
    matchesCompleted: int(v.matchesCompleted ?? 0, `${path}.matchesCompleted`),
    totalMatches: int(v.totalMatches ?? 0, `${path}.totalMatches`),
    leader: opt(v.leader, str, `${path}.leader`),
    leaderPoints: opt(v.leaderPoints, num, `${path}.leaderPoints`),
  });
};

/** Revision history: from a YAML file's top level, or embedded as `tournament.exportMeta` */
export const toExportMeta = (v: unknown, path: string): ExportMeta => {
  const o = isObj(v) ? v : {};
  return {
    revision: int(o.revision ?? 0, `${path}.revision`),
    history: arr(o.history ?? [], `${path}.history`).map((h, i) => toHistoryEntry(h, `${path}.history[${i}]`)),
  };
};

/**
 * Validated copy of a tournament (unknown keys dropped). `meta` = revision history kept outside
 * the tournament (YAML files); otherwise an embedded `exportMeta` is validated and kept.
 */
export const validateTournament = (v: unknown, meta?: ExportMeta): Tournament => {
  if (!isObj(v)) return fail('tournament: missing');
  const players = arr(v.players, 'tournament.players').map((p, i) => toPlayer(p, `tournament.players[${i}]`));
  if (players.length < 4) fail('tournament.players: need at least 4');
  const ids = new Set(players.map(p => p.id));
  if (ids.size !== players.length) fail('tournament.players: duplicate ids');
  const mode = v.mode;
  if (mode != null && mode !== 'classic' && mode !== 'event') fail('tournament.mode: expected classic/event');
  const pairMode = v.pairMode;
  if (pairMode != null && pairMode !== 'rotating' && pairMode !== 'fixed') fail('tournament.pairMode: expected rotating/fixed');
  return defined({
    id: str(v.id, 'tournament.id'),
    name: str(v.name, 'tournament.name'),
    players,
    rounds: arr(v.rounds, 'tournament.rounds').map((r, i) => toRound(r, `tournament.rounds[${i}]`, ids)),
    isStarted: opt(v.isStarted, bool, 'tournament.isStarted') ?? true,
    mode: (mode ?? undefined) as Tournament['mode'],
    numCourts: opt(v.numCourts, int, 'tournament.numCourts'),
    pairMode: (pairMode ?? undefined) as Tournament['pairMode'],
    pairs: opt(v.pairs, (ps, p) => arr(ps, p).map((x, i) => pairOf(x, `${p}[${i}]`, ids)), 'tournament.pairs'),
    prioritizeSkill: opt(v.prioritizeSkill, bool, 'tournament.prioritizeSkill'),
    prioritizeRanking: opt(v.prioritizeRanking, bool, 'tournament.prioritizeRanking'),
    pointsPerMatch: opt(v.pointsPerMatch, (n, path) => int(n, path) >= 1 ? n as number : fail(`${path}: expected integer ≥ 1`), 'tournament.pointsPerMatch'),
    createdAt: opt(v.createdAt, iso, 'tournament.createdAt'),
    updatedAt: opt(v.updatedAt, iso, 'tournament.updatedAt'),
    finishedAt: opt(v.finishedAt, iso, 'tournament.finishedAt'),
    exportMeta: (() => {
      const m = meta ?? toExportMeta(v.exportMeta, 'tournament.exportMeta');
      return m.revision > 0 ? m : undefined;
    })(),
  });
};

