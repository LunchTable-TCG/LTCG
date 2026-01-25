"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";

/**
 * useLeaderboard Hook
 *
 * Rankings and leaderboards with filtering:
 * - View cached leaderboards (updated every 5 min)
 * - Get user's rank
 * - View battle history
 * - Filter by type (ranked/casual/story) and segment (all/humans/ai)
 */
export function useLeaderboard(
  type: "ranked" | "casual" | "story" = "ranked",
  segment: "all" | "humans" | "ai" = "all"
) {
  const { token } = useAuth();

  // Cached leaderboard (updated every 5 min)
  const leaderboard = useQuery(api.leaderboards.getCachedLeaderboard, {
    type,
    segment,
  });

  // User's rank
  const myRank = useQuery(
    api.leaderboards.getUserRank,
    token ? { token, type } : "skip"
  );

  // Battle history - TODO: API not yet implemented
  // const battleHistory = useQuery(
  //   api.leaderboards.getBattleHistory,
  //   token ? { token } : "skip"
  // );

  return {
    rankings: leaderboard?.rankings || [],
    myRank,
    battleHistory: [], // TODO: Implement when API is available
    lastUpdated: leaderboard?.lastUpdated,
    isLoading: leaderboard === undefined,
  };
}
