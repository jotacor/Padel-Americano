// Score entry with a points-per-match total (11/15/21: odd totals, so a match can never end in a tie).
import type { Match } from '../types.ts';

export const POINTS_OPTIONS = [11, 15, 21] as const;
export const DEFAULT_POINTS = 11; // new tournaments; 'Libre' (free scoring) is the last option
export type Side = 'A' | 'B';

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
export const isInvalidScore = (m: Pick<Match, 'scoreA' | 'scoreB'>, pointsPerMatch?: number): boolean =>
  !!pointsPerMatch && (m.scoreA !== null || m.scoreB !== null)
  && (m.scoreA === null || m.scoreB === null || m.scoreA + m.scoreB !== pointsPerMatch);

/** First invalid result (see `isInvalidScore`) in these rounds, or null */
export const firstInvalidScore = <M extends Pick<Match, 'scoreA' | 'scoreB'>>(rounds: { index: number; matches: M[] }[], pointsPerMatch?: number) => {
  for (const r of rounds) {
    const match = r.matches.find(m => isInvalidScore(m, pointsPerMatch));
    if (match) return { roundIndex: r.index, match };
  }
  return null;
};

/** Sum of a finished match when it differs from the points total (shown under the match; blocks moving on), else null */
export const scoreSumMismatch = (m: Pick<Match, 'scoreA' | 'scoreB'>, pointsPerMatch?: number): number | null =>
  pointsPerMatch && m.scoreA !== null && m.scoreB !== null && m.scoreA + m.scoreB !== pointsPerMatch ? m.scoreA + m.scoreB : null;
