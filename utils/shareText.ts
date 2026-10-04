// Plain-text messages to copy (round line-up, standings): "ANA-LUIS vs MARTA-JUAN". Pure: translations are passed in.
import type { LeaderboardEntry, Tournament } from '../types.ts';
import type { TranslationKey } from '../i18n/translations.ts';
import { isFinal, isPlayoffMatch, matchTitle } from './playoff.ts';
import { formatDiff } from './leaderboard.ts';

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;
interface Ctx { t: T; courtLabel: (index: number) => string; locale: string }

const nameOf = (t: Tournament, id: string) => (t.players.find(p => p.id === id)?.name ?? '?').toLocaleUpperCase('es');

export const roundText = (tournament: Tournament, roundIndex: number, { t, courtLabel }: Ctx): string => {
  const round = tournament.rounds[roundIndex];
  if (!round) return '';
  const pair = (ids: [string, string]) => t('text.pair', { a: nameOf(tournament, ids[0]), b: nameOf(tournament, ids[1]) });
  const title = [
    `🎾 ${tournament.name}`,
    t('text.round', { n: roundIndex + 1, total: tournament.rounds.length }),
    ...(tournament.pointsPerMatch ? [t('rounds.toPoints', { n: tournament.pointsPerMatch })] : []),
  ].join(' · ');
  const matches = [...round.matches].sort((a, b) => a.courtIndex - b.courtIndex).map(m => {
    const court = isFinal(m) || isPlayoffMatch(m) ? `🏆 ${matchTitle(m, t, courtLabel)}` : courtLabel(m.courtIndex);
    const score = m.isCompleted ? ` (${m.scoreA}-${m.scoreB})` : '';
    return `${court}: ${pair(m.teamA)} ${t('common.vs').toLowerCase()} ${pair(m.teamB)}${score}`;
  });
  const resting = round.byes.length ? [t('text.resting', { names: round.byes.map(id => nameOf(tournament, id)).join(', ') })] : [];
  return [title, ...matches, ...resting].join('\n');
};

export const standingsText = (tournament: Tournament, leaderboard: LeaderboardEntry[], { t }: Ctx, liveUrl?: string): string => {
  const lines = leaderboard.filter(e => e.matchesPlayed > 0).map((e, i) => `${i + 1}. ${e.playerName.toLocaleUpperCase('es')} — ${t('text.standingsLine', { wins: e.wins, pts: e.totalPoints, diff: formatDiff(e.pointDifferential) })}`);
  return [
    `🏆 ${tournament.name} · ${t('common.standings')}`,
    ...lines,
    ...(liveUrl ? ['', t('text.live', { url: liveUrl })] : []),
  ].join('\n');
};
