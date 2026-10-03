import { describe, expect, it } from 'vitest';
import { liveRoundIndex } from './rounds.ts';
import type { Round } from '../types.ts';

const round = (index: number, done: boolean[]): Round => ({
  index, byes: [],
  matches: done.map((d, i) => ({ id: `r${index}-c${i}`, roundIndex: index, courtIndex: i, teamA: ['a', 'b'], teamB: ['c', 'd'], scoreA: d ? 1 : null, scoreB: d ? 2 : null, isCompleted: d })),
});

describe('liveRoundIndex', () => {
  it('is the first round with unfinished matches, else the last one', () => {
    expect(liveRoundIndex({ rounds: [round(0, [true, true]), round(1, [true, false]), round(2, [false])] })).toBe(1);
    expect(liveRoundIndex({ rounds: [round(0, [true]), round(1, [true])] })).toBe(1);
    expect(liveRoundIndex({ rounds: [] })).toBe(0);
  });
});
