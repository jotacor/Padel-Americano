import { describe, expect, it } from 'vitest';
import { applyScoreInput, POINTS_OPTIONS, scoreSumMismatch } from './scoring.ts';

const empty = { scoreA: null, scoreB: null };

describe('applyScoreInput', () => {
  it('offers only odd totals (no ties)', () => {
    expect(POINTS_OPTIONS).toEqual([11, 15, 21]);
    POINTS_OPTIONS.forEach(p => expect(p % 2).toBe(1));
  });

  it('without a points total: digits only, nothing auto-filled', () => {
    expect(applyScoreInput(empty, 'A', '1a5', undefined)).toEqual({ scoreA: 15, scoreB: null, isCompleted: false });
    expect(applyScoreInput(empty, 'A', '', undefined)).toEqual({ scoreA: null, scoreB: null, isCompleted: false });
  });

  it('typing one side fills the other (21 → 13-8), keystroke by keystroke', () => {
    const s1 = applyScoreInput(empty, 'A', '1', 21);
    expect(s1).toEqual({ scoreA: 1, scoreB: 20, isCompleted: true });
    const s2 = applyScoreInput(s1, 'A', '13', 21, 'A');
    expect(s2).toEqual({ scoreA: 13, scoreB: 8, isCompleted: true });
  });

  it('clearing a side also clears the auto-filled one', () => {
    expect(applyScoreInput({ scoreA: 13, scoreB: 8 }, 'A', '', 21, 'A')).toEqual({ scoreA: null, scoreB: null, isCompleted: false });
  });

  it('a hand-typed other side is respected (match cut short by time: 13-5)', () => {
    const typedA = applyScoreInput(empty, 'A', '13', 21);
    const typedB = applyScoreInput(typedA, 'B', '5', 21, 'A');
    expect(typedB).toEqual({ scoreA: 13, scoreB: 5, isCompleted: true });
    expect(scoreSumMismatch(typedB, 21)).toBe(18);
    // and editing A afterwards keeps B (both typed by hand)
    expect(applyScoreInput(typedB, 'A', '14', 21, 'B')).toEqual({ scoreA: 14, scoreB: 5, isCompleted: true });
  });

  it('saved scores of unknown origin follow when they added up to the total', () => {
    expect(applyScoreInput({ scoreA: 9, scoreB: 6 }, 'B', '7', 15)).toEqual({ scoreA: 8, scoreB: 7, isCompleted: true });
    expect(applyScoreInput({ scoreA: 9, scoreB: 4 }, 'B', '5', 15)).toEqual({ scoreA: 9, scoreB: 5, isCompleted: true });
  });

  it('caps at the total', () => {
    expect(applyScoreInput(empty, 'B', '30', 11)).toEqual({ scoreA: 0, scoreB: 11, isCompleted: true });
    expect(applyScoreInput(empty, 'A', '6', 11)).toEqual({ scoreA: 6, scoreB: 5, isCompleted: true });
  });

  it('flags sums that do not match the total', () => {
    expect(scoreSumMismatch({ scoreA: 13, scoreB: 8 }, 21)).toBeNull();
    expect(scoreSumMismatch({ scoreA: 13, scoreB: 8 }, undefined)).toBeNull();
    expect(scoreSumMismatch({ scoreA: 13, scoreB: null }, 21)).toBeNull();
  });
});
