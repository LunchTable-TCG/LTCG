"use client";

import { useConvexQuery } from "@/lib/convexHelpers";
import { useMutationWithToast } from "@/lib/useMutationWithToast";
import { api } from "@convex/_generated/api";
import { useAuth } from "../auth/useConvexAuthHook";

// Module-scope references to avoid TS2589
const getMyGuildInviteLinkQuery = api.social.guilds.inviteLinks.getMyGuildInviteLink;
const getGuildByInviteCodeQuery = api.social.guilds.inviteLinks.getGuildByInviteCode;
const generateInviteLinkMutation = api.social.guilds.inviteLinks.generateInviteLink;
const joinViaInviteLinkMutation = api.social.guilds.inviteLinks.joinViaInviteLink;

/**
 * Hook for managing guild invite links (shareable links).
 * Used by guild members to generate and share invite links.
 */
export function useGuildInviteLink() {
  const { isAuthenticated } = useAuth();

  // Get user's current active invite link
  const myInviteLink = useConvexQuery(
    getMyGuildInviteLinkQuery,
    isAuthenticated ? {} : "skip"
  );

  // Mutations
  const generateLink = useMutationWithToast(generateInviteLinkMutation, {
    error: "Failed to generate invite link",
  });

  const joinViaLink = useMutationWithToast(joinViaInviteLinkMutation, {
    success: "Joined guild!",
    error: "Failed to join guild",
  });

  return {
    myInviteLink,
    isLoading: myInviteLink === undefined && isAuthenticated,
    generateLink,
    joinViaLink,
  };
}

/**
 * Hook for the invite landing page to preview a guild by invite code.
 * Works for both authenticated and unauthenticated users.
 */
export function useGuildInvitePreview(code: string) {
  const guildPreview = useConvexQuery(
    getGuildByInviteCodeQuery,
    code ? { code } : "skip"
  );

  return {
    guildPreview,
    isLoading: guildPreview === undefined,
    isNotFound: guildPreview === null,
  };
}
