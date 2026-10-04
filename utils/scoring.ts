// Score entry: matches to a points total (11/15/21: odd, so never a tie) or best of 3 tennis sets.
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

/**
 * Scores after typing `raw` on one side. With a total P the other side is filled with P − value,
 * unless the user typed that side by hand (`lastTyped` = the other side): then it's left alone
 * (a sum ≠ P is then flagged and blocks moving on, see `isInvalidScore`). Clearing a side clears an auto-filled
 * other side too. Without P, only digits are kept.
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
  if (value !== null && pointsPerMatch) value = Math.min(value, pointsPerMatch);
  const [mine, other] = side === 'A' ? [match.scoreA, match.scoreB] : [match.scoreB, match.scoreA];

  let nextOther = other;
  if (pointsPerMatch) {
    // The other side follows this one if it is empty, was filled for us, or (unknown origin) they added up to P
    const follows = other === null || lastTyped === side
      || (lastTyped === undefined && mine !== null && mine + other === pointsPerMatch);
    if (follows) nextOther = value === null ? null : pointsPerMatch - value;
  }
  const [scoreA, scoreB] = side === 'A' ? [value, nextOther] : [nextOther, value];
  return { scoreA, scoreB, isCompleted: scoreA !== null && scoreB !== null };
};

/**
 * With a points total, a result that blocks moving on: only one side entered, or both entered but
 * not adding up to the total. A blank match is fine (not played yet / skipped).
 */
export const isInvalidScore = (m: Pick<Match, 'scoreA' | 'scoreB' | 'sets'>, scoring: Scoring | undefined): boolean => {
  if (scoring === 'sets') return (m.sets ?? []).some(s => !empty(s)) && !setsResult(m.sets);
  return !!scoring && (m.scoreA !== null || m.scoreB !== null)
    && (m.scoreA === null || m.scoreB === null || m.scoreA + m.scoreB !== scoring);
};

/** First invalid result (see `isInvalidScore`) in these rounds, or null */
export const firstInvalidScore = <M extends Pick<Match, 'scoreA' | 'scoreB' | 'sets'>>(rounds: { index: number; matches: M[] }[], scoring: Scoring | undefined) => {
  for (const r of rounds) {
    const match = r.matches.find(m => isInvalidScore(m, scoring));
    if (match) return { roundIndex: r.index, match };
  }
  return null;
};

/** Sum of a finished match when it differs from the points total (shown under the match; blocks moving on), else null */
export const scoreSumMismatch = (m: Pick<Match, 'scoreA' | 'scoreB'>, pointsPerMatch?: number): number | null =>
  pointsPerMatch && m.scoreA !== null && m.scoreB !== null && m.scoreA + m.scoreB !== pointsPerMatch ? m.scoreA + m.scoreB : null;
