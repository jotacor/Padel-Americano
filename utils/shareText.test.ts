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
  id: 't', name: 'Liga martes', players, isStarted: true, mode: 'event', ranking: 'average', pointsPerMatch: 24,
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
      '🎾 Liga martes · Ronda 1/1 · a 24 puntos',
      'Pista 1: Ana y Luis vs Marta y Juan (15-9)',
      'Pista 2: Pedro y Laura vs Sara y Iván',
      'Descansan: Nuria, Raúl',
    ].join('\n'));
  });

  it('standings in the tournament ranking mode, with the live link', () => {
    const text = standingsText(tournament, computeLeaderboard(tournament), ctx, 'https://padelme.io/game/bala-zapato');
    expect(text.split('\n')).toEqual([
      '🏆 Liga martes · Clasificación',
      '1. Ana — 15,0 por partido (15 pts · 1 jugados)',
      '2. Luis — 15,0 por partido (15 pts · 1 jugados)',
      '3. Marta — 9,0 por partido (9 pts · 1 jugados)',
      '4. Juan — 9,0 por partido (9 pts · 1 jugados)',
      '',
      'En directo: https://padelme.io/game/bala-zapato',
    ]);
  });
});
