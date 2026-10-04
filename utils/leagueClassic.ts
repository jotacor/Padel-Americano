// League Classic: no skill, no standings — a normal league where everyone plays with and against
// everyone. The plan is the Americano Classic schedule for the whole roster (fixed pairs: round robin;
// rotating: partner everyone once). Each round plays the plan's pending matches whose players are
// all present: whoever rested and whoever played least first, then plan order (the schedule wins over rests). Courts left over are filled with the
// present players who have nothing pending (rotation only). New players/pairs join the plan.
import type { Match, Pair, Player, Round } from '../types.ts';
import { avoidBackToBackRests, generateAmericanoSchedule, generateEventRound, optimizeCourtAssignments, packRounds } from './scheduler.ts';
import { generateFixedPairsRound, generateFixedPairsSchedule } from './fixedPairs.ts';
import { withoutSkill } from './classicSchedule.ts';

const teamKey = (t: Pair) => [...t].sort().join('+');
const meetingKey = (m: Match) => [teamKey(m.teamA), teamKey(m.teamB)].sort().join('|');
const playersOf = (m: Match) => [...m.teamA, ...m.teamB];

/**
 * @param players every player of the tournament (roster order = plan order)
 * @param active ids of the players present this round
 * @param pairs fixed pairs (all of them), or null for rotating partners
 */
export const generateLeagueClassicRound = (
  players: Player[],
  active: Set<string>,
  pairs: Pair[] | null,
  existingRounds: Round[],
  roundIndex: number,
  numCourts: number
): Round => {
  const done = existingRounds.flatMap(r => r.matches);
  const planRounds = pairs ? generateFixedPairsSchedule(pairs, false) : generateAmericanoSchedule(withoutSkill(players));

  // Everyone present and every round so far as planned: play the Americano Classic schedule as is
  // (same rounds, same rests) — only absences or court changes need the pending-match logic below
  if (players.every(p => active.has(p.id))) {
    const ids = players.map(p => p.id);
    const planned = avoidBackToBackRests(packRounds(planRounds, numCourts, ids), ids);
    const asPlanned = existingRounds.every((r, i) => planned[i]
      && r.matches.map(meetingKey).sort().join() === planned[i].matches.map(meetingKey).sort().join());
    if (asPlanned && planned[roundIndex]) {
      const r = planned[roundIndex];
      return { ...r, index: roundIndex, matches: r.matches.map(m => ({ ...m, roundIndex, id: `r${roundIndex}-c${m.courtIndex}` })) };
    }
  }
  const plan = planRounds.flatMap(r => r.matches);

  // Pending: not played yet (fixed: that meeting; rotating: neither partnership) and everyone present
  const played = new Set(pairs ? done.map(meetingKey) : done.flatMap(m => [teamKey(m.teamA), teamKey(m.teamB)]));
  const pending = plan.filter(m => playersOf(m).every(id => active.has(id))
    && (pairs ? !played.has(meetingKey(m)) : !played.has(teamKey(m.teamA)) && !played.has(teamKey(m.teamB))));

  // Fair order: matches with whoever rested last round first, then those who played least, then plan order
  const rested = new Set(existingRounds[existingRounds.length - 1]?.byes ?? []);
  const playedCount = new Map<string, number>();
  done.forEach(m => playersOf(m).forEach(id => playedCount.set(id, (playedCount.get(id) ?? 0) + 1)));
  const restedIn = (m: Match) => playersOf(m).filter(id => rested.has(id)).length;
  const load = (m: Match) => playersOf(m).reduce((sum, id) => sum + (playedCount.get(id) ?? 0), 0);
  pending.sort((a, b) => restedIn(b) - restedIn(a) || load(a) - load(b)); // stable: plan order within ties

  // As many courts as possible with pending matches, taken in that order
  let best: Match[] = [];
  let budget = 20_000;
  const busy = new Set<string>();
  const chosen: Match[] = [];
  const search = (from: number) => {
    if (chosen.length > best.length) best = [...chosen];
    if (best.length === numCourts || --budget < 0) return;
    if (chosen.length + (pending.length - from) <= best.length) return;
    for (let k = from; k < pending.length && best.length < numCourts && budget >= 0; k++) {
      const ids = playersOf(pending[k]);
      if (ids.some(id => busy.has(id))) continue;
      ids.forEach(id => busy.add(id)); chosen.push(pending[k]);
      search(k + 1);
      ids.forEach(id => busy.delete(id)); chosen.pop();
    }
  };
  search(0);

  // Courts left: present players with nothing pending play a rotation-only round among themselves
  const playing = new Set(best.flatMap(playersOf));
  const left = numCourts - best.length;
  let extra: Match[] = [];
  if (left > 0) {
    const idle = players.filter(p => active.has(p.id) && !playing.has(p.id));
    const idlePairs = pairs?.filter(pr => pr.every(id => active.has(id) && !playing.has(id)));
    if (pairs ? (idlePairs?.length ?? 0) >= 2 : idle.length >= 4) {
      extra = (pairs
        ? generateFixedPairsRound(idlePairs!, players, existingRounds, roundIndex, left, { strength: () => 2 })
        : generateEventRound(idle, players, existingRounds, roundIndex, left, () => 2)
      ).matches;
    }
  }

  const history = new Map<string, number[]>(players.map(p => [p.id, []]));
  existingRounds.forEach(r => r.matches.forEach(m => playersOf(m).forEach(id => history.get(id)?.push(m.courtIndex))));
  const matches = optimizeCourtAssignments(
    [...best, ...extra].map((m, c) => ({ ...m, id: `r${roundIndex}-c${c}`, roundIndex, courtIndex: c, scoreA: null, scoreB: null, isCompleted: false })),
    history
  );
  const onCourt = new Set(matches.flatMap(playersOf));
  return { index: roundIndex, matches, byes: players.filter(p => active.has(p.id) && !onCourt.has(p.id)).map(p => p.id) };
};

