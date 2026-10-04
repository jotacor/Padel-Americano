// Random mode (mode 'classic'): full schedule at start and extra rounds on demand.
// Nobody rests two rounds in a row whenever there are at least as many players on court as resting.
import type { Pair, Player, Round } from '../types.ts';
import {
  avoidBackToBackRests, generateAdditionalRound, generateAmericanoSchedule, generateEventRound,
  generateSkillBalancedSchedule, packRounds, regenerateFromBackToBackRest,
} from './scheduler.ts';
import { generateFixedPairsRound, generateFixedPairsSchedule } from './fixedPairs.ts';

export interface ClassicSetup {
  players: Player[];
  pairs: Pair[]; // fixed pairs (only used when `fixed`)
  fixed: boolean; // fixed pairs: round robin between pairs
  balanced: boolean; // "Prioritize initial skill": League algorithm for every round
}

/** Next round on demand ("+" button), also used to finish a schedule without back-to-back rests */
export const nextClassicRound = ({ players, pairs, fixed, balanced }: ClassicSetup, previous: Round[], numCourts: number): Round =>
  fixed
    ? generateFixedPairsRound(pairs, players, previous, previous.length, numCourts)
    : balanced
    ? generateEventRound(players, players, previous, previous.length, numCourts)
    : generateAdditionalRound(players, previous, previous.length, numCourts);

/**
 * Whole schedule. Fewer courts than players ÷ 4: same matches spread over more rounds.
 * Nobody rests twice in a row: rounds are reordered, and if that's not enough the rest of the
 * schedule is generated round by round like "+" rounds.
 */
export const buildClassicSchedule = (setup: ClassicSetup, numCourts: number): Round[] => {
  const { players, pairs, fixed, balanced } = setup;
  const full = fixed ? generateFixedPairsSchedule(pairs) : balanced ? generateSkillBalancedSchedule(players) : generateAmericanoSchedule(players);
  const playerIds = players.map(p => p.id);
  return regenerateFromBackToBackRest(
    avoidBackToBackRests(packRounds(full, numCourts, playerIds), playerIds),
    previous => nextClassicRound(setup, previous, numCourts)
  );
};
