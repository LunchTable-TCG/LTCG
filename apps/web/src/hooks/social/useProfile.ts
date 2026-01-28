"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useAuth } from "../auth/useConvexAuthHook";

// Extract return types from Convex queries to avoid type depth issues
type CurrentUserReturn = FunctionReturnType<typeof api.core.users.currentUser>;
type UserInfoReturn = FunctionReturnType<typeof api.core.users.getUser>;

interface UseProfileReturn {
  profile: CurrentUserReturn | UserInfoReturn | undefined;
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
  const currentUser = useQuery(api.core.users.currentUser, isAuthenticated ? {} : "skip") as
    | CurrentUserReturn
    | undefined;

  // Other user - explicit type annotation avoids TypeScript type depth errors
  const otherUser = useQuery(api.core.users.getUser, userId ? { userId } : "skip") as
    | UserInfoReturn
    | undefined;

  const profile = userId ? otherUser : currentUser;

  return {
    profile,
    isLoading: profile === undefined,
    isCurrentUser: !userId || (currentUser ? userId === currentUser._id : false),
  };
}
