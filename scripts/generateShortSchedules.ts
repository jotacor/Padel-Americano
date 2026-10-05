// Builds utils/shortSchedules.ts: Americano Classic schedules (rotating partners) for 4–28 players (max expected 24; 28 as the extreme; more → full schedule).
// Goal: everyone faces everyone at least once, nobody repeats a partner, matches per player equal
// (±1 when players aren't a multiple of 4), in as few rounds as possible (about half the players).
// Run: node scripts/generateShortSchedules.ts  (deterministic; takes a few minutes)
import { readFileSync, writeFileSync } from 'node:fs';
import { generateAmericanoSchedule } from '../utils/scheduler.ts';

// node scripts/generateShortSchedules.ts                → all sizes, writes utils/shortSchedules.ts
// node scripts/generateShortSchedules.ts 12 16 part.json → only those sizes, saved as JSON (to run in parallel)
// node scripts/generateShortSchedules.ts --merge a.json b.json … → writes utils/shortSchedules.ts from parts
const MERGE = process.argv[2] === '--merge';
const [MIN_PLAYERS, MAX_PLAYERS] = !MERGE && process.argv[2] ? process.argv.slice(2, 4).map(Number) : [4, 28];
const PART = !MERGE && process.argv[2] ? process.argv[4] : undefined;

/** Deterministic PRNG (mulberry32) */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Who rests in each round: consecutive blocks around the roster → rests differ by at most 1, never twice in a row */
const restPlan = (n: number, rounds: number, courts: number): Set<number>[] => {
  const b = n - courts * 4;
  return Array.from({ length: rounds }, (_, r) => new Set(Array.from({ length: b }, (_, i) => (r * b + i) % n)));
};

type Group = [number, number, number, number]; // [a, b] vs [c, d]

/** Simulated annealing over the groupings of each round (who plays is fixed by the rest plan) */
const search = (n: number, rounds: number, courts: number, seed: number, iterations: number): Group[][] | null => {
  const rand = rng(seed);
  const rests = restPlan(n, rounds, courts);
  const schedule: Group[][] = rests.map(resting => {
    const playing = Array.from({ length: n }, (_, i) => i).filter(i => !resting.has(i));
    for (let i = playing.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [playing[i], playing[j]] = [playing[j], playing[i]]; }
    return Array.from({ length: courts }, (_, c) => playing.slice(c * 4, c * 4 + 4) as Group);
  });
  const part = new Int16Array(n * n), opp = new Int16Array(n * n);
  const add = (g: Group, s: number) => {
    const [a, b, c, d] = g;
    part[a * n + b] += s; part[b * n + a] += s; part[c * n + d] += s; part[d * n + c] += s;
    for (const x of [a, b]) for (const y of [c, d]) { opp[x * n + y] += s; opp[y * n + x] += s; }
  };
  schedule.forEach(r => r.forEach(g => add(g, 1)));
  // cost: missing opponent pairs and repeated partners weigh a lot; facing someone 3+ times a little
  const pairCost = (x: number, y: number) => {
    const p = part[x * n + y], o = opp[x * n + y];
    return (o === 0 ? 100 : 0) + (p > 1 ? 100 * (p - 1) : 0) + (o > 2 ? o - 2 : 0);
  };
  // hard = the guarantees (nobody unmet as opponent, no repeated partner); success when it reaches 0
  const pairHard = (x: number, y: number) => (opp[x * n + y] === 0 ? 1 : 0) + Math.max(0, part[x * n + y] - 1);
  let cost = 0, hard = 0;
  for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) { cost += pairCost(x, y); hard += pairHard(x, y); }
  // Cyclic temperature (reheats every CYCLE moves) so the search doesn't freeze in a poor valley
  const CYCLE = 300_000;
  for (let it = 0; it < iterations && hard > 0; it++) {
    const r = Math.floor(rand() * rounds), round = schedule[r];
    const g1 = Math.floor(rand() * courts), g2 = Math.floor(rand() * courts);
    const i1 = Math.floor(rand() * 4), i2 = Math.floor(rand() * 4);
    if (g1 === g2 && (i1 >> 1) === (i2 >> 1)) continue; // same team: no change
    const A = round[g1], B = round[g2];
    const touched = new Set<number>([...A, ...B]);
    const before = () => {
      let s = 0, h = 0;
      for (const x of touched) for (let y = 0; y < n; y++) if (y !== x && (!touched.has(y) || y > x)) { s += pairCost(x, y); h += pairHard(x, y); }
      return [s, h];
    };
    const [old, oldHard] = before();
    add(A, -1); if (g2 !== g1) add(B, -1);
    [A[i1], B[i2]] = [B[i2], A[i1]];
    add(A, 1); if (g2 !== g1) add(B, 1);
    const [now, nowHard] = before();
    const delta = now - old;
    const temp = 0.15 + 2.85 * Math.pow(1 - (it % CYCLE) / CYCLE, 3);
    if (delta <= 0 || rand() < Math.exp(-delta / temp)) { cost += delta; hard += nowHard - oldHard; }
    else { add(A, -1); if (g2 !== g1) add(B, -1); [A[i1], B[i2]] = [B[i2], A[i1]]; add(A, 1); if (g2 !== g1) add(B, 1); }
  }
  if (process.env.DEBUG) console.log(`  n=${n} R=${rounds} seed=${seed}: hard ${hard}, cost ${cost}`);
  return hard === 0 ? schedule : null;
};

const ITERATIONS = Number(process.env.ITERATIONS || 6_000_000);

/**
 * Smallest subset of the full Classic schedule (partners never repeat there) where everyone faces
 * everyone, with matches per player within 1 (exact search, bounded). Optimal for 8 and 16 players.
 */
const classicSubset = (n: number): Group[][] | null => {
  const players = Array.from({ length: n }, (_, i) => ({ id: String(i), name: '', skillLevel: 'medium' as const }));
  const full = generateAmericanoSchedule(players, true).map(r => r.matches.map(m => [...m.teamA, ...m.teamB].map(Number) as Group));
  const all = (n * (n - 1)) / 2;
  const key = (x: number, y: number) => (x < y ? x * n + y : y * n + x);
  const opps = full.map(r => new Set(r.flatMap(([a, b, c, d]) => [a, b].flatMap(x => [c, d].map(y => key(x, y))))));
  const maxNew = Math.max(...opps.map(o => o.size));
  for (let size = Math.ceil((n - 1) / 2); size < full.length; size++) {
    let budget = 3_000_000, found: number[] | null = null;
    const pick: number[] = [];
    const rec = (start: number, covered: Set<number>) => {
      if (found || --budget < 0) return;
      if (pick.length === size) {
        if (covered.size < all) return;
        const played = new Array(n).fill(0);
        pick.forEach(r => full[r].forEach(g => g.forEach(p => played[p]++)));
        if (Math.max(...played) - Math.min(...played) <= 1) found = [...pick];
        return;
      }
      if (covered.size + maxNew * (size - pick.length) < all) return;
      for (let r = start; r < full.length && !found; r++) {
        const next = new Set(covered); opps[r].forEach(x => next.add(x));
        pick.push(r); rec(r + 1, next); pick.pop();
      }
    };
    rec(0, new Set());
    if (found) return (found as number[]).map(r => full[r]);
    if (budget < 0) return null; // search too big for this size: give up on subsets
  }
  return null;
};
// Found by exhaustive search: with 7 players (1 court) facing everyone and never resting twice in a
// row can't both hold; Classic keeps the schedule (everyone faces everyone, 4 matches each, no partner repeats)
const KNOWN: Record<number, Group[][]> = {
  7: [[[0, 1, 2, 3]], [[0, 2, 1, 3]], [[0, 4, 1, 5]], [[0, 3, 4, 6]], [[1, 4, 5, 6]], [[2, 5, 3, 6]], [[2, 6, 4, 5]]],
};

/** One character per player slot (up to 62 players); must match `SLOT_CHARS` in utils/scheduler.ts */
const SLOT_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const out: Record<number, Group[][]> = {};
if (MERGE) for (const f of process.argv.slice(3)) Object.assign(out, JSON.parse(readFileSync(f, 'utf8')));
for (let n = MIN_PLAYERS; n <= MAX_PLAYERS && !MERGE; n++) {
  if (KNOWN[n]) { out[n] = KNOWN[n]; console.log(`${n} players: ${KNOWN[n].length} rounds (known)`); continue; }
  const courts = Math.floor(n / 4), need = Math.ceil((n - 1) / 2), b = n - courts * 4;
  // fewest rounds where the player resting most still plays `need` matches
  let rounds = Math.ceil((n * need) / (courts * 4));
  while (rounds - Math.ceil((rounds * b) / n) < need) rounds++;
  const t0 = Date.now();
  const subset = classicSubset(n);
  // Never longer than the full schedule (or a shorter subset of it): if nothing shorter is found, that one stays
  const players = Array.from({ length: n }, (_, i) => ({ id: String(i), name: '', skillLevel: 'medium' as const }));
  const fullSchedule = generateAmericanoSchedule(players, true).map(r => r.matches.map(m => [...m.teamA, ...m.teamB].map(Number) as Group));
  const fallback = subset ?? fullSchedule;
  // The full schedule doesn't always make everyone face everyone (e.g. 7 players): then search further
  const facesAll = (sch: Group[][]) => new Set(sch.flatMap(r => r.flatMap(([a, b, c, d]) => [a, b].flatMap(x => [c, d].map(y => Math.min(x, y) * n + Math.max(x, y)))))).size === (n * (n - 1)) / 2;
  const limit = facesAll(fallback) ? fallback.length - 1 : fallback.length + 4;
  let found: Group[][] | null = null;
  for (; !found && rounds <= limit; rounds++) {
    for (let seed = 1; seed <= 4 && !found; seed++) found = search(n, rounds, courts, seed * 1000 + n, ITERATIONS);
    if (found) break;
  }
  const best = found && (found.length < fallback.length || !facesAll(fallback)) ? found : fallback;
  out[n] = best;
  console.log(`${n} players: ${best.length} rounds${best === subset ? ' (Classic subset)' : best === fullSchedule ? ' (full schedule, not shorter)' : ''} (${Date.now() - t0} ms)`);
}

if (PART) { writeFileSync(PART, JSON.stringify(out)); process.exit(0); }
const body = Object.entries(out).map(([n, rounds]) =>
  `  ${n}: '${rounds.map(r => r.map(g => g.map(x => SLOT_CHARS[x]).join('')).join(' ')).join('/')}',`).join('\n');
writeFileSync(new URL('../utils/shortSchedules.ts', import.meta.url), `// GENERATED by scripts/generateShortSchedules.ts — do not edit by hand.
// Americano Classic (rotating partners): everyone faces everyone at least once, no partner repeats,
// matches per player equal (±1 when players aren't a multiple of 4), about half as many rounds as players.
// Per player count: rounds separated by '/', matches by ' ', each match = 4 player slots (ab vs cd), one char each: 0-9 a-z A-Z.
export const SHORT_SCHEDULES: Record<number, string> = {
${body}
};
`);
