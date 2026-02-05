"use client";

import { useConvexQuery } from "@/lib/convexHelpers";
import { useMutationWithToast } from "@/lib/useMutationWithToast";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// Module-scope references to avoid TS2589
const getGuildQuery = api.social.guilds.core.getGuild;
const getGuildMembersQuery = api.social.guilds.members.getGuildMembers;
const getOnlineMemberCountQuery = api.social.guilds.members.getOnlineMemberCount;
const getGuildJoinRequestsQuery = api.social.guilds.requests.getGuildJoinRequests;
const updateGuildMutation = api.social.guilds.core.updateGuild;
const deleteGuildMutation = api.social.guilds.core.deleteGuild;
const setProfileImageMutation = api.social.guilds.core.setProfileImage;
const setBannerImageMutation = api.social.guilds.core.setBannerImage;
const transferOwnershipMutation = api.social.guilds.core.transferOwnership;
const kickMemberMutation = api.social.guilds.members.kickMember;
const approveRequestMutation = api.social.guilds.requests.approveRequest;
const rejectRequestMutation = api.social.guilds.requests.rejectRequest;

/**
 * Hook for viewing and managing a specific guild
 *
 * @param guildId - The ID of the guild to view
 * @returns Guild data, members, and management actions
 */
export function useGuild(guildId: Id<"guilds"> | null) {
  // Queries
  const guild = useConvexQuery(getGuildQuery, guildId ? { guildId } : "skip");
  const members = useConvexQuery(getGuildMembersQuery, guildId ? { guildId } : "skip");
  const onlineMemberCount = useConvexQuery(
    getOnlineMemberCountQuery,
    guildId ? { guildId } : "skip"
  );
  const joinRequests = useConvexQuery(getGuildJoinRequestsQuery, guildId ? { guildId } : "skip");

  // Mutations with toast handling
  const updateGuildRaw = useMutationWithToast(updateGuildMutation, {
    success: "Guild updated",
    error: "Failed to update guild",
  });

  const deleteGuildRaw = useMutationWithToast(deleteGuildMutation, {
    success: "Guild deleted",
    error: "Failed to delete guild",
  });

  const setProfileImageRaw = useMutationWithToast(setProfileImageMutation, {
    success: "Profile image updated",
    error: "Failed to update profile image",
  });

  const setBannerImageRaw = useMutationWithToast(setBannerImageMutation, {
    success: "Banner image updated",
    error: "Failed to update banner image",
  });

  const transferOwnershipRaw = useMutationWithToast(transferOwnershipMutation, {
    success: "Ownership transferred",
    error: "Failed to transfer ownership",
  });

  const kickMemberRaw = useMutationWithToast(kickMemberMutation, {
    success: "Member removed",
    error: "Failed to remove member",
  });

  const approveRequestRaw = useMutationWithToast(approveRequestMutation, {
    success: "Request approved",
    error: "Failed to approve request",
  });

  const rejectRequestRaw = useMutationWithToast(rejectRequestMutation, {
    success: "Request rejected",
    error: "Failed to reject request",
  });

  // Convenience wrappers that include guildId
  const updateGuild = (data: {
    name?: string;
    description?: string;
    visibility?: "public" | "private";
  }) => {
    if (!guildId) return Promise.resolve();
    return updateGuildRaw({ guildId, ...data });
  };

  const deleteGuild = () => {
    if (!guildId) return Promise.resolve();
    return deleteGuildRaw({ guildId });
  };

  const setProfileImage = (storageId: Id<"_storage">) => {
    if (!guildId) return Promise.resolve();
    return setProfileImageRaw({ guildId, storageId });
  };

  const setBannerImage = (storageId: Id<"_storage">) => {
    if (!guildId) return Promise.resolve();
    return setBannerImageRaw({ guildId, storageId });
  };

  const transferOwnership = (newOwnerId: Id<"users">) => {
    if (!guildId) return Promise.resolve();
    return transferOwnershipRaw({ guildId, newOwnerId });
  };

  const kickMember = (userId: Id<"users">) => {
    if (!guildId) return Promise.resolve();
    return kickMemberRaw({ guildId, userId });
  };

  const approveRequest = (requestId: Id<"guildJoinRequests">) => approveRequestRaw({ requestId });

  const rejectRequest = (requestId: Id<"guildJoinRequests">) => rejectRequestRaw({ requestId });

  return {
    // Data
    guild: guild ?? null,
    members: members ?? [],
    onlineMemberCount: onlineMemberCount ?? 0,
    joinRequests: joinRequests ?? [],
    // Loading states
    isLoading: guild === undefined,
    isFullyLoaded:
      guild !== undefined &&
      members !== undefined &&
      onlineMemberCount !== undefined &&
      joinRequests !== undefined,
    // Actions
    updateGuild,
    deleteGuild,
    setProfileImage,
    setBannerImage,
    transferOwnership,
    kickMember,
    approveRequest,
    rejectRequest,
  };
}
