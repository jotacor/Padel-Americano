import { Player, Match, Round, Pair } from '../types.ts';
import { optimizeCourtAssignments, shuffle, skillValue } from './scheduler.ts';

// Scheduling for fixed pairs: partners never change, only opponents rotate.

/** Order-insensitive key for a pair / team of player IDs */
export const pairKey = (pair: readonly string[]): string => [...pair].sort().join('|');

const newMatch = (roundIndex: number, courtIndex: number, teamA: Pair, teamB: Pair, id = `r${roundIndex}-c${courtIndex}`): Match => ({
  id, roundIndex, courtIndex,
  teamA: [...teamA] as Pair,
  teamB: [...teamB] as Pair,
  scoreA: null, scoreB: null, isCompleted: false,
});

const courtHistoryOf = (rounds: Round[]): Map<string, number[]> => {
  const history = new Map<string, number[]>();
  rounds.forEach(r => r.matches.forEach(m => [...m.teamA, ...m.teamB].forEach(id => {
    history.set(id, [...(history.get(id) || []), m.courtIndex]);
  })));
  return history;
};

/**
 * Random mode: full round robin between pairs (circle method) — every pair meets every
 * other pair exactly once. With an odd number of pairs, one pair rests each round.
 */
export const generateFixedPairsSchedule = (pairs: Pair[]): Round[] => {
  const teams: (Pair | null)[] = shuffle(pairs);
  if (teams.length % 2) teams.push(null);
  const n = teams.length;
  const order = teams.map((_, i) => i);
  const rounds: Round[] = [];

  for (let r = 0; r < n - 1; r++) {
    let matches: Match[] = [];
    const byes: string[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[order[i]], b = teams[order[n - 1 - i]];
      if (a && b) matches.push(newMatch(r, matches.length, a, b));
      else byes.push(...(a ?? b ?? []));
    }
    matches = optimizeCourtAssignments(matches, courtHistoryOf(rounds));
    rounds.push({ index: r, matches, byes });
    order.splice(1, 0, order.pop()!);
  }
  return rounds;
};

/**
 * One round between fixed pairs (League rounds, extra Random rounds).
 * Pairs with fewest matches play first; then picks the pairing of pairs that minimizes
 * repeated opponents and skill gaps between the two teams.
 */
export const generateFixedPairsRound = (
  activePairs: Pair[],
  players: Player[],
  existingRounds: Round[],
  roundIndex: number,
  numCourts: number
): Round => {
  const byId = new Map(players.map(p => [p.id, p]));
  const skill = (pair: Pair) => pair.reduce((sum, id) => sum + skillValue(byId.get(id) ?? ({} as Player)), 0);

  const played = new Map<string, number>();
  const met = new Map<string, number>();
  const meetKey = (a: Pair, b: Pair) => [pairKey(a), pairKey(b)].sort().join('#');
  existingRounds.forEach(r => r.matches.forEach(m => {
    [m.teamA, m.teamB].forEach(t => played.set(pairKey(t), (played.get(pairKey(t)) || 0) + 1));
    met.set(meetKey(m.teamA, m.teamB), (met.get(meetKey(m.teamA, m.teamB)) || 0) + 1);
  }));

  // Fewest matches first, random order within the same count
  const byCount = new Map<number, Pair[]>();
  activePairs.forEach(p => {
    const c = played.get(pairKey(p)) || 0;
    byCount.set(c, [...(byCount.get(c) || []), p]);
  });
  const prioritized = [...byCount.keys()].sort((a, b) => a - b).flatMap(c => shuffle(byCount.get(c)!));
  const take = Math.min(numCourts * 2, Math.floor(prioritized.length / 2) * 2);
  const selected = prioritized.slice(0, take);

  const cost = (a: Pair, b: Pair) => (met.get(meetKey(a, b)) || 0) * 10 + Math.abs(skill(a) - skill(b)) * 3;

  let best: [Pair, Pair][] = [];
  let bestCost = Infinity;
  if (selected.length <= 10) {
    // Exhaustive: at most 945 ways to split 10 pairs into 5 matches
    const search = (rest: Pair[], acc: [Pair, Pair][], total: number) => {
      if (total >= bestCost) return;
      if (rest.length === 0) { best = [...acc]; bestCost = total; return; }
      const [first, ...others] = rest;
      others.forEach((other, i) => {
        acc.push([first, other]);
        search(others.filter((_, j) => j !== i), acc, total + cost(first, other));
        acc.pop();
      });
    };
    search(selected, [], 0);
  } else {
    // Randomized greedy for large pools
    for (let attempt = 0; attempt < 300; attempt++) {
      const pool = shuffle(selected);
      const acc: [Pair, Pair][] = [];
      let total = 0;
      while (pool.length >= 2) {
        const first = pool.shift()!;
        let bi = 0;
        pool.forEach((p, i) => { if (cost(first, p) < cost(first, pool[bi])) bi = i; });
        total += cost(first, pool[bi]);
        acc.push([first, pool.splice(bi, 1)[0]]);
      }
      if (total < bestCost) { best = acc; bestCost = total; }
    }
  }

  const matches = optimizeCourtAssignments(
    best.map(([a, b], i) => newMatch(roundIndex, i, a, b)),
    courtHistoryOf(existingRounds)
  );
  const playing = new Set(selected.map(pairKey));
  const byes = activePairs.filter(p => !playing.has(pairKey(p))).flat();
  return { index: roundIndex, matches, byes };
};

/** Finals for fixed pairs: 1st vs 2nd pair on court 1, then 3rd vs 4th, ... on the other courts */
export const generateFixedPairsChampionship = (
  rankedPairs: Pair[],
  roundIndex: number,
  numCourts: number
): Round => {
  const matches: Match[] = [];
  for (let i = 0; i + 1 < rankedPairs.length && matches.length < numCourts; i += 2) {
    const id = i === 0 ? `r${roundIndex}-championship` : `r${roundIndex}-c${matches.length}`;
    matches.push(newMatch(roundIndex, matches.length, rankedPairs[i], rankedPairs[i + 1], id));
  }
  const byes = rankedPairs.slice(matches.length * 2).flat();
  return { index: roundIndex, matches, byes };
};
