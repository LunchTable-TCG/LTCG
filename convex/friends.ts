import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * Send a friend request to another user
 */
export const sendFriendRequest = mutation({
  args: {
    token: v.string(),
    friendUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    // Find the friend by username
    const friend = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.friendUsername))
      .first();

    if (!friend) {
      throw new Error("User not found");
    }

    if (friend._id === userId) {
      throw new Error("You cannot send a friend request to yourself");
    }

    // Check if friendship already exists
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", friend._id)
      )
      .first();

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        throw new Error("You are already friends with this user");
      }
      if (existingFriendship.status === "pending" && existingFriendship.requestedBy === userId) {
        // User already sent a request to this person
        throw new Error("Friend request already sent");
      }
      if (existingFriendship.status === "pending" && existingFriendship.requestedBy !== userId) {
        // This is an incoming request! Auto-accept it
        await ctx.db.patch(existingFriendship._id, {
          status: "accepted",
          respondedAt: Date.now(),
        });

        // Update the reciprocal friendship
        const reciprocalFriendship = await ctx.db
          .query("friendships")
          .withIndex("by_user_friend", (q) =>
            q.eq("userId", friend._id).eq("friendId", userId)
          )
          .first();

        if (reciprocalFriendship) {
          await ctx.db.patch(reciprocalFriendship._id, {
            status: "accepted",
            respondedAt: Date.now(),
          });
        }

        return { success: true, autoAccepted: true };
      }
      if (existingFriendship.status === "blocked") {
        throw new Error("Cannot send friend request to this user");
      }
    }

    // Check if the friend has blocked the user
    const blockedByFriend = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", friend._id).eq("friendId", userId)
      )
      .first();

    if (blockedByFriend && blockedByFriend.status === "blocked") {
      throw new Error("Cannot send friend request to this user");
    }

    // No existing friendship or incoming request - this check is now redundant but kept for clarity
    const incomingRequest = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", friend._id).eq("friendId", userId)
      )
      .first();

    if (incomingRequest && incomingRequest.status === "pending") {
      // Auto-accept the incoming request instead of creating a new one
      await ctx.db.patch(incomingRequest._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });

      // Create the reciprocal friendship
      await ctx.db.insert("friendships", {
        userId,
        friendId: friend._id,
        status: "accepted",
        requestedBy: friend._id,
        createdAt: incomingRequest.createdAt,
        respondedAt: Date.now(),
      });

      return { success: true, autoAccepted: true };
    }

    // Create friend request
    await ctx.db.insert("friendships", {
      userId,
      friendId: friend._id,
      status: "pending",
      requestedBy: userId,
      createdAt: Date.now(),
    });

    // Create reciprocal pending entry for the friend
    await ctx.db.insert("friendships", {
      userId: friend._id,
      friendId: userId,
      status: "pending",
      requestedBy: userId,
      createdAt: Date.now(),
    });

    return { success: true, autoAccepted: false };
  },
});

/**
 * Accept a friend request
 */
export const acceptFriendRequest = mutation({
  args: {
    token: v.string(),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    // Find the pending friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.status !== "pending") {
      throw new Error("This friend request is not pending");
    }

    if (friendship.requestedBy === userId) {
      throw new Error("You cannot accept your own friend request");
    }

    // Update both friendship entries to accepted
    await ctx.db.patch(friendship._id, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    // Update the reciprocal friendship
    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", args.friendId).eq("friendId", userId)
      )
      .first();

    if (reciprocalFriendship) {
      await ctx.db.patch(reciprocalFriendship._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Decline a friend request
 */
export const declineFriendRequest = mutation({
  args: {
    token: v.string(),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    // Find the pending friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.status !== "pending") {
      throw new Error("This friend request is not pending");
    }

    // Delete both friendship entries
    await ctx.db.delete(friendship._id);

    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", args.friendId).eq("friendId", userId)
      )
      .first();

    if (reciprocalFriendship) {
      await ctx.db.delete(reciprocalFriendship._id);
    }

    return { success: true };
  },
});

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequest = mutation({
  args: {
    token: v.string(),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    // Find the pending friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.status !== "pending") {
      throw new Error("This friend request is not pending");
    }

    if (friendship.requestedBy !== userId) {
      throw new Error("You did not send this friend request");
    }

    // Delete both friendship entries
    await ctx.db.delete(friendship._id);

    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", args.friendId).eq("friendId", userId)
      )
      .first();

    if (reciprocalFriendship) {
      await ctx.db.delete(reciprocalFriendship._id);
    }

    return { success: true };
  },
});

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = mutation({
  args: {
    token: v.string(),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    // Find the accepted friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    if (!friendship || friendship.status !== "accepted") {
      throw new Error("You are not friends with this user");
    }

    // Delete both friendship entries
    await ctx.db.delete(friendship._id);

    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", args.friendId).eq("friendId", userId)
      )
      .first();

    if (reciprocalFriendship) {
      await ctx.db.delete(reciprocalFriendship._id);
    }

    return { success: true };
  },
});

/**
 * Block a user
 */
export const blockUser = mutation({
  args: {
    token: v.string(),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    if (args.friendId === userId) {
      throw new Error("You cannot block yourself");
    }

    // Check if friendship exists
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    if (friendship) {
      // Update existing friendship to blocked
      await ctx.db.patch(friendship._id, {
        status: "blocked",
        respondedAt: Date.now(),
      });

      // Remove the reciprocal friendship
      const reciprocalFriendship = await ctx.db
        .query("friendships")
        .withIndex("by_user_friend", (q) =>
          q.eq("userId", args.friendId).eq("friendId", userId)
        )
        .first();

      if (reciprocalFriendship) {
        await ctx.db.delete(reciprocalFriendship._id);
      }
    } else {
      // Create new blocked entry
      await ctx.db.insert("friendships", {
        userId,
        friendId: args.friendId,
        status: "blocked",
        requestedBy: userId,
        createdAt: Date.now(),
        respondedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Unblock a user
 */
export const unblockUser = mutation({
  args: {
    token: v.string(),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", args.friendId)
      )
      .first();

    if (!friendship || friendship.status !== "blocked") {
      throw new Error("This user is not blocked");
    }

    // Delete the block entry
    await ctx.db.delete(friendship._id);

    return { success: true };
  },
});

/**
 * Get list of friends
 */
export const getFriends = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "accepted")
      )
      .collect();

    // Fetch friend details with online status
    const friends = await Promise.all(
      friendships.map(async (friendship) => {
        const friend = await ctx.db.get(friendship.friendId);
        if (!friend) return null;

        // Check if friend is online (active in last 2 minutes)
        const presence = await ctx.db
          .query("userPresence")
          .withIndex("by_user", (q) => q.eq("userId", friendship.friendId))
          .first();

        const isOnline = presence && Date.now() - presence.lastActiveAt < 120000; // 2 minutes

        return {
          userId: friend._id,
          username: friend.username,
          level: friend.level || 1,
          rankedElo: friend.rankedElo || 1000,
          isOnline,
          friendsSince: friendship.createdAt,
          lastInteraction: friendship.lastInteraction,
        };
      })
    );

    return friends.filter((f) => f !== null);
  },
});

/**
 * Get pending friend requests (incoming)
 */
export const getIncomingRequests = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .collect();

    // Filter to only incoming requests (where requestedBy is the friendId)
    const incomingRequests = friendships.filter(
      (f) => f.requestedBy !== userId
    );

    // Fetch requester details
    const requests = await Promise.all(
      incomingRequests.map(async (friendship) => {
        const requester = await ctx.db.get(friendship.friendId);
        if (!requester) return null;

        return {
          userId: requester._id,
          username: requester.username,
          level: requester.level || 1,
          rankedElo: requester.rankedElo || 1000,
          requestedAt: friendship.createdAt,
        };
      })
    );

    return requests.filter((r) => r !== null);
  },
});

/**
 * Get outgoing friend requests (sent)
 */
export const getOutgoingRequests = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .collect();

    // Filter to only outgoing requests (where requestedBy is the user)
    const outgoingRequests = friendships.filter(
      (f) => f.requestedBy === userId
    );

    // Fetch friend details
    const requests = await Promise.all(
      outgoingRequests.map(async (friendship) => {
        const friend = await ctx.db.get(friendship.friendId);
        if (!friend) return null;

        return {
          userId: friend._id,
          username: friend.username,
          level: friend.level || 1,
          rankedElo: friend.rankedElo || 1000,
          requestedAt: friendship.createdAt,
        };
      })
    );

    return requests.filter((r) => r !== null);
  },
});

/**
 * Get blocked users list
 */
export const getBlockedUsers = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "blocked")
      )
      .collect();

    // Fetch blocked user details
    const blockedUsers = await Promise.all(
      friendships.map(async (friendship) => {
        const blockedUser = await ctx.db.get(friendship.friendId);
        if (!blockedUser) return null;

        return {
          userId: blockedUser._id,
          username: blockedUser.username,
          blockedAt: friendship.respondedAt || friendship.createdAt,
        };
      })
    );

    return blockedUsers.filter((u) => u !== null);
  },
});

/**
 * Search for users to add as friends
 */
export const searchUsers = query({
  args: {
    token: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx, args.token);
    const limit = args.limit || 20;

    // Search for users by username (case-insensitive prefix match)
    const allUsers = await ctx.db.query("users").collect();

    const matchingUsers = allUsers
      .filter((user) =>
        (user.username || user.name || "").toLowerCase().startsWith(args.query.toLowerCase()) &&
        user._id !== userId
      )
      .slice(0, limit);

    // Get friendship status for each user
    const results = await Promise.all(
      matchingUsers.map(async (user) => {
        const friendship = await ctx.db
          .query("friendships")
          .withIndex("by_user_friend", (q) =>
            q.eq("userId", userId).eq("friendId", user._id)
          )
          .first();

        return {
          userId: user._id,
          username: user.username,
          level: user.level || 1,
          rankedElo: user.rankedElo || 1000,
          friendshipStatus: friendship?.status || null,
          isSentRequest: friendship?.requestedBy === userId,
        };
      })
    );

    return results;
  },
});
