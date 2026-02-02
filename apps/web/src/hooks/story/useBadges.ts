"use client";

import type { Badge } from "@/types";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuth } from "../auth/useConvexAuthHook";

interface UseBadgesReturn {
  badges: Badge[];
  badgeCount: number;
  badgesByType: Record<string, Badge[]>;
  totalBadges: number;
  isLoading: boolean;
}

/**
 * Player achievement badge collection and display.
 *
 * Provides access to earned badges from story mode, achievements, and special
 * events. Badges are visual representations of player accomplishments and can
 * be displayed on profiles.
 *
 * Features:
 * - View all earned badges
 * - Get total badge count
 * - Filter badges by type
 * - Track badge collection progress
 *
 * @example
 * ```typescript
 * const {
 *   badges,
 *   badgeCount,
 *   badgesByType,
 *   totalBadges
 * } = useBadges();
 *
 * // Display badges
 * badges.forEach(badge => {
 *   console.log(`${badge.name}: ${badge.description}`);
 * });
 *
 * // Show progress
 * console.log(`Earned ${badgeCount}/${totalBadges} badges`);
 *
 * // Filter by type
 * const storyBadges = badgesByType.story;
 * ```
 *
 * @returns {UseBadgesReturn} Badge collection interface
 *
 * @throws {Error} When user is not authenticated
 */
export function useBadges(): UseBadgesReturn {
  const { isAuthenticated } = useAuth();

  const badgesData = useQuery(api.progression.story.getPlayerBadges, isAuthenticated ? {} : "skip");

  return {
    badges: (badgesData?.badges as Badge[]) || [],
    badgeCount: badgesData?.badges?.length || 0,
    badgesByType: (badgesData?.badgesByType as Record<string, Badge[]>) || {},
    totalBadges: badgesData?.totalBadges || 0,
    isLoading: badgesData === undefined,
  };
}
