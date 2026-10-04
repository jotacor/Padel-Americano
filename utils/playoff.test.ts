import { describe, expect, it } from 'vitest';
import {
  generatePlayoffFinal, generatePlayoffSemifinals, isFinal, isPlayoffMatch, matchTitle, playoffState, roundBadge, semifinalTeams,
} from './playoff.ts';
import { computeLeaderboard } from './leaderboard.ts';
import { translations, type TranslationKey } from '../i18n/translations.ts';
import { makePlayers } from './testing.ts';
import type { Pair, Round, Tournament } from '../types.ts';

const t = (key: TranslationKey, params: Record<string, string | number> = {}) =>
  translations.es[key].replace(/\{(\w+)\}/g, (_, p) => String(params[p]));
const courtLabel = (i: number) => t('common.court', { n: i + 1 });

const ranked = Array.from({ length: 10 }, (_, i) => `p${i}`); // p0 = 1st … p9 = 10th
const pool = ranked;
const score = (r: Round, a: number, b: number, i = 0): Round =>
  ({ ...r, matches: r.matches.map((m, k) => k === i ? { ...m, scoreA: a, scoreB: b, isCompleted: true } : m) });

describe('playoff', () => {
  it('rotating partners: balanced teams 1+8, 2+7, 3+6, 4+5 → (1+8) vs (4+5), (2+7) vs (3+6)', () => {
    expect(semifinalTeams(ranked)).toEqual([[['p0', 'p7'], ['p3', 'p4']], [['p1', 'p6'], ['p2', 'p5']]]);
    expect(semifinalTeams(ranked.slice(0, 7))).toBeNull();
  });

  it('fixed pairs: top 4 pairs → 1 vs 4, 2 vs 3', () => {
    const pairs: Pair[] = [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']];
    expect(semifinalTeams(pairs)).toEqual([[['a', 'b'], ['g', 'h']], [['c', 'd'], ['e', 'f']]]);
    expect(semifinalTeams(pairs.slice(0, 3))).toBeNull();
  });

  it('semifinals at once with 2+ courts, one per round with 1 court; everyone else rests', () => {
    const [both] = generatePlayoffSemifinals(ranked, pool, 6, 3);
    expect(both.index).toBe(6);
    expect(both.matches.map(m => [m.id, m.courtIndex])).toEqual([['r6-playoff-sf1', 0], ['r6-playoff-sf2', 1]]);
    expect(both.byes).toEqual(['p8', 'p9']);
    const split = generatePlayoffSemifinals(ranked, pool, 6, 1);
    expect(split.map(r => [r.index, r.matches.map(m => m.id)])).toEqual([[6, ['r6-playoff-sf1']], [7, ['r7-playoff-sf2']]]);
    expect(split[0].byes).toHaveLength(6);
  });

  it('final only when both semifinals have a winner (a tie blocks it)', () => {
    const [semis] = generatePlayoffSemifinals(ranked, pool, 0, 2);
    expect(generatePlayoffFinal([semis], pool, 1)).toBeNull();
    const tied = score(score(semis, 11, 7, 0), 9, 9, 1);
    expect(playoffState([tied]).tiedSemi).toBe(true);
    expect(generatePlayoffFinal([tied], pool, 1)).toBeNull();

    const done = score(score(semis, 11, 7, 0), 4, 11, 1); // SF1: (1+8) win, SF2: (3+6) win
    const final = generatePlayoffFinal([done], pool, 1)!;
    expect(final.matches).toEqual([expect.objectContaining({ id: 'r1-playoff-championship', courtIndex: 0, teamA: ['p0', 'p7'], teamB: ['p2', 'p5'] })]);
    expect(final.byes).toHaveLength(6);
    expect(isFinal(final.matches[0]) && isPlayoffMatch(final.matches[0])).toBe(true);
    expect(generatePlayoffFinal([done, final], pool, 2)).toBeNull(); // only one final
  });

  it('labels: round badge and match titles', () => {
    const [semis] = generatePlayoffSemifinals(ranked, pool, 0, 2);
    expect(roundBadge(semis, t)).toBe('Playoff · Semifinales');
    expect(matchTitle(semis.matches[1], t, courtLabel)).toBe('Semifinal 2 · Pista 2');
    const final = generatePlayoffFinal([score(score(semis, 11, 7, 0), 11, 7, 1)], pool, 1)!;
    expect(roundBadge(final, t)).toBe('Playoff · Final');
    expect(matchTitle(final.matches[0], t, courtLabel)).toBe('Final');
    expect(roundBadge({ index: 0, byes: [], matches: [{ ...semis.matches[0], id: 'r0-c0' }] }, t)).toBeNull();
  });

  it('seeds follow the standings (wins → points → difference)', () => {
    const players = makePlayers(8);
    const m = (i: number, a: Pair, b: Pair, sa: number, sb: number) =>
      ({ id: `r0-c${i}`, roundIndex: 0, courtIndex: i, teamA: a, teamB: b, scoreA: sa, scoreB: sb, isCompleted: true });
    const tournament: Tournament = { id: 't', name: 't', players, isStarted: true, rounds: [
      { index: 0, byes: [], matches: [m(0, ['p6', 'p7'], ['p0', 'p1'], 11, 2), m(1, ['p4', 'p5'], ['p2', 'p3'], 11, 9)] },
    ] };
    const seeds = computeLeaderboard(tournament).map(e => e.playerId);
    expect(seeds).toEqual(['p6', 'p7', 'p4', 'p5', 'p2', 'p3', 'p0', 'p1']);
    expect(semifinalTeams(seeds)![0]).toEqual([['p6', 'p1'], ['p5', 'p2']]);
  });
});
