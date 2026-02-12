/**
 * @module @ltcg/core/utils/user
 */

import { RankName, UserRankInfo } from "../types/user";

/**
 * Calculates user rank based on total games won.
 *
 * @param gamesWon Total number of games won across all modes
 * @returns Rank information including name and Tailwind color class
 */
export function getUserRank(gamesWon: number): UserRankInfo {
  if (gamesWon >= 500) return { name: "Legend", color: "text-yellow-400" };
  if (gamesWon >= 250) return { name: "Master", color: "text-purple-400" };
  if (gamesWon >= 100) return { name: "Diamond", color: "text-cyan-400" };
  if (gamesWon >= 50) return { name: "Platinum", color: "text-blue-400" };
  if (gamesWon >= 25) return { name: "Gold", color: "text-yellow-500" };
  if (gamesWon >= 10) return { name: "Silver", color: "text-gray-300" };
  return { name: "Bronze", color: "text-orange-400" };
}

/**
 * Calculates win rate percentage.
 *
 * @param wins Number of wins
 * @param losses Number of losses
 * @returns Win rate percentage (0-100)
 */
export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}
