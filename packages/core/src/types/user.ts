/**
 * @module @ltcg/core/types/user
 */

export type RankName =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Master"
  | "Legend";

export interface UserRankInfo {
  name: RankName;
  color: string;
}

export interface UserStats {
  level: number;
  xp: number;
  totalWins: number;
  totalLosses: number;
  rankedWins: number;
  rankedLosses: number;
  rankedElo: number;
  casualWins: number;
  casualLosses: number;
  casualRating: number;
  storyWins: number;
}
