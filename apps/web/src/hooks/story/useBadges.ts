"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";

/**
 * useBadges Hook
 *
 * Achievement badges:
 * - View player badges
 * - Get badge count
 */
export function useBadges() {
  const { token } = useAuth();

  const badgesData = useQuery(
    api.story.getPlayerBadges,
    token ? { token } : "skip"
  );

  return {
    badges: badgesData?.badges || [],
    badgeCount: badgesData?.badges?.length || 0,
    badgesByType: badgesData?.badgesByType || {},
    totalBadges: badgesData?.totalBadges || 0,
    isLoading: badgesData === undefined,
  };
}
