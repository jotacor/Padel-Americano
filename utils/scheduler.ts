import { Player, Match, Round } from '../types.ts';

/**
 * Mathematically Perfect Whist Tournament Logic
 * 1. Partner with every other player exactly once.
 * 2. Oppose every other player exactly twice (for N=8, 12, 16).
 * 
 * Enhanced with Court Rotation:
 * - Track which courts each player has been on
 * - Optimize court assignments to maximize variety
 */

// Hardcoded verified schedule for 8 players from user image
// Format: { t1: [court1_teamA_p1, court1_teamA_p2, court1_teamB_p1, court1_teamB_p2], 
//           t2: [court2_teamA_p1, court2_teamA_p2, court2_teamB_p1, court2_teamB_p2] }
const SCHEDULE_8 = [
  { t1: [0, 1, 2, 5], t2: [3, 6, 4, 7] },
  { t1: [0, 2, 3, 7], t2: [1, 5, 4, 6] },
  { t1: [0, 3, 1, 6], t2: [2, 7, 4, 5] },
  { t1: [0, 4, 2, 6], t2: [1, 7, 3, 5] },
  { t1: [0, 5, 3, 4], t2: [1, 2, 6, 7] },
  { t1: [0, 6, 5, 7], t2: [1, 3, 2, 4] },
  { t1: [0, 7, 1, 4], t2: [2, 3, 5, 6] }
];

// Hardcoded verified schedule for 16 players from provided user images
const SCHEDULE_16 = [
  [[3, 8, 5, 1], [11, 0, 2, 6], [10, 14, 12, 7], [13, 9, 4, 15]], // R1
  [[0, 9, 13, 11], [3, 10, 14, 8], [15, 6, 2, 4], [12, 5, 1, 7]], // R2
  [[4, 7, 1, 2], [5, 6, 15, 12], [13, 14, 8, 11], [3, 0, 9, 10]], // R3
  [[15, 9, 10, 12], [2, 11, 8, 1], [3, 5, 6, 0], [14, 7, 4, 13]], // R4
  [[3, 14, 7, 5], [4, 6, 0, 13], [9, 11, 2, 15], [1, 12, 10, 8]], // R5
  [[6, 12, 1, 4], [3, 9, 11, 14], [8, 13, 0, 10], [2, 7, 5, 15]], // R6
  [[10, 15, 5, 0], [7, 13, 8, 2], [1, 11, 14, 4], [3, 6, 12, 9]], // R7
  [[8, 12, 9, 2], [0, 4, 14, 5], [3, 7, 13, 6], [11, 15, 10, 1]], // R8
  [[3, 11, 15, 7], [10, 13, 6, 1], [12, 4, 0, 8], [5, 2, 9, 14]], // R9
  [[13, 2, 5, 10], [3, 12, 4, 11], [14, 1, 6, 9], [0, 15, 7, 8]], // R10
  [[9, 8, 7, 6], [15, 1, 14, 0], [5, 4, 11, 10], [3, 13, 2, 12]], // R11
  [[14, 2, 12, 0], [6, 10, 11, 7], [3, 15, 1, 13], [4, 8, 9, 5]], // R12
  [[3, 4, 8, 15], [9, 1, 13, 5], [2, 10, 6, 14], [7, 0, 12, 11]], // R13
  [[1, 0, 7, 9], [3, 2, 10, 4], [11, 5, 13, 12], [6, 8, 15, 14]], // R14
  [[12, 14, 15, 13], [8, 5, 11, 6], [7, 10, 4, 9], [3, 1, 0, 2]]  // R15
];

/**
 * Z-Cyclic Seeds for N=12
 * [FixedPlayer, Partner, Opponent1, Opponent2]
 */
const WHIST_SEEDS: Record<number, number[][]> = {
  12: [
    [11, 0, 8, 9], // (12-1) vs (9-10)
    [1, 7, 2, 5],  // (2-8) vs (3-6)
    [3, 10, 4, 6]  // (4-11) vs (5-7)
  ]
};

/**
 * Optimize court assignments to maximize variety for each player.
 * Players should play on different courts as much as possible.
 *
 * Picks the court permutation minimizing how many players stay on their last court.
 * Ties (common with balanced schedules) are broken by round number: among the optimal
 * permutations in lexicographic order, take index `roundNumber % count` — so courts
 * alternate predictably.
 *
 * Exact dynamic programming over subsets of courts (n·2ⁿ steps instead of n! permutations),
 * giving exactly the permutation the old exhaustive search picked.
 */
export const optimizeCourtAssignments = (
  matches: Match[],
  playerCourtHistory: Map<string, number[]>
): Match[] => {
  const n = matches.length;
  if (n <= 1) return matches;

  // w[i][c] = players of match i whose last court was c (the cost of putting match i on court c)
  const w = matches.map(m => {
    const row = new Array<number>(n).fill(0);
    for (const id of [...m.teamA, ...m.teamB]) {
      const history = playerCourtHistory.get(id);
      const last = history?.length ? history[history.length - 1] : -1;
      if (last >= 0 && last < n) row[last]++;
    }
    return row;
  });

  // Tiebreaker: round number (history length of the first player) cycles through tied permutations
  const roundNumber = playerCourtHistory.values().next().value?.length || 0;

  let perm: number[];
  if (n > 16) {
    // Never happens with real courts; keep it linear just in case
    const used = new Set<number>();
    perm = w.map(row => {
      let best = -1;
      row.forEach((cost, c) => { if (!used.has(c) && (best < 0 || cost < row[best])) best = c; });
      used.add(best);
      return best;
    });
  } else {
    // f[mask] = min cost of placing matches popcount(mask)..n-1 on the courts not in mask;
    // cnt[mask] = how many optimal ways there are to do it
    const full = (1 << n) - 1;
    const f = new Float64Array(1 << n);
    const cnt = new Float64Array(1 << n);
    cnt[full] = 1;
    const popcount = (x: number) => { let c = 0; for (; x; x &= x - 1) c++; return c; };
    for (let mask = full - 1; mask >= 0; mask--) {
      const k = popcount(mask);
      let best = Infinity, ways = 0;
      for (let c = 0; c < n; c++) {
        if (mask & (1 << c)) continue;
        const next = mask | (1 << c);
        const cost = w[k][c] + f[next];
        if (cost < best) { best = cost; ways = cnt[next]; }
        else if (cost === best) ways += cnt[next];
      }
      f[mask] = best;
      cnt[mask] = ways;
    }
    // Walk the optimal permutations in lexicographic order to the chosen index
    let t = roundNumber % cnt[0];
    perm = [];
    for (let k = 0, mask = 0; k < n; k++) {
      for (let c = 0; c < n; c++) {
        if (mask & (1 << c)) continue;
        const next = mask | (1 << c);
        if (w[k][c] + f[next] !== f[mask]) continue;
        if (t < cnt[next]) { perm.push(c); mask = next; break; }
        t -= cnt[next];
      }
    }
  }

  return matches.map((match, idx) => ({
    ...match,
    courtIndex: perm[idx],
    id: match.id.replace(/c\d+$/, `c${perm[idx]}`)
  }));
};

/**
 * Update player court history after optimizing a round
 */
const updateCourtHistory = (
  matches: Match[],
  history: Map<string, number[]>
): void => {
  for (const match of matches) {
    for (const playerId of [...match.teamA, ...match.teamB]) {
      const playerHistory = history.get(playerId) || [];
      playerHistory.push(match.courtIndex);
      history.set(playerId, playerHistory);
    }
  }
};

/** Skill as a number: low=1, medium=2 (default), high=3 */
export const skillValue = (p: Player): number => {
  if (p.skillLevel === 'high') return 3;
  if (p.skillLevel === 'low') return 1;
  return 2;
};

/**
 * Random mode schedule. The Whist/Berger structure fixes who partners whom by slot,
 * and every slot partners every other slot once — so any player→slot assignment keeps
 * those guarantees. We pick the assignment that makes each match as skill-even as possible.
 */
export const generateAmericanoSchedule = (players: Player[]): Round[] => {
  const slots: Player[] = players.map((_, i) => ({ id: String(i), name: '' }));
  const template = buildSlotSchedule(slots);
  const order = assignSlotsBySkill(template, players);
  const id = (slotId: string) => order[Number(slotId)].id;
  return template.map(round => ({
    ...round,
    matches: round.matches.map(m => ({
      ...m,
      teamA: [id(m.teamA[0]), id(m.teamA[1])],
      teamB: [id(m.teamB[0]), id(m.teamB[1])],
    })),
    byes: round.byes.map(id),
  }));
};

/**
 * Local search over player→slot assignments minimizing Σ (teamA skill − teamB skill)².
 * Returns players ordered by slot. Keeps the given order when skills don't matter.
 */
const assignSlotsBySkill = (template: Round[], players: Player[]): Player[] => {
  const skills = players.map(skillValue);
  if (skills.every(v => v === skills[0])) return players;

  const matches = template.flatMap(r => r.matches.map(m => [...m.teamA, ...m.teamB].map(Number)));
  const cost = (order: number[]) => {
    let c = 0;
    for (const [a1, a2, b1, b2] of matches) {
      const d = skills[order[a1]] + skills[order[a2]] - skills[order[b1]] - skills[order[b2]];
      c += d * d;
    }
    return c;
  };

  const n = players.length;
  let best = players.map((_, i) => i);
  let bestCost = cost(best);
  const RESTARTS = 8;
  for (let attempt = 0; attempt < RESTARTS && bestCost > 0; attempt++) {
    const order = attempt === 0 ? [...best] : shuffle(best);
    let current = cost(order);
    // First-improvement swaps until no swap helps
    for (let improved = true; improved && current > 0; ) {
      improved = false;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          if (skills[order[i]] === skills[order[j]]) continue;
          [order[i], order[j]] = [order[j], order[i]];
          const c = cost(order);
          if (c < current) { current = c; improved = true; }
          else [order[i], order[j]] = [order[j], order[i]];
        }
      }
    }
    if (current < bestCost) { bestCost = current; best = order; }
  }
  return best.map(i => players[i]);
};

const buildSlotSchedule = (players: Player[]): Round[] => {
  const numPlayers = players.length;
  if (numPlayers < 4) return [];

  // Track player court history for rotation optimization
  const playerCourtHistory = new Map<string, number[]>();

  // 1. Specialized Whist Schedules for Perfect Balance
  if (numPlayers === 8) {
    const rounds: Round[] = [];
    
    for (let rIdx = 0; rIdx < SCHEDULE_8.length; rIdx++) {
      const rData = SCHEDULE_8[rIdx];
      let matches: Match[] = [
        {
          id: `r${rIdx}-c0`,
          roundIndex: rIdx,
          courtIndex: 0,
          teamA: [players[rData.t1[0]].id, players[rData.t1[1]].id],
          teamB: [players[rData.t1[2]].id, players[rData.t1[3]].id],
          scoreA: null, scoreB: null, isCompleted: false
        },
        {
          id: `r${rIdx}-c1`,
          roundIndex: rIdx,
          courtIndex: 1,
          teamA: [players[rData.t2[0]].id, players[rData.t2[1]].id],
          teamB: [players[rData.t2[2]].id, players[rData.t2[3]].id],
          scoreA: null, scoreB: null, isCompleted: false
        }
      ];
      
      // Optimize court assignments based on history
      matches = optimizeCourtAssignments(matches, playerCourtHistory);
      updateCourtHistory(matches, playerCourtHistory);
      
      rounds.push({ index: rIdx, matches, byes: [] });
    }
    
    return rounds;
  }

  if (numPlayers === 16) {
    const rounds: Round[] = [];
    
    for (let rIdx = 0; rIdx < SCHEDULE_16.length; rIdx++) {
      const roundMatches = SCHEDULE_16[rIdx];
      let matches: Match[] = roundMatches.map((m, cIdx) => ({
        id: `r${rIdx}-c${cIdx}`,
        roundIndex: rIdx,
        courtIndex: cIdx,
        teamA: [players[m[0]].id, players[m[1]].id],
        teamB: [players[m[2]].id, players[m[3]].id],
        scoreA: null, scoreB: null, isCompleted: false
      }));
      
      // Optimize court assignments based on history
      matches = optimizeCourtAssignments(matches, playerCourtHistory);
      updateCourtHistory(matches, playerCourtHistory);
      
      rounds.push({ index: rIdx, matches, byes: [] });
    }
    
    return rounds;
  }

  if (WHIST_SEEDS[numPlayers]) {
    const seed = WHIST_SEEDS[numPlayers];
    const mod = numPlayers - 1;
    const rounds: Round[] = [];

    for (let r = 0; r < mod; r++) {
      let roundMatches: Match[] = seed.map((m, mIdx) => {
        const getPlayerId = (idx: number) => {
          if (idx === numPlayers - 1) return players[numPlayers - 1].id;
          return players[(idx + r) % mod].id;
        };
        return {
          id: `r${r}-c${mIdx}`,
          roundIndex: r,
          courtIndex: mIdx,
          teamA: [getPlayerId(m[0]), getPlayerId(m[1])],
          teamB: [getPlayerId(m[2]), getPlayerId(m[3])],
          scoreA: null, scoreB: null, isCompleted: false,
        };
      });
      
      // Optimize court assignments based on history
      roundMatches = optimizeCourtAssignments(roundMatches, playerCourtHistory);
      updateCourtHistory(roundMatches, playerCourtHistory);
      
      rounds.push({ index: r, matches: roundMatches, byes: [] });
    }
    return rounds;
  }

  // 2. Berger Rotation + Optimal Pair Matching
  // Phase 1 (Berger): Circle rotation guarantees each player partners with
  //   every other exactly once across N-1 rounds.
  // Phase 2 (NEW): For each round, exhaustively search all ways to group the
  //   N/2 partner-pairs into matches of 2-vs-2 and pick the grouping that
  //   minimizes repeated opponent encounters — achieving (or approaching)
  //   Balanced Whist Tournament quality for arbitrary N.
  //   Search space is (2k-1)!! which is tractable for padel sizes:
  //   8p→3, 12p→15, 16p→105, 20p→945, 24p→10395, 28p→135135.
  const isOdd = numPlayers % 2 !== 0;
  const n = isOdd ? numPlayers + 1 : numPlayers;
  const rounds: Round[] = [];

  // History matrices for optimal matching (indexed by player position)
  const opponentCount: number[][] = Array.from({ length: numPlayers }, () =>
    new Array(numPlayers).fill(0)
  );
  const groupCount: number[][] = Array.from({ length: numPlayers }, () =>
    new Array(numPlayers).fill(0)
  );
  const pidToIdx = new Map<string, number>();
  players.forEach((p, i) => pidToIdx.set(p.id, i));

  const indices = Array.from({ length: n }, (_, i) => i);

  for (let r = 0; r < n - 1; r++) {
    const validPairs: [string, string][] = [];
    const roundByes: string[] = [];

    for (let i = 0; i < n / 2; i++) {
      const idx1 = indices[i];
      const idx2 = indices[n - 1 - i];
      const p1 = idx1 < numPlayers ? players[idx1] : null;
      const p2 = idx2 < numPlayers ? players[idx2] : null;
      if (p1 && p2) {
        validPairs.push([p1.id, p2.id]);
      } else {
        if (p1) roundByes.push(p1.id);
        if (p2) roundByes.push(p2.id);
      }
    }

    const numMatchesPossible = Math.floor(validPairs.length / 2);
    let matches: Match[] = [];

    if (numMatchesPossible <= 1) {
      if (validPairs.length >= 2) {
        matches.push({
          id: `r${r}-c0`, roundIndex: r, courtIndex: 0,
          teamA: validPairs[0], teamB: validPairs[1],
          scoreA: null, scoreB: null, isCompleted: false
        });
      }
    } else {
      // Score how costly it is to put pairA vs pairB in a match
      const pairsToGroup = validPairs.slice(0, numMatchesPossible * 2);

      const scorePairGroup = (piA: number, piB: number): number => {
        const pA = pairsToGroup[piA], pB = pairsToGroup[piB];
        let s = 0;
        for (const aId of pA) {
          const ai = pidToIdx.get(aId)!;
          for (const bId of pB) {
            s += opponentCount[ai][pidToIdx.get(bId)!] * 10;
          }
        }
        const all = [...pA, ...pB];
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            s += groupCount[pidToIdx.get(all[i])!][pidToIdx.get(all[j])!] * 5;
          }
        }
        return s;
      };

      // Branch-and-bound search over all pair partitions. Keeps the first optimal partition in
      // search order (later ties never replace it), so the pruning below can't change results.
      const k = pairsToGroup.length;
      const cost = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => a === b ? Infinity : scorePairGroup(a, b)));

      // Greedy partition (first remaining pair with its cheapest partner) as the starting bound.
      // Scores are integers, so `greedy + 1` still accepts every partition at least as good.
      let bestPartition: [number, number][] = [];
      let greedyScore = 0;
      for (const rest = Array.from({ length: k }, (_, i) => i); rest.length >= 2; ) {
        const first = rest.shift()!;
        let bi = 0;
        rest.forEach((p, i) => { if (cost[first][p] < cost[first][rest[bi]]) bi = i; });
        greedyScore += cost[first][rest[bi]];
        bestPartition.push([first, rest.splice(bi, 1)[0]]);
      }
      let bestScore = greedyScore + 1;

      // Admissible lower bound for the unmatched pairs: each pair pays at least half its cheapest match
      const lowerBound = (remaining: number[]) => {
        let lb = 0;
        for (const a of remaining) {
          let min = Infinity;
          for (const b of remaining) if (cost[a][b] < min) min = cost[a][b];
          lb += min;
        }
        return lb / 2;
      };

      // Deterministic safety net for very large groups (never reached up to 30 players)
      const NODE_BUDGET = 400_000;
      let nodes = 0;

      const search = (
        remaining: number[],
        current: [number, number][],
        score: number
      ) => {
        if (remaining.length === 0) {
          if (score < bestScore) {
            bestScore = score;
            bestPartition = [...current];
          }
          return;
        }
        if (++nodes > NODE_BUDGET || remaining.length < 2 || score + lowerBound(remaining) >= bestScore) return;

        const first = remaining[0];
        for (let i = 1; i < remaining.length; i++) {
          const next = remaining.filter((_, idx) => idx !== 0 && idx !== i);
          current.push([first, remaining[i]]);
          search(next, current, score + cost[first][remaining[i]]);
          current.pop();
        }
      };

      search(
        Array.from({ length: k }, (_, i) => i),
        [], 0
      );

      {
        for (let mi = 0; mi < bestPartition.length; mi++) {
          const [piA, piB] = bestPartition[mi];
          matches.push({
            id: `r${r}-c${mi}`, roundIndex: r, courtIndex: mi,
            teamA: pairsToGroup[piA], teamB: pairsToGroup[piB],
            scoreA: null, scoreB: null, isCompleted: false
          });
        }
      }
    }

    matches = optimizeCourtAssignments(matches, playerCourtHistory);
    updateCourtHistory(matches, playerCourtHistory);

    // Update opponent and group history matrices
    for (const match of matches) {
      for (const aId of match.teamA) {
        const ai = pidToIdx.get(aId)!;
        for (const bId of match.teamB) {
          const bi = pidToIdx.get(bId)!;
          opponentCount[ai][bi]++;
          opponentCount[bi][ai]++;
        }
      }
      const all = [...match.teamA, ...match.teamB];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const ii = pidToIdx.get(all[i])!, jj = pidToIdx.get(all[j])!;
          groupCount[ii][jj]++;
          groupCount[jj][ii]++;
        }
      }
    }

    if (validPairs.length % 2 !== 0) {
      const lastPair = validPairs[validPairs.length - 1];
      roundByes.push(...lastPair);
    }

    rounds.push({ index: r, matches, byes: roundByes });

    const last = indices.pop()!;
    indices.splice(1, 0, last);
  }

  return rounds;
};

/**
 * Generate an additional round for an existing tournament.
 * Prioritizes players who have played the fewest matches.
 * Creates fair pairings trying to avoid recent partners/opponents.
 */
export const generateAdditionalRound = (
  players: Player[],
  existingRounds: Round[],
  roundIndex: number,
  courts?: number // chosen courts; default/maximum players ÷ 4
): Round => {
  const numPlayers = players.length;
  const numCourts = Math.min(courts ?? Infinity, Math.floor(numPlayers / 4));
  const playersPerRound = numCourts * 4;
  const playerById = new Map(players.map(p => [p.id, p]));
  
  // Count matches played by each player
  const matchCount: Record<string, number> = {};
  const partnerHistory: Record<string, Set<string>> = {};
  const opponentHistory: Record<string, Set<string>> = {};
  const courtHistory: Map<string, number[]> = new Map();
  
  players.forEach(p => {
    matchCount[p.id] = 0;
    partnerHistory[p.id] = new Set();
    opponentHistory[p.id] = new Set();
    courtHistory.set(p.id, []);
  });
  
  // Analyze existing rounds
  existingRounds.forEach(round => {
    round.matches.forEach(match => {
      // Count matches
      [...match.teamA, ...match.teamB].forEach(id => {
        matchCount[id] = (matchCount[id] || 0) + 1;
        const history = courtHistory.get(id) || [];
        history.push(match.courtIndex);
        courtHistory.set(id, history);
      });
      
      // Track partners
      partnerHistory[match.teamA[0]]?.add(match.teamA[1]);
      partnerHistory[match.teamA[1]]?.add(match.teamA[0]);
      partnerHistory[match.teamB[0]]?.add(match.teamB[1]);
      partnerHistory[match.teamB[1]]?.add(match.teamB[0]);
      
      // Track opponents
      match.teamA.forEach(a => match.teamB.forEach(b => {
        opponentHistory[a]?.add(b);
        opponentHistory[b]?.add(a);
      }));
    });
  });
  
  // Sort players by match count (ascending) to prioritize those who've played less
  const sortedPlayers = [...players].sort((a, b) => 
    (matchCount[a.id] || 0) - (matchCount[b.id] || 0)
  );
  
  // Select players for this round (prioritize those with fewer matches)
  const selectedPlayers = sortedPlayers.slice(0, playersPerRound);
  const byes = sortedPlayers.slice(playersPerRound).map(p => p.id);
  
  // Create pairings trying to avoid previous partners
  const available = [...selectedPlayers];
  const teams: [string, string][] = [];
  
  while (available.length >= 2) {
    const p1 = available.shift()!;
    
    // Find best partner (someone they haven't partnered with)
    let bestPartnerIdx = 0;
    let bestScore = Infinity;
    
    for (let i = 0; i < available.length; i++) {
      const p2 = available[i];
      let score = 0;
      if (partnerHistory[p1.id]?.has(p2.id)) score += 10;
      // Also consider opponent history as secondary
      if (opponentHistory[p1.id]?.has(p2.id)) score += 1;
      
      if (score < bestScore) {
        bestScore = score;
        bestPartnerIdx = i;
      }
    }
    
    const p2 = available.splice(bestPartnerIdx, 1)[0];
    teams.push([p1.id, p2.id]);
  }
  
  // Create matches from teams, trying to avoid previous opponents
  const matches: Match[] = [];
  const usedTeams = new Set<number>();
  
  for (let courtIdx = 0; courtIdx < numCourts && usedTeams.size < teams.length - 1; courtIdx++) {
    // Find first unused team
    let teamAIdx = 0;
    while (usedTeams.has(teamAIdx)) teamAIdx++;
    usedTeams.add(teamAIdx);
    
    // Find best opponent team
    let bestOpponentIdx = -1;
    let bestScore = Infinity;
    
    for (let i = 0; i < teams.length; i++) {
      if (usedTeams.has(i)) continue;
      
      let score = 0;
      // Check how many times these players have faced each other
      teams[teamAIdx].forEach(a => {
        teams[i].forEach(b => {
          if (opponentHistory[a]?.has(b)) score += 1;
        });
      });
      // Prefer skill-even matches
      const teamSkill = (team: [string, string]) => team.reduce((sum, pid) => sum + skillValue(playerById.get(pid)!), 0);
      score += Math.abs(teamSkill(teams[teamAIdx]) - teamSkill(teams[i])) * 2;
      
      if (score < bestScore) {
        bestScore = score;
        bestOpponentIdx = i;
      }
    }
    
    if (bestOpponentIdx === -1) break;
    usedTeams.add(bestOpponentIdx);
    
    matches.push({
      id: `r${roundIndex}-c${courtIdx}`,
      roundIndex,
      courtIndex: courtIdx,
      teamA: teams[teamAIdx],
      teamB: teams[bestOpponentIdx],
      scoreA: null,
      scoreB: null,
      isCompleted: false
    });
  }
  
  // Optimize court assignments
  const optimizedMatches = optimizeCourtAssignments(matches, courtHistory);
  
  return {
    index: roundIndex,
    matches: optimizedMatches,
    byes
  };
};

/**
 * Fisher-Yates shuffle — proper uniform randomization.
 */
export const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Generate a skill-balanced event round.
 * Used in "event mode" where rounds are generated one at a time
 * from the current active player pool.
 * 
 * Uses a multi-attempt randomized approach:
 * 1. Properly shuffle players (Fisher-Yates) within same match count
 * 2. Try many candidate groupings scored on skill balance + partner/opponent novelty
 * 3. Pick the best candidate
 * 4. Court rotation via optimizeCourtAssignments
 */
export const generateEventRound = (
  activePlayers: Player[],
  allPlayers: Player[],
  existingRounds: Round[],
  roundIndex: number,
  numCourts: number,
  strength: (p: Player) => number = skillValue // League options may replace the declared skill
): Round => {
  const playersPerRound = numCourts * 4;
  
  const partnerHistory: Record<string, Set<string>> = {};
  const opponentHistory: Record<string, Set<string>> = {};
  const matchCount: Record<string, number> = {};
  const courtHistory: Map<string, number[]> = new Map();
  // Track how many times each pair of players has been in the same group
  const groupHistory: Record<string, Record<string, number>> = {};
  
  allPlayers.forEach(p => {
    partnerHistory[p.id] = new Set();
    opponentHistory[p.id] = new Set();
    matchCount[p.id] = 0;
    courtHistory.set(p.id, []);
    groupHistory[p.id] = {};
  });
  
  existingRounds.forEach(round => {
    round.matches.forEach(match => {
      const allInMatch = [...match.teamA, ...match.teamB];
      allInMatch.forEach(id => {
        matchCount[id] = (matchCount[id] || 0) + 1;
        const hist = courtHistory.get(id) || [];
        hist.push(match.courtIndex);
        courtHistory.set(id, hist);
      });
      
      // Track every pair that was in the same match (group history)
      for (let a = 0; a < allInMatch.length; a++) {
        for (let b = a + 1; b < allInMatch.length; b++) {
          const idA = allInMatch[a], idB = allInMatch[b];
          if (groupHistory[idA]) groupHistory[idA][idB] = (groupHistory[idA][idB] || 0) + 1;
          if (groupHistory[idB]) groupHistory[idB][idA] = (groupHistory[idB][idA] || 0) + 1;
        }
      }
      
      partnerHistory[match.teamA[0]]?.add(match.teamA[1]);
      partnerHistory[match.teamA[1]]?.add(match.teamA[0]);
      partnerHistory[match.teamB[0]]?.add(match.teamB[1]);
      partnerHistory[match.teamB[1]]?.add(match.teamB[0]);
      
      match.teamA.forEach(a => match.teamB.forEach(b => {
        opponentHistory[a]?.add(b);
        opponentHistory[b]?.add(a);
      }));
    });
  });
  
  // Select players: fewest matches first, Fisher-Yates shuffle within same count
  const byCount = new Map<number, Player[]>();
  activePlayers.forEach(p => {
    const c = matchCount[p.id] || 0;
    if (!byCount.has(c)) byCount.set(c, []);
    byCount.get(c)!.push(p);
  });
  const sortedCounts = [...byCount.keys()].sort((a, b) => a - b);
  let selected: Player[] = [];
  for (const c of sortedCounts) {
    selected.push(...shuffle(byCount.get(c)!));
  }
  // Only full groups of 4 play: cut here so whoever rests is among those who played most
  selected = selected.slice(0, Math.min(playersPerRound, Math.floor(activePlayers.length / 4) * 4));

  /**
   * Score a grouping of players into groups of 4.
   * Lower is better. Considers:
   * - Skill imbalance within each group (we want balanced teams possible)
   * - How often players in the same group have been grouped before (novelty)
   * - Partner repeat penalty
   */
  const scoreGrouping = (groups: Player[][]): number => {
    let totalScore = 0;
    for (const group of groups) {
      if (group.length !== 4) continue;
      
      // Skill: check if balanced splits are possible (min skill diff across 3 splits)
      const skills = group.map(strength);
      const minSkillDiff = Math.min(
        Math.abs((skills[0] + skills[1]) - (skills[2] + skills[3])),
        Math.abs((skills[0] + skills[2]) - (skills[1] + skills[3])),
        Math.abs((skills[0] + skills[3]) - (skills[1] + skills[2]))
      );
      totalScore += minSkillDiff * 8;
      
      // Group novelty: penalize repeated groupings
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          const times = groupHistory[group[a].id]?.[group[b].id] || 0;
          totalScore += times * 6;
        }
      }
      
      // Partner novelty: extra penalty for being teammates again
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          if (partnerHistory[group[a].id]?.has(group[b].id)) {
            totalScore += 3;
          }
        }
      }
    }
    return totalScore;
  };

  /**
   * Build groups greedily from a shuffled pool.
   * For each group, pick 4 players considering skill balance.
   */
  const buildGroups = (pool: Player[]): Player[][] => {
    const remaining = [...pool];
    const groups: Player[][] = [];
    
    for (let court = 0; court < numCourts && remaining.length >= 4; court++) {
      // Pick first player
      const p1 = remaining.splice(0, 1)[0];
      const p1Skill = strength(p1);
      
      // For a balanced group, target total skill ~8 (2 avg per player)
      // Pick 3 more players to minimize skill deviation from target
      const targetRemaining = 8 - p1Skill; // ideal sum of other 3
      
      // Score each possible trio from remaining
      let bestTrio: number[] = [0, 1, 2];
      let bestTrioScore = Infinity;
      
      const limit = Math.min(remaining.length, 10); // cap search for performance
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          for (let k = j + 1; k < limit; k++) {
            const trioSkill = strength(remaining[i]) + strength(remaining[j]) + strength(remaining[k]);
            const skillDev = Math.abs(trioSkill - targetRemaining);
            // Also add group history penalty
            const group = [p1, remaining[i], remaining[j], remaining[k]];
            let histPenalty = 0;
            for (let a = 0; a < group.length; a++) {
              for (let b = a + 1; b < group.length; b++) {
                histPenalty += (groupHistory[group[a].id]?.[group[b].id] || 0);
              }
            }
            const score = skillDev * 3 + histPenalty * 5;
            if (score < bestTrioScore) {
              bestTrioScore = score;
              bestTrio = [i, j, k];
            }
          }
        }
      }
      
      // Extract the best trio (reverse order to preserve indices)
      const picked = bestTrio.sort((a, b) => b - a).map(idx => remaining.splice(idx, 1)[0]);
      groups.push([p1, ...picked]);
    }
    return groups;
  };

  // Try multiple random orderings and pick the best grouping
  const NUM_ATTEMPTS = 40;
  let bestGroups: Player[][] = [];
  let bestScore = Infinity;
  
  for (let attempt = 0; attempt < NUM_ATTEMPTS; attempt++) {
    const shuffled = shuffle(selected);
    const groups = buildGroups(shuffled);
    const score = scoreGrouping(groups);
    if (score < bestScore) {
      bestScore = score;
      bestGroups = groups;
    }
  }
  
  // Create matches from best groups, picking optimal team splits
  const matches: Match[] = [];
  
  for (let i = 0; i < bestGroups.length; i++) {
    const group = bestGroups[i];
    if (group.length !== 4) continue;
    
    const splits: [number, number, number, number][] = [
      [0, 1, 2, 3],
      [0, 2, 1, 3],
      [0, 3, 1, 2],
    ];
    
    let bestSplit = splits[0];
    let bestSplitScore = Infinity;
    
    for (const split of splits) {
      const teamASkill = strength(group[split[0]]) + strength(group[split[1]]);
      const teamBSkill = strength(group[split[2]]) + strength(group[split[3]]);
      const skillDiff = Math.abs(teamASkill - teamBSkill);
      
      let partnerPenalty = 0;
      if (partnerHistory[group[split[0]].id]?.has(group[split[1]].id)) partnerPenalty += 10;
      if (partnerHistory[group[split[2]].id]?.has(group[split[3]].id)) partnerPenalty += 10;
      
      let opponentPenalty = 0;
      [group[split[0]].id, group[split[1]].id].forEach(a => {
        [group[split[2]].id, group[split[3]].id].forEach(b => {
          if (opponentHistory[a]?.has(b)) opponentPenalty += 2;
        });
      });
      
      const score = skillDiff * 5 + partnerPenalty + opponentPenalty;
      if (score < bestSplitScore) {
        bestSplitScore = score;
        bestSplit = split;
      }
    }
    
    matches.push({
      id: `r${roundIndex}-c${i}`,
      roundIndex,
      courtIndex: i,
      teamA: [group[bestSplit[0]].id, group[bestSplit[1]].id],
      teamB: [group[bestSplit[2]].id, group[bestSplit[3]].id],
      scoreA: null,
      scoreB: null,
      isCompleted: false
    });
  }
  
  // Players in matches vs all active — anyone not in a match is resting
  const playersInMatches = new Set<string>();
  matches.forEach(m => [...m.teamA, ...m.teamB].forEach(id => playersInMatches.add(id)));
  const allByes = activePlayers
    .filter(p => !playersInMatches.has(p.id))
    .map(p => p.id);
  
  const optimizedMatches = optimizeCourtAssignments(matches, courtHistory);
  
  return {
    index: roundIndex,
    matches: optimizedMatches,
    byes: allByes
  };
};

/**
 * Random mode with "prioritize skill": same number of rounds as the Whist schedule, but each
 * round is built like a League round (skill-balanced groups, avoiding repeats). Matches are
 * more even; in exchange some partnerships repeat and others never happen.
 */
export const generateSkillBalancedSchedule = (players: Player[]): Round[] => {
  const numRounds = players.length % 2 ? players.length : players.length - 1;
  const numCourts = Math.floor(players.length / 4);
  const rounds: Round[] = [];
  for (let r = 0; r < numRounds; r++) {
    rounds.push(generateEventRound(players, players, rounds, r, numCourts));
  }
  return rounds;
};

/**
 * Fit a full schedule into fewer courts (the club has fewer than players ÷ 4): same matches,
 * same order, packed greedily into rounds of at most `numCourts` matches with no player twice.
 * Keeps every partner/opponent guarantee of the schedule; players rest in turn.
 */
export const packRounds = (rounds: Round[], numCourts: number, playerIds: string[]): Round[] => {
  if (rounds.every(r => r.matches.length <= numCourts)) return rounds;
  const queue = rounds.flatMap(r => r.matches);
  const packed: Round[] = [];
  const courtHistory = new Map<string, number[]>(playerIds.map(id => [id, []]));
  const played = new Map<string, number>(playerIds.map(id => [id, 0]));
  const playersOf = (m: Match) => [...m.teamA, ...m.teamB];
  while (queue.length) {
    const roundIndex = packed.length;
    const busy = new Set<string>();
    const picked: Match[] = [];
    // Matches of whoever has played least go first (fair rests); schedule order breaks ties
    const order = queue.map((m, i) => ({ i, load: playersOf(m).reduce((sum, id) => sum + played.get(id)!, 0) }))
      .sort((a, b) => a.load - b.load || a.i - b.i);
    const taken = new Set<number>();
    for (const { i } of order) {
      if (picked.length >= numCourts) break;
      const ids = playersOf(queue[i]);
      if (ids.some(id => busy.has(id))) continue;
      ids.forEach(id => { busy.add(id); played.set(id, played.get(id)! + 1); });
      taken.add(i);
      picked.push({ ...queue[i], roundIndex, courtIndex: picked.length, id: `r${roundIndex}-c${picked.length}` });
    }
    for (let i = queue.length - 1; i >= 0; i--) if (taken.has(i)) queue.splice(i, 1);
    const matches = optimizeCourtAssignments(picked, courtHistory);
    updateCourtHistory(matches, courtHistory);
    packed.push({ index: roundIndex, matches, byes: playerIds.filter(id => !busy.has(id)) });
  }
  return packed;
};

/**
 * Generate a championship round.
 * 1st + 3rd place vs 2nd + 4th place on Court 1
 * Remaining players fill other courts with balanced matchups.
 */
export const generateChampionshipRound = (
  players: Player[],
  leaderboard: { playerId: string }[],
  existingRounds: Round[],
  roundIndex: number,
  courts?: number // chosen courts; default/maximum players ÷ 4
): Round => {
  const numPlayers = players.length;
  const numCourts = Math.min(courts ?? Infinity, Math.floor(numPlayers / 4));
  
  // Build court history for optimization
  const courtHistory: Map<string, number[]> = new Map();
  players.forEach(p => courtHistory.set(p.id, []));
  existingRounds.forEach(round => {
    round.matches.forEach(match => {
      [...match.teamA, ...match.teamB].forEach(id => {
        const history = courtHistory.get(id) || [];
        history.push(match.courtIndex);
        courtHistory.set(id, history);
      });
    });
  });
  
  const matches: Match[] = [];
  const usedPlayers = new Set<string>();
  
  // Championship match: 1st + 3rd vs 2nd + 4th
  if (leaderboard.length >= 4) {
    const first = leaderboard[0].playerId;
    const second = leaderboard[1].playerId;
    const third = leaderboard[2].playerId;
    const fourth = leaderboard[3].playerId;
    
    matches.push({
      id: `r${roundIndex}-championship`,
      roundIndex,
      courtIndex: 0, // Championship on Court 1
      teamA: [first, third],
      teamB: [second, fourth],
      scoreA: null,
      scoreB: null,
      isCompleted: false
    });
    
    [first, second, third, fourth].forEach(id => usedPlayers.add(id));
  }
  
  // Fill remaining courts with other players
  const remainingPlayers = players.filter(p => !usedPlayers.has(p.id));
  const teams: [string, string][] = [];
  
  for (let i = 0; i < remainingPlayers.length - 1; i += 2) {
    if (i + 1 < remainingPlayers.length) {
      teams.push([remainingPlayers[i].id, remainingPlayers[i + 1].id]);
    }
  }
  
  // Create matches for remaining teams
  for (let i = 0; i < teams.length - 1 && matches.length < numCourts; i += 2) {
    if (i + 1 < teams.length) {
      matches.push({
        id: `r${roundIndex}-c${matches.length}`,
        roundIndex,
        courtIndex: matches.length,
        teamA: teams[i],
        teamB: teams[i + 1],
        scoreA: null,
        scoreB: null,
        isCompleted: false
      });
    }
  }
  
  // Players who don't fit into matches become byes
  const playersInMatches = new Set<string>();
  matches.forEach(m => [...m.teamA, ...m.teamB].forEach(id => playersInMatches.add(id)));
  const byes = players.filter(p => !playersInMatches.has(p.id)).map(p => p.id);
  
  return {
    index: roundIndex,
    matches,
    byes
  };
};