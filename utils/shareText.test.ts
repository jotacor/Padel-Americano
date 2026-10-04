import { describe, expect, it } from 'vitest';
import { roundText, standingsText } from './shareText.ts';
import { computeLeaderboard } from './leaderboard.ts';
import { translations, type TranslationKey } from '../i18n/translations.ts';
import { makePlayers } from './testing.ts';
import type { Tournament } from '../types.ts';

const t = (key: TranslationKey, params: Record<string, string | number> = {}) =>
  translations.es[key].replace(/\{(\w+)\}/g, (_, p) => String(params[p]));
const ctx = { t, courtLabel: (i: number) => t('common.court', { n: i + 1 }), locale: 'es-ES' };

const players = makePlayers(10).map((p, i) => ({ ...p, name: ['Ana', 'Luis', 'Marta', 'Juan', 'Pedro', 'Laura', 'Sara', 'Iván', 'Nuria', 'Raúl'][i] }));
const tournament: Tournament = {
  id: 't', name: 'Liga martes', players, isStarted: true, mode: 'event', pointsPerMatch: 21,
  rounds: [{
    index: 0, byes: ['p8', 'p9'],
    matches: [
      { id: 'r0-c0', roundIndex: 0, courtIndex: 0, teamA: ['p0', 'p1'], teamB: ['p2', 'p3'], scoreA: 15, scoreB: 9, isCompleted: true },
      { id: 'r0-c1', roundIndex: 0, courtIndex: 1, teamA: ['p4', 'p5'], teamB: ['p6', 'p7'], scoreA: null, scoreB: null, isCompleted: false },
    ],
  }],
};

describe('WhatsApp texts', () => {
  it('round line-up', () => {
    expect(roundText(tournament, 0, ctx)).toBe([
      '🎾 Liga martes · Ronda 1/1 · 21p · gana quien llega a 11',
      'Pista 1: ANA-LUIS vs MARTA-JUAN (15-9)',
      'Pista 2: PEDRO-LAURA vs SARA-IVÁN',
      'Descansan: NURIA, RAÚL',
    ].join('\n'));
  });

  it('standings (wins · points, only players who played), with the live link', () => {
    const text = standingsText(tournament, computeLeaderboard(tournament), ctx, 'https://padelme.io/game/bala-zapato');
    expect(text.split('\n')).toEqual([
      '🏆 Liga martes · Clasificación',
      '1. ANA — 1V · 15 pts · dif +6',
      '2. LUIS — 1V · 15 pts · dif +6',
      '3. MARTA — 0V · 9 pts · dif -6',
      '4. JUAN — 0V · 9 pts · dif -6',
      '',
      'En directo: https://padelme.io/game/bala-zapato',
    ]);
  });
});
