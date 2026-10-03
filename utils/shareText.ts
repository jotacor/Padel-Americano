// Plain-text messages to paste in WhatsApp (round line-up, standings). Pure: translations are passed in.
import type { LeaderboardEntry, Tournament } from '../types.ts';
import type { TranslationKey } from '../i18n/translations.ts';
import { rankingModeOf } from './leaderboard.ts';

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;
interface Ctx { t: T; courtName: (name: string | undefined, index: number) => string; locale: string }

const nameOf = (t: Tournament, id: string) => t.players.find(p => p.id === id)?.name ?? '?';

export const roundText = (tournament: Tournament, roundIndex: number, { t, courtName }: Ctx): string => {
  const round = tournament.rounds[roundIndex];
  if (!round) return '';
  const pair = (ids: [string, string]) => t('text.pair', { a: nameOf(tournament, ids[0]), b: nameOf(tournament, ids[1]) });
  const title = [
    `🎾 ${tournament.name}`,
    t('text.round', { n: roundIndex + 1, total: tournament.rounds.length }),
    ...(tournament.pointsPerMatch ? [t('rounds.toPoints', { n: tournament.pointsPerMatch })] : []),
  ].join(' · ');
  const matches = [...round.matches].sort((a, b) => a.courtIndex - b.courtIndex).map(m => {
    const court = m.id.includes('championship') ? `🏆 ${t('common.finals')}` : courtName(tournament.courtNames?.[m.courtIndex], m.courtIndex);
    const score = m.isCompleted ? ` (${m.scoreA}-${m.scoreB})` : '';
    return `${court}: ${pair(m.teamA)} ${t('common.vs').toLowerCase()} ${pair(m.teamB)}${score}`;
  });
  const resting = round.byes.length ? [t('text.resting', { names: round.byes.map(id => nameOf(tournament, id)).join(', ') })] : [];
  return [title, ...matches, ...resting].join('\n');
};

export const standingsText = (tournament: Tournament, leaderboard: LeaderboardEntry[], { t, locale }: Ctx, liveUrl?: string): string => {
  const byAverage = rankingModeOf(tournament) === 'average';
  const avg = (n: number) => n.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const lines = leaderboard.filter(e => e.matchesPlayed > 0).map((e, i) => {
    const value = byAverage
      ? `${avg(e.avgPoints)} ${t('lb.perMatch')} (${t('lb.ptsInMatches', { pts: e.totalPoints, n: e.matchesPlayed })})`
      : `${e.totalPoints} ${t('common.pts')}`;
    return `${i + 1}. ${e.playerName} — ${value}`;
  });
  return [
    `🏆 ${tournament.name} · ${t('common.standings')}`,
    ...lines,
    ...(liveUrl ? ['', t('text.live', { url: liveUrl })] : []),
  ].join('\n');
};
