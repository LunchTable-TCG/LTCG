"use client";

import { useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

// Module-scope references to avoid TS2589
const getMyGuildQuery = api.social.guilds.core.getMyGuild;
const hasGuildQuery = api.social.guilds.core.hasGuild;
const leaveGuildMutationRef = api.social.guilds.members.leaveGuild;

/**
 * Hook for getting the current user's guild membership
 *
 * @returns Guild data if user is in a guild, null otherwise
 */
export function useMyGuild() {
  const { isAuthenticated } = useAuth();

  const myGuild = useConvexQuery(getMyGuildQuery, isAuthenticated ? {} : "skip");
  const hasGuild = useConvexQuery(hasGuildQuery, isAuthenticated ? {} : "skip");

  // Mutations
  const leaveGuildMutation = useConvexMutation(leaveGuildMutationRef);

  // Actions
  const leaveGuild = async () => {
    if (!myGuild?._id) {
      toast.error("Not in a guild");
      return;
    }
    try {
      await leaveGuildMutation({ guildId: myGuild._id });
      toast.success("Left guild");
    } catch (error) {
      const message = handleHookError(error, "Failed to leave guild");
      toast.error(message);
      throw error;
    }
  };

  return {
    guild: myGuild ?? null,
    hasGuild: hasGuild ?? false,
    isLoading: myGuild === undefined,
    isOwner: myGuild?.myRole === "owner",
    isMember: myGuild !== null && myGuild !== undefined,
    myRole: myGuild?.myRole ?? null,
    leaveGuild,
  };
}
