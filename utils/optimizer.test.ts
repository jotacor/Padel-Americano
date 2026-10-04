import { describe, expect, it } from 'vitest';
import { optimizeCourtAssignments } from './scheduler.ts';
import type { Match } from '../types.ts';

// The previous exhaustive implementation (all n! permutations), kept verbatim as the reference
const legacyOptimize = (matches: Match[], playerCourtHistory: Map<string, number[]>): Match[] => {
  if (matches.length <= 1) return matches;
  const getPlayersInMatch = (m: Match) => [...m.teamA, ...m.teamB];
  const numCourts = matches.length;
  const countPlayersStaying = (perm: number[]): number => {
    let staying = 0;
    for (let matchIdx = 0; matchIdx < matches.length; matchIdx++) {
      const courtIdx = perm[matchIdx];
      for (const playerId of getPlayersInMatch(matches[matchIdx])) {
        const history = playerCourtHistory.get(playerId) || [];
        if (history.length > 0 && history[history.length - 1] === courtIdx) staying++;
      }
    }
    return staying;
  };
  const permute = (arr: number[]): number[][] => {
    if (arr.length <= 1) return [arr];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of permute(rest)) result.push([arr[i], ...perm]);
    }
    return result;
  };
  const allPermutations = permute(Array.from({ length: numCourts }, (_, i) => i));
  let minStaying = Infinity;
  const bestPermutations: number[][] = [];
  for (const perm of allPermutations) {
    const staying = countPlayersStaying(perm);
    if (staying < minStaying) { minStaying = staying; bestPermutations.length = 0; bestPermutations.push(perm); }
    else if (staying === minStaying) bestPermutations.push(perm);
  }
  const roundNumber = playerCourtHistory.values().next().value?.length || 0;
  const bestPermutation = bestPermutations[roundNumber % bestPermutations.length];
  return matches.map((match, idx) => ({ ...match, courtIndex: bestPermutation[idx], id: match.id.replace(/c\d+$/, `c${bestPermutation[idx]}`) }));
};

// Small deterministic PRNG so failures are reproducible
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const randomCase = (rand: () => number, n: number) => {
  const ids = Array.from({ length: 4 * n }, (_, i) => `p${i}`).sort(() => rand() - 0.5);
  const matches: Match[] = Array.from({ length: n }, (_, i) => ({
    id: `r3-c${i}`, roundIndex: 3, courtIndex: i,
    teamA: [ids[4 * i], ids[4 * i + 1]], teamB: [ids[4 * i + 2], ids[4 * i + 3]],
    scoreA: null, scoreB: null, isCompleted: false,
  }));
  const history = new Map<string, number[]>();
  const sparse = rand() < 0.2; // some cases with empty histories (everything ties)
  ids.forEach(id => {
    const len = sparse ? 0 : Math.floor(rand() * 4);
    // Courts up to n (inclusive) so a previous round with more courts is covered too
    history.set(id, Array.from({ length: len }, () => Math.floor(rand() * (n + 1))));
  });
  return { matches, history };
};

describe('optimizeCourtAssignments', () => {
  it('picks exactly what the exhaustive search picked (3,000 random rounds, 2–8 courts)', () => {
    const rand = rng(42);
    for (let i = 0; i < 3000; i++) {
      const n = i < 60 ? 8 : 2 + (i % 6); // the reference is factorial: few 8-court cases
      const { matches, history } = randomCase(rand, n);
      expect(optimizeCourtAssignments(matches, history), `case ${i}`).toEqual(legacyOptimize(matches, history));
    }
  });

  it('handles 10 courts fast', () => {
    const { matches, history } = randomCase(rng(7), 10);
    const t = performance.now();
    for (let i = 0; i < 20; i++) optimizeCourtAssignments(matches, history);
    expect((performance.now() - t) / 20).toBeLessThan(20);
    const courts = optimizeCourtAssignments(matches, history).map(m => m.courtIndex).sort((a, b) => a - b);
    expect(courts).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
