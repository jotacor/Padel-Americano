// Tournament <-> YAML file (export/import). Pure functions, no React/DOM.
import { Document, parse, visit, isSeq, isScalar } from 'yaml';
import type { Tournament, ExportHistoryEntry } from '../types.ts';
import { isObj, toExportMeta, validateTournament } from './tournamentSchema.ts';
import { summarizeTournament } from './tournamentSummary.ts';

export { summarizeTournament };

export const TOURNAMENT_FILE_FORMAT = 'padel-americano/v1';
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type TournamentFileErrorCode = 'tooLarge' | 'invalidYaml' | 'unsupportedFormat' | 'invalidData';
export type ParseResult =
  | { ok: true; tournament: Tournament }
  | { ok: false; error: TournamentFileErrorCode; detail?: string };

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
    const meta = toExportMeta({ revision: data.revision, history: data.history }, 'file');
    return { ok: true, tournament: validateTournament(data.tournament, meta) };
  } catch (e) {
    return { ok: false, error: 'invalidData', detail: e instanceof Error ? e.message : String(e) };
  }
};
