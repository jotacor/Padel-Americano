// Score entry: matches to 11/15/21 (first to 6/8/11 wins, so never a tie) or best of 3 tennis sets.
import type { Match, SetScore, Tournament } from '../types.ts';

export const POINTS_OPTIONS = [11, 15, 21] as const;
export const DEFAULT_POINTS = 11; // new tournaments
export type Side = 'A' | 'B';
/** Scoring of a tournament: points total, best of 3 sets, or null = free (older tournaments only) */
export type Scoring = number | 'sets' | null;
export const scoringOf = (t: Pick<Tournament, 'pointsPerMatch' | 'scoring'>): Scoring =>
  t.scoring === 'sets' ? 'sets' : t.pointsPerMatch ?? null;

/** Tennis set: 6 games with 2 clear (6-0 … 6-4), 7-5, or 7-6 after a tie-break */
export const isValidSet = (a: number | null, b: number | null): boolean => {
  if (a === null || b === null) return false;
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6));
};

const empty = (s?: SetScore) => !s || (s[0] === null && s[1] === null);

/**
 * Best of 3: sets won by each team when the entered sets make a finished match (2-0 with the
 * 3rd set empty, or 2-1), else null.
 */
export const setsResult = (sets: SetScore[] = []): { a: number; b: number } | null => {
  const [s1, s2, s3] = sets;
  if (!s1 || !s2 || !isValidSet(...s1) || !isValidSet(...s2)) return null;
  const wonA = (s: SetScore) => s[0]! > s[1]!;
  if (wonA(s1) === wonA(s2)) return empty(s3) ? (wonA(s1) ? { a: 2, b: 0 } : { a: 0, b: 2 }) : null;
  if (!s3 || !isValidSet(...s3)) return null;
  return wonA(s3) ? { a: 2, b: 1 } : { a: 1, b: 2 };
};

/** The 3rd set is only played at one set all */
export const needsThirdSet = (sets: SetScore[] = []): boolean => {
  const [s1, s2] = sets;
  return !!s1 && !!s2 && isValidSet(...s1) && isValidSet(...s2) && (s1[0]! > s1[1]!) !== (s2[0]! > s2[1]!);
};

/** Sets after typing `raw` on one side of set `index`; the match score is the sets won once finished */
export const applySetInput = (
  match: Pick<Match, 'sets'>,
  index: number,
  side: Side,
  raw: string,
): Pick<Match, 'sets' | 'scoreA' | 'scoreB' | 'isCompleted'> => {
  const digits = raw.replace(/\D/g, '').slice(0, 1);
  const value = digits === '' ? null : Math.min(parseInt(digits, 10), 7);
  const sets: SetScore[] = [0, 1, 2].map(i => [...(match.sets?.[i] ?? [null, null])] as SetScore);
  sets[index][side === 'A' ? 0 : 1] = value;
  if (!needsThirdSet(sets)) sets[2] = [null, null]; // 2-0: no third set
  while (sets.length && empty(sets[sets.length - 1])) sets.pop();
  const result = setsResult(sets);
  return { sets, scoreA: result?.a ?? null, scoreB: result?.b ?? null, isCompleted: !!result };
};

/** "6-4 3-6 7-5" */
export const setsText = (sets: SetScore[] = []): string =>
  sets.filter(s => !empty(s)).map(([a, b]) => `${a ?? ''}-${b ?? ''}`).join(' ');

/** Points a team needs to win a match "to P" (11 → 6, 15 → 8, 21 → 11): first to reach it wins */
export const winningPoints = (pointsPerMatch: number): number => Math.ceil(pointsPerMatch / 2);

/** A finished points match: one team reached the winning points and the other stayed below */
export const isValidPoints = (a: number | null, b: number | null, pointsPerMatch: number): boolean => {
  if (a === null || b === null) return false;
  const w = winningPoints(pointsPerMatch);
  return (a === w && b < w) || (b === w && a < w);
};

/**
 * Scores after typing `raw` on one side of a match to P (first to `winningPoints(P)` wins).
 * The other side follows unless the user typed it by hand (`lastTyped` = the other side): a value
 * below the winning points fills the other side with the winning points (to 11: 4 → 4-6); the winning
 * points themselves leave the other side empty for the loser's score. Clearing clears a followed side.
 * Without P, only digits are kept.
 */
export const applyScoreInput = (
  match: Pick<Match, 'scoreA' | 'scoreB'>,
  side: Side,
  raw: string,
  pointsPerMatch?: number,
  lastTyped?: Side,
): Pick<Match, 'scoreA' | 'scoreB' | 'isCompleted'> => {
  const digits = raw.replace(/\D/g, '').slice(0, 3);
  let value: number | null = digits === '' ? null : parseInt(digits, 10);
  const [mine, other] = side === 'A' ? [match.scoreA, match.scoreB] : [match.scoreB, match.scoreA];

  let nextOther = other;
  if (pointsPerMatch) {
    const w = winningPoints(pointsPerMatch);
    if (value !== null) value = Math.min(value, w);
    // The other side follows this one if it is empty, was filled for us, or (unknown origin) the result was a valid one
    const follows = other === null || lastTyped === side
      || (lastTyped === undefined && isValidPoints(mine, other, pointsPerMatch));
    if (follows) nextOther = value === null || value === w ? null : w;
  }
  const [scoreA, scoreB] = side === 'A' ? [value, nextOther] : [nextOther, value];
  return { scoreA, scoreB, isCompleted: scoreA !== null && scoreB !== null };
};

/**
 * A result that blocks moving on: points → one side entered, or both but not "first to the winning
 * points" (6-4 to 11 is fine, 7-4 or 6-6 is not); sets → see `setsResult`. A blank match is fine.
 */
export const isInvalidScore = (m: Pick<Match, 'scoreA' | 'scoreB' | 'sets'>, scoring: Scoring | undefined): boolean => {
  if (scoring === 'sets') return (m.sets ?? []).some(s => !empty(s)) && !setsResult(m.sets);
  return !!scoring && (m.scoreA !== null || m.scoreB !== null) && !isValidPoints(m.scoreA, m.scoreB, scoring);
};

/** First invalid result (see `isInvalidScore`) in these rounds, or null */
export const firstInvalidScore = <M extends Pick<Match, 'scoreA' | 'scoreB' | 'sets'>>(rounds: { index: number; matches: M[] }[], scoring: Scoring | undefined) => {
  for (const r of rounds) {
    const match = r.matches.find(m => isInvalidScore(m, scoring));
    if (match) return { roundIndex: r.index, match };
  }
  return null;
};
