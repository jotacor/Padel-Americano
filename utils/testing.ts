// Test helpers (imported only by *.test.ts files)
import { expect, vi } from 'vitest';
import type { Player, Round } from '../types.ts';

const SKILLS = ['low', 'medium', 'high'] as const;

export const makePlayers = (n: number, skills: 'equal' | 'mixed' = 'equal'): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    skillLevel: skills === 'mixed' ? SKILLS[i % 3] : 'medium',
  }));

/** Deterministic Math.random (mulberry32); restore with vi.restoreAllMocks() */
export const seedRandom = (seed: number) => {
  let a = seed >>> 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
};

export const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const playersOf = (round: Round) => round.matches.flatMap(m => [...m.teamA, ...m.teamB]);

/** Structural checks every generated round must pass */
export const expectValidRound = (round: Round, pool: string[], maxCourts?: number) => {
  const playing = playersOf(round);
  expect(new Set(playing).size, 'nobody plays twice in a round').toBe(playing.length);
  playing.forEach(id => expect(pool, `${id} is in the pool`).toContain(id));
  expect([...round.byes].sort(), 'byes = pool minus players').toEqual(pool.filter(id => !playing.includes(id)).sort());
  const courts = round.matches.map(m => m.courtIndex);
  expect(new Set(courts).size, 'one match per court').toBe(courts.length);
  if (maxCourts !== undefined) courts.forEach(c => expect(c).toBeLessThan(maxCourts));
  round.matches.forEach(m => {
    expect(m.roundIndex).toBe(round.index);
    if (!m.id.includes('championship')) expect(m.id).toBe(`r${round.index}-c${m.courtIndex}`);
  });
};

export const pairCounts = (rounds: Round[]) => {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);
  rounds.forEach(r => r.matches.forEach(m => {
    [m.teamA, m.teamB].forEach(([a, b]) => bump(partners, key(a, b)));
    m.teamA.forEach(a => m.teamB.forEach(b => bump(opponents, key(a, b))));
  }));
  return { partners, opponents };
};

export const matchesPlayed = (rounds: Round[]) => {
  const played = new Map<string, number>();
  rounds.forEach(r => playersOf(r).forEach(id => played.set(id, (played.get(id) || 0) + 1)));
  return played;
};

/** Compact text form of a schedule, using player numbers (p7 → 7) */
export const scheduleText = (rounds: Round[]) =>
  rounds.map(r => {
    const n = (id: string) => id.replace(/^p/, '');
    const matches = [...r.matches]
      .sort((a, b) => a.courtIndex - b.courtIndex)
      .map(m => `${m.courtIndex}:${n(m.teamA[0])}+${n(m.teamA[1])}v${n(m.teamB[0])}+${n(m.teamB[1])}`)
      .join(' ');
    return `r${r.index} ${matches}${r.byes.length ? ` bye ${r.byes.map(n).join(',')}` : ''}`;
  }).join('\n');
