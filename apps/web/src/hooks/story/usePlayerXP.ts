"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";

/**
 * usePlayerXP Hook
 *
 * XP and level tracking:
 * - Current XP and level
 * - Lifetime XP
 * - Progress to next level
 * - Percentage calculation
 */
export function usePlayerXP() {
  const { token } = useAuth();

  const xpInfo = useQuery(
    api.story.getPlayerXPInfo,
    token ? { token } : "skip"
  );

  return {
    xpInfo,
    currentXP: xpInfo?.currentXP || 0,
    currentLevel: xpInfo?.currentLevel || 1,
    lifetimeXP: xpInfo?.lifetimeXP || 0,
    xpForNextLevel: xpInfo?.xpForNextLevel || 100,
    levelProgress: xpInfo?.levelProgress || 0,
    percentToNextLevel: xpInfo
      ? (xpInfo.currentXP / (xpInfo.xpForNextLevel || 100)) * 100
      : 0,
    isLoading: xpInfo === undefined,
  };
}
