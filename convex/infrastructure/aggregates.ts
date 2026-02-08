/**
 * Aggregate Component Configuration
 *
 * Defines TableAggregate instances for efficient leaderboard queries.
 * These aggregates maintain sorted indices and provide O(log n) rank lookups.
 *
 * Note: Aggregates sort in ASCENDING order by default. To get descending (highest first),
 * we use negative values for the sort key.
 */

import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { ELO_SYSTEM } from "../lib/constants";

// ============================================================================
// RANKED LEADERBOARDS
// ============================================================================

/** Ranked leaderboard - all players sorted by ELO (highest first via negative key) */
export const rankedLeaderboard = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "users";
}>(components.aggregate, {
  sortKey: (user) => -(user.rankedElo ?? ELO_SYSTEM.DEFAULT_RATING),
});

/** Ranked leaderboard - humans only */
export const rankedLeaderboardHumans = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "users";
  Namespace: "human" | "ai";
}>(components.aggregate, {
  sortKey: (user) => -(user.rankedElo ?? ELO_SYSTEM.DEFAULT_RATING),
  namespace: (user) => (user.isAiAgent ? "ai" : "human"),
});

/** Ranked leaderboard - AI agents only */
export const rankedLeaderboardAI = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "users";
  Namespace: "human" | "ai";
}>(components.aggregate, {
  sortKey: (user) => -(user.rankedElo ?? ELO_SYSTEM.DEFAULT_RATING),
  namespace: (user) => (user.isAiAgent ? "ai" : "human"),
});

// ============================================================================
// CASUAL LEADERBOARDS
// ============================================================================

/** Casual leaderboard - all players sorted by rating (highest first via negative key) */
export const casualLeaderboard = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "users";
}>(components.aggregate, {
  sortKey: (user) => -(user.casualRating ?? ELO_SYSTEM.DEFAULT_RATING),
});

/** Casual leaderboard - humans only */
export const casualLeaderboardHumans = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "users";
  Namespace: "human" | "ai";
}>(components.aggregate, {
  sortKey: (user) => -(user.casualRating ?? ELO_SYSTEM.DEFAULT_RATING),
  namespace: (user) => (user.isAiAgent ? "ai" : "human"),
});

/** Casual leaderboard - AI agents only */
export const casualLeaderboardAI = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "users";
  Namespace: "human" | "ai";
}>(components.aggregate, {
  sortKey: (user) => -(user.casualRating ?? ELO_SYSTEM.DEFAULT_RATING),
  namespace: (user) => (user.isAiAgent ? "ai" : "human"),
});

// ============================================================================
// STORY LEADERBOARDS
// ============================================================================

/** Story leaderboard - all players sorted by XP (highest first via negative key) */
export const storyLeaderboard = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "playerXP";
}>(components.aggregate, {
  sortKey: (xp) => -(xp.currentXP ?? 0),
});

/** Story leaderboard - humans only (segment filtering at query time) */
export const storyLeaderboardHumans = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "playerXP";
}>(components.aggregate, {
  sortKey: (xp) => -(xp.currentXP ?? 0),
});

/** Story leaderboard - AI agents only (segment filtering at query time) */
export const storyLeaderboardAI = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "playerXP";
}>(components.aggregate, {
  sortKey: (xp) => -(xp.currentXP ?? 0),
});
