// Playoff to finish a tournament (every mode): semifinals + final, no 3rd-place match, everyone else rests.
// - Rotating partners: top 8 players in balanced teams 1+8, 2+7, 3+6, 4+5 → SF1 (1+8) vs (4+5), SF2 (2+7) vs (3+6)
// - Fixed pairs: top 4 pairs → SF1 1 vs 4, SF2 2 vs 3
// The final's id contains 'championship', so it is shown and scored like the quick "Ronda Final".
import type { Match, Pair, Round } from '../types.ts';
import type { TranslationKey } from '../i18n/translations.ts';

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const PLAYOFF_PLAYERS = 8;
export const PLAYOFF_PAIRS = 4;

export const isPlayoffMatch = (m: Match) => m.id.includes('-playoff-');
export const isSemifinal = (m: Match) => m.id.includes('-playoff-sf');
/** Final of either the quick "Ronda Final" or the playoff */
export const isFinal = (m: Match) => m.id.includes('championship');
export const semifinalNumber = (m: Match) => Number(m.id.match(/-playoff-sf(\d)/)?.[1] ?? 0);

const match = (id: string, roundIndex: number, courtIndex: number, teamA: Pair, teamB: Pair): Match => ({
  id, roundIndex, courtIndex, teamA, teamB, scoreA: null, scoreB: null, isCompleted: false,
});

/** The two semifinals as teams, from the standings (best first): players or pairs */
export const semifinalTeams = (ranked: string[] | Pair[]): [Pair, Pair][] | null => {
  if (typeof ranked[0] === 'string') {
    const p = ranked as string[];
    if (p.length < PLAYOFF_PLAYERS) return null;
    return [[[p[0], p[7]], [p[3], p[4]]], [[p[1], p[6]], [p[2], p[5]]]];
  }
  const pairs = ranked as Pair[];
  if (pairs.length < PLAYOFF_PAIRS) return null;
  return [[pairs[0], pairs[3]], [pairs[1], pairs[2]]];
};

/**
 * Semifinal round(s): both at once on courts 1 and 2, or one per round with a single court.
 * `pool` = everyone who could play (the rest are listed as resting).
 */
export const generatePlayoffSemifinals = (ranked: string[] | Pair[], pool: string[], firstRoundIndex: number, numCourts: number): Round[] => {
  const teams = semifinalTeams(ranked);
  if (!teams) return [];
  const perRound = numCourts >= 2 ? 2 : 1;
  const rounds: Round[] = [];
  teams.forEach(([a, b], i) => {
    const index = firstRoundIndex + Math.floor(i / perRound);
    if (!rounds[index - firstRoundIndex]) rounds.push({ index, matches: [], byes: [] });
    const round = rounds[index - firstRoundIndex];
    round.matches.push(match(`r${index}-playoff-sf${i + 1}`, index, round.matches.length, a, b));
  });
  rounds.forEach(r => {
    const playing = new Set(r.matches.flatMap(m => [...m.teamA, ...m.teamB]));
    r.byes = pool.filter(id => !playing.has(id));
  });
  return rounds;
};

const winnerOf = (m: Match): Pair | null =>
  m.isCompleted && m.scoreA !== null && m.scoreB !== null && m.scoreA !== m.scoreB ? (m.scoreA > m.scoreB ? m.teamA : m.teamB) : null;

/** Playoff progress: semifinals, and whether the final can be created (both semifinals won) */
export const playoffState = (rounds: Round[]) => {
  const matches = rounds.flatMap(r => r.matches);
  const semis = matches.filter(isSemifinal).sort((a, b) => semifinalNumber(a) - semifinalNumber(b));
  const final = matches.find(m => isPlayoffMatch(m) && isFinal(m));
  const winners = semis.map(winnerOf);
  return {
    started: semis.length > 0,
    semis,
    final,
    finalists: semis.length === 2 && winners.every(Boolean) ? (winners as [Pair, Pair]) : null,
    tiedSemi: semis.some(m => m.isCompleted && m.scoreA === m.scoreB),
  };
};

/** The final between the semifinal winners (null until both semifinals have a winner) */
export const generatePlayoffFinal = (rounds: Round[], pool: string[], roundIndex: number): Round | null => {
  const { finalists, final } = playoffState(rounds);
  if (!finalists || final) return null;
  const [a, b] = finalists;
  const playing = new Set([...a, ...b]);
  return {
    index: roundIndex,
    matches: [match(`r${roundIndex}-playoff-championship`, roundIndex, 0, a, b)],
    byes: pool.filter(id => !playing.has(id)),
  };
};

/** Match header: "Semifinal 1 · Pista 2", "Final" or the court */
export const matchTitle = (m: Match, t: T, courtLabel: (i: number) => string): string =>
  isSemifinal(m) ? `${t('playoff.semifinal', { n: semifinalNumber(m) })} · ${courtLabel(m.courtIndex)}`
  : isFinal(m) ? t('common.finals')
  : courtLabel(m.courtIndex);

/** Special round badge: "Playoff · Semifinales", "Playoff · Final", "Ronda Final", or null for a normal round */
export const roundBadge = (round: Round | undefined, t: T): string | null => {
  const ms = round?.matches ?? [];
  if (ms.some(isSemifinal)) return `${t('playoff.title')} · ${t('playoff.semifinals')}`;
  if (ms.some(m => isPlayoffMatch(m) && isFinal(m))) return `${t('playoff.title')} · ${t('common.finals')}`;
  if (ms.some(isFinal)) return t('champ.round');
  return null;
};
