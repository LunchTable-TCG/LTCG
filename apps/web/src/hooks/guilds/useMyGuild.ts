"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useAuth } from "../auth/useConvexAuthHook";

/**
 * Hook for getting the current user's guild membership
 *
 * @returns Guild data if user is in a guild, null otherwise
 */
export function useMyGuild() {
  const { isAuthenticated } = useAuth();

  const myGuild = useQuery(api.social.guilds.getMyGuild, isAuthenticated ? {} : "skip");
  const hasGuild = useQuery(api.social.guilds.hasGuild, isAuthenticated ? {} : "skip");

  return {
    guild: myGuild ?? null,
    hasGuild: hasGuild ?? false,
    isLoading: myGuild === undefined,
    isOwner: myGuild?.myRole === "owner",
    isMember: myGuild !== null && myGuild !== undefined,
  };
}
