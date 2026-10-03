// Tournament <-> YAML file (export/import). Pure functions, no React/DOM.
import { Document, parse, visit, isSeq, isScalar } from 'yaml';
import { Tournament, Player, Round, Match, Pair, ExportMeta, ExportHistoryEntry } from '../types.ts';
import { computeLeaderboard } from './leaderboard.ts';

export const TOURNAMENT_FILE_FORMAT = 'padel-americano/v1';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type TournamentFileErrorCode = 'tooLarge' | 'invalidYaml' | 'unsupportedFormat' | 'invalidData';
export type ParseResult =
  | { ok: true; tournament: Tournament }
  | { ok: false; error: TournamentFileErrorCode; detail?: string };

/** Progress snapshot stored in each history entry. */
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

/** New revision (previous + 1) with its history entry appended. Call once per export. */
export const bumpExportMeta = (t: Tournament, now: Date = new Date()): Tournament => {
  const revision = (t.exportMeta?.revision ?? 0) + 1;
  const entry: ExportHistoryEntry = { revision, exportedAt: now.toISOString(), ...summarizeTournament(t) };
  return { ...t, exportMeta: { revision, history: [...(t.exportMeta?.history ?? []), entry] } };
};

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'tournament';

export const exportFilename = (t: Tournament): string =>
  `padel-${slugify(t.name)}-v${t.exportMeta?.revision ?? 0}.yaml`;

/** YAML text for `t` (revision/history taken from `t.exportMeta` as-is). */
export const serializeTournament = (t: Tournament): string => {
  const { exportMeta, ...tournament } = t;
  const revision = exportMeta?.revision ?? 0;
  const history = exportMeta?.history ?? [];
  const doc = new Document({
    format: TOURNAMENT_FILE_FORMAT,
    revision,
    exportedAt: history[history.length - 1]?.exportedAt ?? null,
    history,
    tournament,
  });
  doc.commentBefore = [
    ' Padel Americano Manager — tournament export',
    ` ${t.name} · revision ${revision}`,
    ' Import it from Setup → Import to see results or keep playing.',
    ' Each export of the same tournament bumps `revision` and appends to `history`.',
  ].join('\n');
  // Short scalar lists inline: teamA: [ a, b ], byes: [], courtNames: [ ... ]
  visit(doc, { Seq(_, node) { if (isSeq(node) && node.items.every(isScalar)) node.flow = true; } });
  return doc.toString({ lineWidth: 0 });
};

// --- validation ---------------------------------------------------------------------------

const fail = (msg: string): never => { throw new Error(msg); };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, path: string): string => typeof v === 'string' && v.length > 0 ? v : fail(`${path}: expected non-empty string`);
const num = (v: unknown, path: string): number => typeof v === 'number' && Number.isFinite(v) ? v : fail(`${path}: expected number`);
const int = (v: unknown, path: string): number => Number.isInteger(v) && (v as number) >= 0 ? v as number : fail(`${path}: expected integer ≥ 0`);
const bool = (v: unknown, path: string): boolean => typeof v === 'boolean' ? v : fail(`${path}: expected true/false`);
const arr = (v: unknown, path: string): unknown[] => Array.isArray(v) ? v : fail(`${path}: expected list`);
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

const toHistoryEntry = (v: unknown, path: string): ExportHistoryEntry => {
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

const toTournament = (v: unknown, meta: ExportMeta): Tournament => {
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
    courtNames: opt(v.courtNames, (c, p) => arr(c, p).map((n, i) => typeof n === 'string' ? n : fail(`${p}[${i}]: expected string`)), 'tournament.courtNames'),
    mode: (mode ?? undefined) as Tournament['mode'],
    numCourts: opt(v.numCourts, int, 'tournament.numCourts'),
    pairMode: (pairMode ?? undefined) as Tournament['pairMode'],
    pairs: opt(v.pairs, (ps, p) => arr(ps, p).map((x, i) => pairOf(x, `${p}[${i}]`, ids)), 'tournament.pairs'),
    prioritizeSkill: opt(v.prioritizeSkill, bool, 'tournament.prioritizeSkill'),
    prioritizeRanking: opt(v.prioritizeRanking, bool, 'tournament.prioritizeRanking'),
    exportMeta: meta.revision > 0 ? meta : undefined,
  });
};

/** Parse + validate an exported file. Never throws. */
export const parseTournamentFile = (text: string): ParseResult => {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: 'tooLarge' };
  let data: unknown;
  try {
    data = parse(text, { maxAliasCount: 50 });
  } catch (e) {
    return { ok: false, error: 'invalidYaml', detail: e instanceof Error ? e.message : String(e) };
  }
  if (!isObj(data) || typeof data.format !== 'string' || !data.format.startsWith('padel-americano/')) {
    return { ok: false, error: 'invalidYaml', detail: 'not a Padel Americano export' };
  }
  if (data.format !== TOURNAMENT_FILE_FORMAT) return { ok: false, error: 'unsupportedFormat', detail: data.format };
  try {
    const meta: ExportMeta = {
      revision: int(data.revision ?? 0, 'revision'),
      history: arr(data.history ?? [], 'history').map((h, i) => toHistoryEntry(h, `history[${i}]`)),
    };
    return { ok: true, tournament: toTournament(data.tournament, meta) };
  } catch (e) {
    return { ok: false, error: 'invalidData', detail: e instanceof Error ? e.message : String(e) };
  }
};
