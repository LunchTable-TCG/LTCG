"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";
import type { FunctionReturnType } from "convex/server";
import { useAuth } from "../auth/useConvexAuthHook";

// Extract return types from Convex queries to avoid type depth issues
// Note: @ts-ignore is required here because FunctionReturnType<typeof api.X>
// triggers TS2589 during type extraction. The apiAny helper doesn't help here
// since we need the actual type for type inference, not runtime usage.
// @ts-ignore - TS2589: FunctionReturnType requires full api type which exceeds depth limit
type CurrentUserReturn = FunctionReturnType<typeof api.core.users.currentUser>;
// @ts-ignore - TS2589: FunctionReturnType requires full api type which exceeds depth limit
type UserInfoReturn = FunctionReturnType<typeof api.core.users.getUser>;

/**
 * Type-safe profile with optional stats fields
 * All stats fields are guaranteed to be present for current user, but may be undefined for other users
 */
export type ProfileWithStats = (CurrentUserReturn | UserInfoReturn) & {
  xp?: number;
  level?: number;
  totalWins?: number;
  totalLosses?: number;
  rankedElo?: number;
  casualRating?: number;
  activeDeckId?: string;
};

interface UseProfileReturn {
  profile: ProfileWithStats | undefined;
  isLoading: boolean;
  isCurrentUser: boolean;
}

/**
 * User profile data retrieval for current user or other players.
 *
 * Provides access to user profile information including stats, level, badges,
 * and deck information. Can fetch either the current user's profile or another
 * player's profile by ID. Automatically determines if viewing own profile.
 *
 * Features:
 * - Get current user profile (when no userId provided)
 * - Get other user profiles (when userId provided)
 * - Determine if viewing own profile
 * - Type-safe profile data (avoids TypeScript depth issues)
 *
 * @example
 * ```typescript
 * // Current user's profile
 * const { profile, isCurrentUser } = useProfile();
 *
 * console.log(`Level ${profile?.level}`);
 * console.log(`Username: ${profile?.username}`);
 *
 * // Other user's profile
 * const { profile: otherProfile } = useProfile(userId);
 *
 * console.log(`Viewing ${otherProfile?.username}`);
 * console.log(`Ranked Rating: ${otherProfile?.rankedRating}`);
 * ```
 *
 * @param userId - Optional user ID to fetch specific user's profile
 *
 * @returns {UseProfileReturn} Profile interface
 *
 * @throws {Error} When user is not authenticated
 */
export function useProfile(userId?: Id<"users">): UseProfileReturn {
  const { isAuthenticated } = useAuth();

  // Current user - explicit type annotation avoids TypeScript type depth errors
  const currentUser = useConvexQuery(apiAny.core.users.currentUser, isAuthenticated ? {} : "skip") as
    | CurrentUserReturn
    | null
    | undefined;

  // Other user - explicit type annotation avoids TypeScript type depth errors
  const otherUser = useConvexQuery(apiAny.core.users.getUser, userId ? { userId } : "skip") as
    | UserInfoReturn
    | null
    | undefined;

  const profile = userId ? (otherUser ?? undefined) : (currentUser ?? undefined);

  return {
    profile,
    isLoading: profile === undefined,
    isCurrentUser: !userId || (currentUser ? userId === currentUser._id : false),
  };
}
