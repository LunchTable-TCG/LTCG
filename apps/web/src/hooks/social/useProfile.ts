"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useProfile Hook
 *
 * User profile data:
 * - Get current user profile
 * - Get other user profiles
 * - Determine if viewing own profile
 */
export function useProfile(userId?: Id<"users">) {
  const { token } = useAuth();

  // Current user
  const currentUser = useQuery(
    api.users.currentUser,
    token ? { token } : "skip"
  );

  // Other user
  const otherUser = useQuery(
    api.users.getUser,
    userId ? { userId } : "skip"
  );

  const profile = userId ? otherUser : currentUser;

  return {
    profile,
    isLoading: profile === undefined,
    isCurrentUser: !userId || (currentUser && userId === currentUser._id),
  };
}
