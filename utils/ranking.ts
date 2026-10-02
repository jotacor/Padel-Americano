import { Player, Match, Round, Tournament } from '../types.ts';
import { optimizeCourtAssignments, shuffle, skillValue } from './scheduler.ts';

// League matchmaking by initial skill and/or current standings ("prioritize standings").

export interface Matchmaking {
  skill: boolean;   // declared skillLevel (low/medium/high)
  ranking: boolean; // results so far, re-evaluated every round
}

/** League options. Legacy League tournaments (no flags) balanced by skill only. */
export const leagueMatchmaking = (t: Pick<Tournament, 'prioritizeSkill' | 'prioritizeRanking'>): Matchmaking => ({
  skill: t.prioritizeSkill !== false,
  ranking: !!t.prioritizeRanking,
});

const NEUTRAL = 2; // "medium" — everyone looks alike when nothing is prioritized

/**
 * Strength per player on the skill scale (1..3).
 * - skill only: skillValue
 * - ranking: percentile of points won per point played (fair with byes / late joiners, unlike
 *   total points) mapped to 1..3, blended with the prior (skill, or neutral) by matches played,
 *   so a couple of lucky results don't decide everything
 */
export const playerStrengths = (players: Player[], rounds: Round[], mm: Matchmaking): Map<string, number> => {
  const prior = (p: Player) => mm.skill ? skillValue(p) : NEUTRAL;
  const strengths = new Map(players.map(p => [p.id, prior(p)]));
  if (!mm.ranking) return strengths;

  const won = new Map<string, number>(), lost = new Map<string, number>(), played = new Map<string, number>();
  rounds.forEach(r => r.matches.forEach(m => {
    if (!m.isCompleted || m.scoreA === null || m.scoreB === null) return;
    const add = (ids: string[], f: number, a: number) => ids.forEach(id => {
      won.set(id, (won.get(id) || 0) + f);
      lost.set(id, (lost.get(id) || 0) + a);
      played.set(id, (played.get(id) || 0) + 1);
    });
    add(m.teamA, m.scoreA, m.scoreB);
    add(m.teamB, m.scoreB, m.scoreA);
  }));

  const share = (id: string) => {
    const f = won.get(id) || 0, total = f + (lost.get(id) || 0);
    return total ? f / total : 0.5;
  };
  const rated = players.filter(p => played.get(p.id));
  const sorted = rated.map(p => share(p.id)).sort((a, b) => a - b);
  // Ties share the average rank
  const percentile = (v: number) => sorted.length < 2 ? 0.5
    : (sorted.indexOf(v) + sorted.lastIndexOf(v)) / 2 / (sorted.length - 1);
  const priorWeight = mm.skill ? 2 : 1; // in matches: trust a declared level a bit longer
  rated.forEach(p => {
    const n = played.get(p.id)!;
    const w = n / (n + priorWeight);
    strengths.set(p.id, (1 - w) * prior(p) + w * (1 + 2 * percentile(share(p.id))));
  });
  return strengths;
};

/**
 * Cost of meeting again (as opponents or partners). Zero for a first meeting and for a new cycle
 * (both sides already met everyone available that often); grows quadratically with how far this
 * meeting is ahead of each side's least-met one, plus a penalty for the last two rounds.
 * Skill savings are bounded and this isn't, so similar levels meet more often but everyone
 * still meets everyone.
 */
export const repeatCost = (times: number, minA: number, minB: number, roundsAgo: number, weight: number, recent: number): number =>
  weight * (Math.max(0, times - minA) ** 2 + Math.max(0, times - minB) ** 2) / 2
  + (roundsAgo === 1 ? recent : roundsAgo === 2 ? recent / 2 : 0);

export const MATCH_WEIGHTS = {
  balance: 4,       // (team strength A − team strength B)²
  level: 2,         // Σ(strength − group mean)²: opponents of a similar level
  opponent: 3,      // repeated opponent, per excess² (see repeatCost)
  recentOpponent: 3,
  partner: 8,       // repeated partner (rotating pairs)
  recentPartner: 15,
  pairOpponent: 24, // fixed pairs: one rival per match (vs 4 rotating) → push harder; 24 = sim compromise balance vs coverage
};

const key = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
const SPLITS = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]] as const;

/**
 * League round, rotating partners, prioritizing standings. Who plays: fewest matches first.
 * Groups of 4 of similar strength (Mexicano-like), split into the most even teams, while
 * penalizing repeated partners/opponents (repeatCost). Local search over swaps between groups.
 */
export const generateRankedRound = (
  activePlayers: Player[],
  allPlayers: Player[],
  existingRounds: Round[],
  roundIndex: number,
  numCourts: number,
  strength: (id: string) => number
): Round => {
  const partners = new Map<string, number>(), opponents = new Map<string, number>();
  const lastPartner = new Map<string, number>(), lastOpponent = new Map<string, number>();
  const played = new Map<string, number>();
  const courtHistory = new Map<string, number[]>(allPlayers.map(p => [p.id, []]));
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) || 0) + 1);

  existingRounds.forEach(r => r.matches.forEach(m => {
    [...m.teamA, ...m.teamB].forEach(id => {
      bump(played, id);
      courtHistory.set(id, [...(courtHistory.get(id) || []), m.courtIndex]);
    });
    [m.teamA, m.teamB].forEach(([a, b]) => { bump(partners, key(a, b)); lastPartner.set(key(a, b), r.index); });
    m.teamA.forEach(a => m.teamB.forEach(b => { bump(opponents, key(a, b)); lastOpponent.set(key(a, b), r.index); }));
  }));

  // Fewest matches first, random order within the same count
  const byCount = new Map<number, Player[]>();
  activePlayers.forEach(p => {
    const c = played.get(p.id) || 0;
    byCount.set(c, [...(byCount.get(c) || []), p]);
  });
  const prioritized = [...byCount.keys()].sort((a, b) => a - b).flatMap(c => shuffle(byCount.get(c)!));
  const take = Math.min(numCourts, Math.floor(prioritized.length / 4)) * 4;
  const selected = prioritized.slice(0, take).map(p => p.id);

  const activeIds = activePlayers.map(p => p.id);
  const minOver = (m: Map<string, number>, id: string) =>
    Math.min(...activeIds.filter(o => o !== id).map(o => m.get(key(id, o)) || 0));
  const minPartner = new Map(selected.map(id => [id, minOver(partners, id)]));
  const minOpponent = new Map(selected.map(id => [id, minOver(opponents, id)]));
  // Numeric indices into `selected` + precomputed cost matrices: the search below is hot
  const n = selected.length;
  const W = MATCH_WEIGHTS;
  const S = Float64Array.from(selected, id => strength(id));
  const P = new Float64Array(n * n), O = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = selected[i], b = selected[j], k = key(a, b);
    P[i * n + j] = P[j * n + i] = repeatCost(partners.get(k) || 0, minPartner.get(a)!, minPartner.get(b)!,
      roundIndex - (lastPartner.get(k) ?? -Infinity), W.partner, W.recentPartner);
    O[i * n + j] = O[j * n + i] = repeatCost(opponents.get(k) || 0, minOpponent.get(a)!, minOpponent.get(b)!,
      roundIndex - (lastOpponent.get(k) ?? -Infinity), W.opponent, W.recentOpponent);
  }

  /** Cost of a group of 4 (indices) with its best split into two teams; split index into SPLITS */
  let lastSplit = 0;
  const groupCost = (g0: number, g1: number, g2: number, g3: number): number => {
    const g = [g0, g1, g2, g3];
    const mean = (S[g0] + S[g1] + S[g2] + S[g3]) / 4;
    const level = W.level * ((S[g0] - mean) ** 2 + (S[g1] - mean) ** 2 + (S[g2] - mean) ** 2 + (S[g3] - mean) ** 2);
    let best = Infinity;
    for (let si = 0; si < 3; si++) {
      const [x, y, z, w] = SPLITS[si];
      const a1 = g[x], a2 = g[y], b1 = g[z], b2 = g[w];
      const diff = S[a1] + S[a2] - S[b1] - S[b2];
      const cost = level + W.balance * diff * diff + P[a1 * n + a2] + P[b1 * n + b2]
        + O[a1 * n + b1] + O[a1 * n + b2] + O[a2 * n + b1] + O[a2 * n + b2];
      if (cost < best) { best = cost; lastSplit = si; }
    }
    return best;
  };
  const costAt = (flat: Int32Array, gi: number) => groupCost(flat[gi * 4], flat[gi * 4 + 1], flat[gi * 4 + 2], flat[gi * 4 + 3]);

  /** Hill climbing on a flat grouping (group g = positions 4g..4g+3): swap players between groups while the cost drops */
  const numGroups = n / 4;
  const improve = (flat: Int32Array): number => {
    const costs = Array.from({ length: numGroups }, (_, gi) => costAt(flat, gi));
    for (let pass = 0, improved = true; improved && pass < 50; pass++) {
      improved = false;
      for (let gi = 0; gi < numGroups; gi++) for (let gj = gi + 1; gj < numGroups; gj++) {
        for (let i = gi * 4; i < gi * 4 + 4; i++) for (let j = gj * 4; j < gj * 4 + 4; j++) {
          [flat[i], flat[j]] = [flat[j], flat[i]];
          const ca = costAt(flat, gi), cb = costAt(flat, gj);
          if (ca + cb < costs[gi] + costs[gj] - 1e-9) {
            costs[gi] = ca; costs[gj] = cb;
            improved = true;
          } else {
            [flat[i], flat[j]] = [flat[j], flat[i]];
          }
        }
      }
    }
    return costs.reduce((x, y) => x + y, 0);
  };

  // Starts: the ladder (sorted by strength, random among equals) + random groupings
  const indices = Array.from({ length: n }, (_, i) => i);
  let best = Int32Array.from(shuffle(indices).sort((a, b) => S[b] - S[a]));
  let bestCost = improve(best);
  const attempts = numGroups <= 4 ? 24 : 10;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const candidate = Int32Array.from(shuffle(indices));
    const cost = improve(candidate);
    if (cost < bestCost) { best = candidate; bestCost = cost; }
  }

  const matches: Match[] = Array.from({ length: numGroups }, (_, i) => {
    costAt(best, i);
    const [x, y, z, w] = SPLITS[lastSplit];
    const g = Array.from(best.subarray(i * 4, i * 4 + 4), idx => selected[idx]);
    return {
      id: `r${roundIndex}-c${i}`, roundIndex, courtIndex: i,
      teamA: [g[x], g[y]], teamB: [g[z], g[w]],
      scoreA: null, scoreB: null, isCompleted: false,
    };
  });
  const playing = new Set(selected);
  return {
    index: roundIndex,
    matches: optimizeCourtAssignments(matches, courtHistory),
    byes: activeIds.filter(id => !playing.has(id)),
  };
};
