"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/components/ConvexAuthProvider";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

/**
 * useFriends Hook
 *
 * Complete friends management:
 * - View friends list with online status
 * - Send/accept/decline friend requests
 * - Cancel sent requests
 * - Remove friends (unfriend)
 * - Block/unblock users
 * - Search for users
 */
export function useFriends() {
  const { token } = useAuth();

  // Queries
  const friends = useQuery(
    api.friends.getFriends,
    token ? { token } : "skip"
  );

  const incomingRequests = useQuery(
    api.friends.getIncomingRequests,
    token ? { token } : "skip"
  );

  const outgoingRequests = useQuery(
    api.friends.getOutgoingRequests,
    token ? { token } : "skip"
  );

  const blockedUsers = useQuery(
    api.friends.getBlockedUsers,
    token ? { token } : "skip"
  );

  // Mutations
  const sendRequestMutation = useMutation(api.friends.sendFriendRequest);
  const acceptRequestMutation = useMutation(api.friends.acceptFriendRequest);
  const declineRequestMutation = useMutation(api.friends.declineFriendRequest);
  const cancelRequestMutation = useMutation(api.friends.cancelFriendRequest);
  const removeFriendMutation = useMutation(api.friends.removeFriend);
  const blockUserMutation = useMutation(api.friends.blockUser);
  const unblockUserMutation = useMutation(api.friends.unblockUser);

  // Actions
  const sendFriendRequest = async (friendUsername: string) => {
    if (!token) throw new Error("Not authenticated");
    try {
      const result = await sendRequestMutation({ token, friendUsername });
      if (result.autoAccepted) {
        toast.success(`You are now friends with ${friendUsername}!`);
      } else {
        toast.success(`Friend request sent to ${friendUsername}`);
      }
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to send friend request");
      throw error;
    }
  };

  const acceptFriendRequest = async (friendId: Id<"users">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await acceptRequestMutation({ token, friendId });
      toast.success("Friend request accepted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to accept friend request");
      throw error;
    }
  };

  const declineFriendRequest = async (friendId: Id<"users">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await declineRequestMutation({ token, friendId });
      toast.info("Friend request declined");
    } catch (error: any) {
      toast.error(error.message || "Failed to decline friend request");
      throw error;
    }
  };

  const cancelFriendRequest = async (friendId: Id<"users">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await cancelRequestMutation({ token, friendId });
      toast.info("Friend request cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel friend request");
      throw error;
    }
  };

  const removeFriend = async (friendId: Id<"users">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await removeFriendMutation({ token, friendId });
      toast.info("Friend removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove friend");
      throw error;
    }
  };

  const blockUser = async (friendId: Id<"users">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await blockUserMutation({ token, friendId });
      toast.success("User blocked");
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
      throw error;
    }
  };

  const unblockUser = async (friendId: Id<"users">) => {
    if (!token) throw new Error("Not authenticated");
    try {
      await unblockUserMutation({ token, friendId });
      toast.success("User unblocked");
    } catch (error: any) {
      toast.error(error.message || "Failed to unblock user");
      throw error;
    }
  };

  // Helper function for searching users
  const searchUsers = (query: string, limit?: number) => {
    if (!token) return null;
    return useQuery(
      api.friends.searchUsers,
      query.length > 0 ? { token, query, limit } : "skip"
    );
  };

  return {
    // Data
    friends,
    incomingRequests,
    outgoingRequests,
    blockedUsers,

    // Counts
    friendCount: friends?.length || 0,
    incomingRequestCount: incomingRequests?.length || 0,
    outgoingRequestCount: outgoingRequests?.length || 0,

    // Online friends
    onlineFriends: friends?.filter(f => f.isOnline) || [],
    onlineCount: friends?.filter(f => f.isOnline).length || 0,

    // Loading states
    isLoading: friends === undefined,

    // Actions
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    searchUsers,
  };
}
