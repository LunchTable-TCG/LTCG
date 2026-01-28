"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuth } from "../auth/useConvexAuthHook";

interface UsePlayerXPReturn {
  xpInfo: ReturnType<typeof useQuery<typeof api.story.getPlayerXPInfo>> | undefined;
  currentXP: number;
  currentLevel: number;
  lifetimeXP: number;
  xpForNextLevel: number;
  levelProgress: number;
  percentToNextLevel: number;
  isLoading: boolean;
}

/**
 * Player experience points and level progression tracking.
 *
 * Provides comprehensive XP and leveling information including current level,
 * progress to next level, and lifetime XP. XP is earned through battles,
 * quests, and achievements. Levels unlock new features and rewards.
 *
 * Features:
 * - Current XP and level
 * - Lifetime XP tracking
 * - XP required for next level
 * - Progress percentage to next level
 * - Level progress tracking
 *
 * @example
 * ```typescript
 * const {
 *   currentXP,
 *   currentLevel,
 *   lifetimeXP,
 *   xpForNextLevel,
 *   percentToNextLevel
 * } = usePlayerXP();
 *
 * // Display level info
 * console.log(`Level ${currentLevel}`);
 * console.log(`XP: ${currentXP}/${xpForNextLevel}`);
 * console.log(`${percentToNextLevel.toFixed(1)}% to next level`);
 *
 * // Show lifetime progress
 * console.log(`Lifetime XP: ${lifetimeXP}`);
 * ```
 *
 * @returns {UsePlayerXPReturn} XP and level interface
 *
 * @throws {Error} When user is not authenticated
 */
export function usePlayerXP(): UsePlayerXPReturn {
  const { isAuthenticated } = useAuth();

  const xpInfo = useQuery(api.story.getPlayerXPInfo, isAuthenticated ? {} : "skip");

  return {
    xpInfo,
    currentXP: xpInfo?.currentXP || 0,
    currentLevel: xpInfo?.currentLevel || 1,
    lifetimeXP: xpInfo?.lifetimeXP || 0,
    xpForNextLevel: xpInfo?.xpForNextLevel || 100,
    levelProgress: xpInfo?.levelProgress || 0,
    percentToNextLevel: xpInfo ? (xpInfo.currentXP / (xpInfo.xpForNextLevel || 100)) * 100 : 0,
    isLoading: xpInfo === undefined,
  };
}
