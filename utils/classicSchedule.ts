// Americano mode (internal mode 'classic'): whole schedule at start and extra rounds on demand.
// Two variants (`prioritizeSkill`):
// - Classic: no skill, no standings. Rotating: short schedule — everyone faces everyone at least once,
//   no partner repeats, same matches (±1). Fixed pairs: round robin. The schedule wins: with fewer
//   courts someone may rest twice in a row if there's no other way.
// - By skill: every round built for even matches by skill; nobody rests twice in a row
//   (when fewer rest than play); some partnerships/opponents repeat.
import type { Pair, Player, Round } from '../types.ts';
import { avoidBackToBackRests, generateAdditionalRound, generateAmericanoSchedule, generateEventRound, packRounds, shortScheduleRounds } from './scheduler.ts';
import { generateFixedPairsRound, generateFixedPairsSchedule } from './fixedPairs.ts';

export interface ClassicSetup {
  players: Player[];
  pairs: Pair[]; // fixed pairs (only used when `fixed`)
  fixed: boolean;
  balanced: boolean; // By skill variant (tournament.prioritizeSkill); false = Classic
}

/** Classic ignores skill: everyone counts the same */
export const withoutSkill = (players: Player[]): Player[] => players.map(p => ({ ...p, skillLevel: 'medium' }));

/**
 * Rounds of an Americano: rotating → the short schedule (about half the players; full Whist/Berger
 * length outside its range); fixed pairs → pairs − 1 (pairs if odd). Fewer courts spread the same
 * matches over more rounds.
 */
export const classicRoundCount = (count: number, fixed: boolean, numCourts: number): number => {
  if (count < (fixed ? 2 : 4)) return 0;
  const fullRounds = fixed ? (count % 2 ? count : count - 1) : (shortScheduleRounds(count) ?? (count % 4 === 0 ? count - 1 : count));
  const perRound = fixed ? Math.floor(count / 2) : Math.floor(count / 4);
  return numCourts > 0 && perRound > numCourts ? Math.ceil(fullRounds * perRound / numCourts) : fullRounds;
};

/** Next round on demand ("+" button); the By skill variant builds its whole schedule with it */
export const nextClassicRound = ({ players, pairs, fixed, balanced }: ClassicSetup, previous: Round[], numCourts: number): Round =>
  fixed
    ? generateFixedPairsRound(pairs, players, previous, previous.length, numCourts, balanced ? {} : { strength: () => 2 })
    : balanced
    ? generateEventRound(players, players, previous, previous.length, numCourts)
    : generateAdditionalRound(withoutSkill(players), previous, previous.length, numCourts);

/** Whole schedule for the chosen variant (see the header) */
export const buildClassicSchedule = (setup: ClassicSetup, numCourts: number): Round[] => {
  const { players, pairs, fixed, balanced } = setup;
  if (!balanced) {
    const playerIds = players.map(p => p.id);
    const full = fixed ? generateFixedPairsSchedule(pairs) : generateAmericanoSchedule(withoutSkill(players));
    return avoidBackToBackRests(packRounds(full, numCourts, playerIds), playerIds);
  }
  const total = classicRoundCount(fixed ? pairs.length : players.length, fixed, numCourts);
  const rounds: Round[] = [];
  while (rounds.length < total) rounds.push(nextClassicRound(setup, rounds, numCourts));
  return rounds;
};
