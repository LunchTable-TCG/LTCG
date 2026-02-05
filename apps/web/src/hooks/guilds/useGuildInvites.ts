"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

/**
 * Hook for managing guild invites (both sent and received)
 *
 * @param guildId - Optional guild ID for owner view of pending invites
 * @returns Invite data and actions
 */
export function useGuildInvites(guildId?: Id<"guilds">) {
  const { isAuthenticated } = useAuth();

  // User's pending invites (invites they've received)
  const myInvites = useQuery(api.social.guilds.getMyInvites, isAuthenticated ? {} : "skip");

  // Guild's pending invites (owner only)
  const guildPendingInvites = useQuery(
    api.social.guilds.getGuildPendingInvites,
    guildId ? { guildId } : "skip"
  );

  // Mutations
  const sendInviteMutation = useMutation(api.social.guilds.sendInvite);
  const acceptInviteMutation = useMutation(api.social.guilds.acceptInvite);
  const declineInviteMutation = useMutation(api.social.guilds.declineInvite);
  const cancelInviteMutation = useMutation(api.social.guilds.cancelInvite);

  // Actions
  const sendInvite = async (targetGuildId: Id<"guilds">, username: string) => {
    try {
      await sendInviteMutation({ guildId: targetGuildId, username });
      toast.success(`Invite sent to ${username}`);
    } catch (error) {
      const message = handleHookError(error, "Failed to send invite");
      toast.error(message);
      throw error;
    }
  };

  const acceptInvite = async (inviteId: Id<"guildInvites">) => {
    try {
      await acceptInviteMutation({ inviteId });
      toast.success("Joined guild!");
    } catch (error) {
      const message = handleHookError(error, "Failed to accept invite");
      toast.error(message);
      throw error;
    }
  };

  const declineInvite = async (inviteId: Id<"guildInvites">) => {
    try {
      await declineInviteMutation({ inviteId });
      toast.success("Invite declined");
    } catch (error) {
      const message = handleHookError(error, "Failed to decline invite");
      toast.error(message);
      throw error;
    }
  };

  const cancelInvite = async (inviteId: Id<"guildInvites">) => {
    try {
      await cancelInviteMutation({ inviteId });
      toast.success("Invite cancelled");
    } catch (error) {
      const message = handleHookError(error, "Failed to cancel invite");
      toast.error(message);
      throw error;
    }
  };

  return {
    // Data
    myInvites: myInvites ?? [],
    guildPendingInvites: guildPendingInvites ?? [],
    hasInvites: (myInvites?.length ?? 0) > 0,
    isLoading: myInvites === undefined,
    // Actions
    sendInvite,
    acceptInvite,
    declineInvite,
    cancelInvite,
  };
}
