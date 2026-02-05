"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

/**
 * Hook for viewing and managing a specific guild
 *
 * @param guildId - The ID of the guild to view
 * @returns Guild data, members, and management actions
 */
export function useGuild(guildId: Id<"guilds"> | null) {
  const { isAuthenticated } = useAuth();

  // Guild data
  const guild = useQuery(api.social.guilds.getGuild, guildId ? { guildId } : "skip");

  // Members (only if we have a guildId)
  const members = useQuery(api.social.guilds.getGuildMembers, guildId ? { guildId } : "skip");

  const onlineMemberCount = useQuery(
    api.social.guilds.getOnlineMemberCount,
    guildId ? { guildId } : "skip"
  );

  // Mutations
  const updateGuildMutation = useMutation(api.social.guilds.updateGuild);
  const deleteGuildMutation = useMutation(api.social.guilds.deleteGuild);
  const setProfileImageMutation = useMutation(api.social.guilds.setProfileImage);
  const setBannerImageMutation = useMutation(api.social.guilds.setBannerImage);
  const transferOwnershipMutation = useMutation(api.social.guilds.transferOwnership);
  const kickMemberMutation = useMutation(api.social.guilds.kickMember);

  // Actions
  const updateGuild = async (data: {
    name?: string;
    description?: string;
    visibility?: "public" | "private";
  }) => {
    if (!guildId) return;
    try {
      await updateGuildMutation({ guildId, ...data });
      toast.success("Guild updated");
    } catch (error) {
      const message = handleHookError(error, "Failed to update guild");
      toast.error(message);
      throw error;
    }
  };

  const deleteGuild = async () => {
    if (!guildId) return;
    try {
      await deleteGuildMutation({ guildId });
      toast.success("Guild deleted");
    } catch (error) {
      const message = handleHookError(error, "Failed to delete guild");
      toast.error(message);
      throw error;
    }
  };

  const setProfileImage = async (storageId: Id<"_storage">) => {
    if (!guildId) return;
    try {
      await setProfileImageMutation({ guildId, storageId });
      toast.success("Profile image updated");
    } catch (error) {
      const message = handleHookError(error, "Failed to update profile image");
      toast.error(message);
      throw error;
    }
  };

  const setBannerImage = async (storageId: Id<"_storage">) => {
    if (!guildId) return;
    try {
      await setBannerImageMutation({ guildId, storageId });
      toast.success("Banner image updated");
    } catch (error) {
      const message = handleHookError(error, "Failed to update banner image");
      toast.error(message);
      throw error;
    }
  };

  const transferOwnership = async (newOwnerId: Id<"users">) => {
    if (!guildId) return;
    try {
      await transferOwnershipMutation({ guildId, newOwnerId });
      toast.success("Ownership transferred");
    } catch (error) {
      const message = handleHookError(error, "Failed to transfer ownership");
      toast.error(message);
      throw error;
    }
  };

  const kickMember = async (userId: Id<"users">) => {
    if (!guildId) return;
    try {
      await kickMemberMutation({ guildId, userId });
      toast.success("Member removed");
    } catch (error) {
      const message = handleHookError(error, "Failed to remove member");
      toast.error(message);
      throw error;
    }
  };

  return {
    guild: guild ?? null,
    members: members ?? [],
    onlineMemberCount: onlineMemberCount ?? 0,
    isLoading: guild === undefined,
    // Actions
    updateGuild,
    deleteGuild,
    setProfileImage,
    setBannerImage,
    transferOwnership,
    kickMember,
  };
}
