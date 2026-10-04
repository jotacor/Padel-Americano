import { describe, expect, it } from 'vitest';
import { applyScoreInput, applySetInput, firstInvalidScore, isInvalidScore, isValidPoints, isValidSet, needsThirdSet, POINTS_OPTIONS, setsResult, setsText, winningPoints } from './scoring.ts';

const empty = { scoreA: null, scoreB: null };

describe('applyScoreInput (first to 6 / 8 / 11 wins)', () => {
  it('11, 15 and 21 points: first to 6, 8 and 11 wins (odd totals, no ties)', () => {
    expect(POINTS_OPTIONS).toEqual([11, 15, 21]);
    expect(POINTS_OPTIONS.map(winningPoints)).toEqual([6, 8, 11]);
  });

  it('without a points total: digits only, nothing auto-filled', () => {
    expect(applyScoreInput(empty, 'A', '1a5', undefined)).toEqual({ scoreA: 15, scoreB: null, isCompleted: false });
    expect(applyScoreInput(empty, 'A', '', undefined)).toEqual({ scoreA: null, scoreB: null, isCompleted: false });
  });

  it('a losing score fills the other side with the winning points (to 11: 4 → 4-6)', () => {
    expect(applyScoreInput(empty, 'A', '4', 11)).toEqual({ scoreA: 4, scoreB: 6, isCompleted: true });
    expect(applyScoreInput(empty, 'B', '9', 21)).toEqual({ scoreA: 11, scoreB: 9, isCompleted: true });
  });

  it('the winning points leave the other side empty for the loser\'s score', () => {
    const won = applyScoreInput(empty, 'A', '6', 11);
    expect(won).toEqual({ scoreA: 6, scoreB: null, isCompleted: false });
    expect(applyScoreInput(won, 'B', '3', 11, 'A')).toEqual({ scoreA: 6, scoreB: 3, isCompleted: true });
  });

  it('correcting the auto-filled side: 4-6 → A 6 empties B', () => {
    const s1 = applyScoreInput(empty, 'A', '4', 11);
    expect(applyScoreInput(s1, 'A', '6', 11, 'A')).toEqual({ scoreA: 6, scoreB: null, isCompleted: false });
  });

  it('clearing a side also clears the auto-filled one', () => {
    expect(applyScoreInput({ scoreA: 4, scoreB: 6 }, 'A', '', 11, 'A')).toEqual({ scoreA: null, scoreB: null, isCompleted: false });
  });

  it('a hand-typed other side is respected', () => {
    const typedA = applyScoreInput(empty, 'A', '8', 15);
    const typedB = applyScoreInput(typedA, 'B', '5', 15, 'A');
    expect(typedB).toEqual({ scoreA: 8, scoreB: 5, isCompleted: true });
    expect(applyScoreInput(typedB, 'A', '7', 15, 'B')).toEqual({ scoreA: 7, scoreB: 5, isCompleted: true }); // B typed by hand: kept (now invalid)
  });

  it('caps at the winning points', () => {
    expect(applyScoreInput(empty, 'B', '30', 11)).toEqual({ scoreA: null, scoreB: 6, isCompleted: false });
  });
});

describe('isInvalidScore (blocks moving on)', () => {
  const s = (scoreA: number | null, scoreB: number | null) => ({ scoreA, scoreB });
  it('points: one team exactly at the winning points, the other below; blank is fine', () => {
    expect(isInvalidScore(s(null, null), 11)).toBe(false);
    expect(isInvalidScore(s(6, 3), 11)).toBe(false);
    expect(isInvalidScore(s(0, 6), 11)).toBe(false);
    expect(isInvalidScore(s(11, 10), 21)).toBe(false);
    expect(isInvalidScore(s(7, 4), 11)).toBe(true); // nobody stops at 7
    expect(isInvalidScore(s(5, 4), 11)).toBe(true); // nobody reached 6
    expect(isInvalidScore(s(6, 6), 11)).toBe(true);
    expect(isInvalidScore(s(6, null), 11)).toBe(true);
    expect(isValidPoints(8, 7, 15)).toBe(true);
  });
  it('free scoring never blocks', () => {
    expect(isInvalidScore(s(7, 9), undefined)).toBe(false);
    expect(isInvalidScore(s(7, null), undefined)).toBe(false);
  });
  it('finds the first invalid result', () => {
    const rounds = [
      { index: 0, matches: [s(6, 4), s(null, null)] },
      { index: 1, matches: [s(6, 5), s(3, 3)] },
    ];
    expect(firstInvalidScore(rounds, 11)).toEqual({ roundIndex: 1, match: s(3, 3) });
    expect(firstInvalidScore(rounds.slice(0, 1), 11)).toBeNull();
  });
});

describe('best of 3 sets', () => {
  it('valid tennis sets: 6-0…6-4, 7-5, 7-6', () => {
    for (const [a, b] of [[6, 0], [6, 4], [4, 6], [7, 5], [7, 6], [6, 7]]) expect(isValidSet(a, b), `${a}-${b}`).toBe(true);
    for (const [a, b] of [[6, 5], [7, 4], [5, 3], [6, 6], [8, 6], [7, 7]]) expect(isValidSet(a, b), `${a}-${b}`).toBe(false);
    expect(isValidSet(6, null)).toBe(false);
  });

  it('2-0 needs no third set; 1-1 needs it; the result is the sets won', () => {
    expect(setsResult([[6, 4], [6, 3]])).toEqual({ a: 2, b: 0 });
    expect(setsResult([[4, 6], [3, 6]])).toEqual({ a: 0, b: 2 });
    expect(setsResult([[6, 4], [3, 6]])).toBeNull();
    expect(needsThirdSet([[6, 4], [3, 6]])).toBe(true);
    expect(setsResult([[6, 4], [3, 6], [7, 5]])).toEqual({ a: 2, b: 1 });
    expect(setsResult([[6, 4], [0, 6], [6, 7]])).toEqual({ a: 1, b: 2 }); // fewer games, but sets decide
    expect(setsResult([[6, 4], [6, 3], [6, 1]])).toBeNull(); // no 3rd set after 2-0
    expect(setsResult([[6, 5], [6, 3]])).toBeNull();
  });

  it('typing a set: completes the match, clears a 3rd set that is no longer needed', () => {
    let m = { sets: [] as [number | null, number | null][] };
    for (const [i, side, v] of [[0, 'A', '6'], [0, 'B', '4'], [1, 'A', '3'], [1, 'B', '6'], [2, 'A', '7'], [2, 'B', '5']] as const) {
      m = { ...m, ...applySetInput(m, i, side, v) };
    }
    expect(m).toMatchObject({ scoreA: 2, scoreB: 1, isCompleted: true });
    expect(setsText(m.sets)).toBe('6-4 3-6 7-5');
    const fixed = applySetInput(m, 1, 'A', '7'); // 7-6 → 2-0: the 3rd set goes away
    expect(fixed).toMatchObject({ scoreA: 2, scoreB: 0, isCompleted: true });
    expect(fixed.sets).toHaveLength(2);
    expect(applySetInput({}, 0, 'A', '9').sets).toEqual([[7, null]]); // capped at 7 games
  });

  it('blocks moving on only when a set is entered but the match is not a valid best of 3', () => {
    expect(isInvalidScore({ scoreA: null, scoreB: null, sets: [] }, 'sets')).toBe(false);
    expect(isInvalidScore({ scoreA: null, scoreB: null, sets: [[6, 4]] }, 'sets')).toBe(true);
    expect(isInvalidScore({ scoreA: 2, scoreB: 0, sets: [[6, 4], [7, 6]] }, 'sets')).toBe(false);
    expect(firstInvalidScore([{ index: 3, matches: [{ scoreA: null, scoreB: null, sets: [[6, 6]] }] }], 'sets')?.roundIndex).toBe(3);
  });
});
