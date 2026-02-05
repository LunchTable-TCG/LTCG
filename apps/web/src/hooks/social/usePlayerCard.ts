"use client";

import { handleHookError } from "@/lib/errorHandling";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "../auth/useConvexAuthHook";

/**
 * Hook for player card modal functionality.
 *
 * Fetches player profile data and provides actions for social interactions
 * (friend requests, challenges) when viewing another player's card.
 *
 * @param userId - The user ID to fetch data for, or null to skip fetching
 * @returns Player data, loading state, and social action functions
 *
 * @example
 * ```typescript
 * const { playerData, isLoading, sendFriendRequest, sendChallenge } = usePlayerCard(selectedUserId);
 *
 * // Send friend request
 * await sendFriendRequest(playerData.username);
 *
 * // Send challenge
 * await sendChallenge(playerData.username, "ranked");
 * ```
 */
export function usePlayerCard(userId: Id<"users"> | null) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Query player data when userId is provided
  const playerData = useQuery(
    api.social.friends.getPlayerCardData,
    userId ? { targetUserId: userId } : "skip"
  );

  // Friend mutations
  const sendRequestMutation = useMutation(api.social.friends.sendFriendRequest);
  const acceptRequestMutation = useMutation(api.social.friends.acceptFriendRequest);
  const cancelRequestMutation = useMutation(api.social.friends.cancelFriendRequest);
  const removeFriendMutation = useMutation(api.social.friends.removeFriend);

  // Challenge mutation
  const sendChallengeMutation = useMutation(api.social.challenges.sendChallenge);

  const sendFriendRequest = async (friendUsername: string) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const result = await sendRequestMutation({ friendUsername });
      if (result.autoAccepted) {
        toast.success(`You are now friends with ${friendUsername}!`);
      } else {
        toast.success(`Friend request sent to ${friendUsername}`);
      }
      return result;
    } catch (error) {
      const message = handleHookError(error, "Failed to send friend request");
      toast.error(message);
      throw error;
    }
  };

  const acceptFriendRequest = async (friendId: Id<"users">) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await acceptRequestMutation({ friendId });
      toast.success("Friend request accepted!");
    } catch (error) {
      const message = handleHookError(error, "Failed to accept friend request");
      toast.error(message);
      throw error;
    }
  };

  const cancelFriendRequest = async (friendId: Id<"users">) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await cancelRequestMutation({ friendId });
      toast.info("Friend request cancelled");
    } catch (error) {
      const message = handleHookError(error, "Failed to cancel friend request");
      toast.error(message);
      throw error;
    }
  };

  const removeFriend = async (friendId: Id<"users">) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await removeFriendMutation({ friendId });
      toast.info("Friend removed");
    } catch (error) {
      const message = handleHookError(error, "Failed to remove friend");
      toast.error(message);
      throw error;
    }
  };

  const sendChallenge = async (opponentUsername: string, mode: "casual" | "ranked") => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const lobbyId = await sendChallengeMutation({ opponentUsername, mode });
      toast.success("Challenge sent!", {
        description: `Redirecting to ${mode} game lobby...`,
      });
      router.push(`/game/${lobbyId}`);
      return lobbyId;
    } catch (error) {
      const message = handleHookError(error, "Failed to send challenge");
      toast.error(message);
      throw error;
    }
  };

  return {
    playerData,
    isLoading: userId !== null && playerData === undefined,
    isAuthenticated,
    sendFriendRequest,
    acceptFriendRequest,
    cancelFriendRequest,
    removeFriend,
    sendChallenge,
  };
}
