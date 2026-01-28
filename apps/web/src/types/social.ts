/**
 * Social system types (friends, leaderboards, chat, match history).
 *
 * This module defines types for social features including:
 * - Leaderboards: Ranked player standings
 * - Friends: Friend relationships and requests
 * - Match History: Battle result tracking
 */

import type { Id } from "@convex/_generated/dataModel";
import type { LeaderboardEntry, FriendInfo as Friend, FriendRequest } from "./generated";

/**
 * Player entry in the competitive leaderboard.
 *
 * @example
 * ```typescript
 * const entry: LeaderboardEntry = {
 *   userId: "ju8s9d0..." as Id<"users">,
 *   username: "CardMaster99",
 *   rating: 1850,
 *   rank: 42,
 *   wins: 120,
 *   losses: 45,
 *   winRate: 72.7,
 *   gamesPlayed: 165,
 *   lastGameAt: 1234567890
 * };
 * ```
 *
 * @see BattleHistoryEntry - For individual match results
 */
export type { LeaderboardEntry };

/**
 * Friend relationship data from Convex backend.
 *
 * @example
 * ```typescript
 * const friend: Friend = {
 *   friendId: "ju8s9d0..." as Id<"users">,
 *   username: "BestFriend",
 *   level: 25,
 *   status: "online",
 *   lastOnline: 1234567890,
 *   friendsSince: 1234000000,
 *   gamesPlayed: 15
 * };
 * ```
 *
 * @see FriendRequest - For pending friend requests
 */
export type { Friend };

/**
 * Pending friend request data from Convex backend.
 *
 * @example
 * ```typescript
 * const request: FriendRequest = {
 *   _id: "jr3k5m8..." as Id<"friendRequests">,
 *   _creationTime: 1234567890,
 *   fromUserId: "ju8s9d0..." as Id<"users">,
 *   fromUsername: "NewPlayer",
 *   toUserId: "jv9t0e1..." as Id<"users">,
 *   status: "pending",
 *   createdAt: 1234567890
 * };
 * ```
 *
 * @see Friend - For accepted friend relationships
 */
export type { FriendRequest };

/**
 * Leaderboard data with caching metadata.
 *
 * @example
 * ```typescript
 * const data: LeaderboardData = {
 *   rankings: [entry1, entry2, entry3],
 *   lastUpdated: 1234567890,
 *   isCached: true
 * };
 * ```
 */
export interface LeaderboardData {
  /** Array of leaderboard entries sorted by rank */
  rankings: LeaderboardEntry[];
  /** Timestamp when the data was last refreshed */
  lastUpdated: number;
  /** Whether this data is from cache (vs. live query) */
  isCached: boolean;
}

/**
 * Individual match result in player's battle history.
 *
 * Valid game types:
 * - `"ranked"` - Competitive match affecting rating
 * - `"casual"` - Practice match with no rating impact
 * - `"story"` - Single-player story mode battle
 *
 * Valid results:
 * - `"win"` - Player won the match
 * - `"loss"` - Player lost the match
 *
 * @example
 * ```typescript
 * const entry: BattleHistoryEntry = {
 *   _id: "jm2k9m3..." as Id<"matchHistory">,
 *   gameType: "ranked",
 *   result: "win",
 *   opponentId: "jo5p8r1..." as Id<"users">,
 *   opponentUsername: "Rival42",
 *   ratingBefore: 1800,
 *   ratingAfter: 1825,
 *   ratingChange: 25,
 *   xpAwarded: 150,
 *   completedAt: 1234567890
 * };
 * ```
 *
 * @see LeaderboardEntry - For cumulative ranking data
 */
export interface BattleHistoryEntry {
  /** Unique match history entry ID */
  _id: Id<"matchHistory">;
  /** Type of game played */
  gameType: "ranked" | "casual" | "story";
  /** Match outcome */
  result: "win" | "loss";
  /** Opponent's user ID */
  opponentId: Id<"users">;
  /** Opponent's display name */
  opponentUsername: string;
  /** Player's rating before the match */
  ratingBefore: number;
  /** Player's rating after the match */
  ratingAfter: number;
  /** Change in rating (positive for win, negative for loss) */
  ratingChange: number;
  /** Experience points awarded (optional, may be 0) */
  xpAwarded?: number;
  /** Timestamp when the match was completed */
  completedAt: number;
}

/**
 * Result of sending a friend request.
 *
 * @example
 * ```typescript
 * // Standard friend request
 * const result: FriendRequestResult = {
 *   success: true,
 *   autoAccepted: false
 * };
 *
 * // Mutual friend request (auto-accepted)
 * const mutualResult: FriendRequestResult = {
 *   success: true,
 *   autoAccepted: true
 * };
 * ```
 */
export interface FriendRequestResult {
  /** Indicates if the request was sent successfully */
  success: boolean;
  /** Whether the request was automatically accepted (mutual request) */
  autoAccepted: boolean;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a LeaderboardEntry.
 *
 * @param value - The value to check
 * @returns True if the value is a LeaderboardEntry
 *
 * @example
 * ```typescript
 * const data = await fetchRankings();
 * if (isLeaderboardEntry(data)) {
 *   console.log(`Rank #${data.rank}: ${data.username}`);
 * }
 * ```
 */
export function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  return typeof value === "object" && value !== null && "userId" in value && "rating" in value;
}

/**
 * Type guard to check if a value is a Friend.
 *
 * @param value - The value to check
 * @returns True if the value is a Friend
 *
 * @example
 * ```typescript
 * const data = await fetchSocial();
 * if (isFriend(data)) {
 *   console.log(`Friend: ${data.username} (${data.status})`);
 * }
 * ```
 */
export function isFriend(value: unknown): value is Friend {
  return typeof value === "object" && value !== null && "friendId" in value;
}
