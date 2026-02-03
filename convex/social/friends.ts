import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// Workaround for TS2589 (excessively deep type instantiation)
// biome-ignore lint/style/noNamespaceImport: Required for Convex internal API type workaround
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internal = (generatedApi as any).internal;
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

// Email action references - extracted to module level for consistency
const emailActions = internal.infrastructure.emailActions;

// Helper to avoid TypeScript "Type instantiation is excessively deep" errors
// biome-ignore lint/suspicious/noExplicitAny: Convex scheduler type workaround for TS2589
const scheduleEmail = (ctx: any, emailFunction: any, args: any) =>
  ctx.scheduler.runAfter(0, emailFunction, args);
import {
  friendInfoValidator,
  friendOperationValidator,
  friendRequestValidator,
  successResponseValidator,
} from "../lib/returnValidators";

/**
 * Sends a friend request to another user by username. Creates reciprocal pending
 * friendship entries. If the target user has already sent a request to the caller,
 * automatically accepts both requests.
 *
 * @param friendUsername - The username of the user to send a friend request to
 * @returns Success status and whether the request was auto-accepted
 */
export const sendFriendRequest = mutation({
  args: {
    friendUsername: v.string(),
  },
  returns: friendOperationValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find the friend by username
    const friend = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.friendUsername))
      .first();

    if (!friend) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    if (friend._id === userId) {
      throw createError(ErrorCode.SOCIAL_CANNOT_SELF_FRIEND);
    }

    // Check if friendship already exists
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", friend._id))
      .first();

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        throw createError(ErrorCode.SOCIAL_ALREADY_FRIENDS);
      }
      if (existingFriendship.status === "pending" && existingFriendship.requestedBy === userId) {
        throw createError(ErrorCode.SOCIAL_REQUEST_PENDING);
      }
      if (existingFriendship.status === "pending" && existingFriendship.requestedBy !== userId) {
        // This is an incoming request! Auto-accept it
        // Run the query and first patch in parallel
        const [, reciprocalFriendship] = await Promise.all([
          ctx.db.patch(existingFriendship._id, {
            status: "accepted",
            respondedAt: Date.now(),
          }),
          ctx.db
            .query("friendships")
            .withIndex("by_user_friend", (q) => q.eq("userId", friend._id).eq("friendId", userId))
            .first(),
        ]);

        // Update the reciprocal friendship if it exists
        if (reciprocalFriendship) {
          await ctx.db.patch(reciprocalFriendship._id, {
            status: "accepted",
            respondedAt: Date.now(),
          });
        }

        return { success: true, autoAccepted: true };
      }
      if (existingFriendship.status === "blocked") {
        throw createError(ErrorCode.SOCIAL_USER_BLOCKED);
      }
    }

    // Check if the friend has blocked the user
    const blockedByFriend = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", friend._id).eq("friendId", userId))
      .first();

    if (blockedByFriend && blockedByFriend.status === "blocked") {
      throw createError(ErrorCode.SOCIAL_USER_BLOCKED);
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

    // Send email notification to the friend
    const sender = await ctx.db.get(userId);

    if (friend.email && sender) {
      await scheduleEmail(ctx, emailActions.sendFriendRequestNotification, {
        email: friend.email,
        username: friend.username || friend.name || "Player",
        fromUsername: sender.username || sender.name || "Player",
      });
    }

    // Send inbox notification to the friend
    if (sender) {
      await ctx.scheduler.runAfter(0, internal.social.inbox.createInboxMessage, {
        userId: friend._id,
        type: "friend_request" as const,
        title: "Friend Request",
        message: `${sender.username || sender.name || "Someone"} wants to be your friend!`,
        data: {
          requesterId: userId,
          requesterUsername: sender.username || sender.name || "Player",
        },
        senderId: userId,
        senderUsername: sender.username || sender.name || "Player",
      });
    }

    return { success: true, autoAccepted: false };
  },
});

/**
 * Accepts an incoming friend request from another user. Updates both the caller's
 * and the requester's friendship status to "accepted".
 *
 * @param friendId - The ID of the user whose friend request to accept
 * @returns Success status
 */
export const acceptFriendRequest = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: successResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find the pending friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", args.friendId))
      .first();

    if (!friendship) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    if (friendship.status !== "pending") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "This friend request is not pending",
      });
    }

    if (friendship.requestedBy === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "You cannot accept your own friend request",
      });
    }

    // Update both friendship entries to accepted
    await ctx.db.patch(friendship._id, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    // Update the reciprocal friendship
    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", args.friendId).eq("friendId", userId))
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
 * Declines an incoming friend request from another user. Deletes both the caller's
 * and the requester's friendship records.
 *
 * @param friendId - The ID of the user whose friend request to decline
 * @returns Success status
 */
export const declineFriendRequest = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: successResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find the pending friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", args.friendId))
      .first();

    if (!friendship) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    if (friendship.status !== "pending") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "This friend request is not pending",
      });
    }

    // Delete both friendship entries
    await ctx.db.delete(friendship._id);

    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", args.friendId).eq("friendId", userId))
      .first();

    if (reciprocalFriendship) {
      await ctx.db.delete(reciprocalFriendship._id);
    }

    return { success: true };
  },
});

/**
 * Cancels an outgoing friend request that was sent by the authenticated user.
 * Deletes both friendship records (caller's and target's).
 *
 * @param friendId - The ID of the user to cancel the friend request to
 * @returns Success status
 */
export const cancelFriendRequest = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: successResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find the pending friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", args.friendId))
      .first();

    if (!friendship) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    if (friendship.status !== "pending") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "This friend request is not pending",
      });
    }

    if (friendship.requestedBy !== userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "You did not send this friend request",
      });
    }

    // Delete both friendship entries
    await ctx.db.delete(friendship._id);

    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", args.friendId).eq("friendId", userId))
      .first();

    if (reciprocalFriendship) {
      await ctx.db.delete(reciprocalFriendship._id);
    }

    return { success: true };
  },
});

/**
 * Removes an accepted friendship (unfriend). Deletes both the caller's and the
 * friend's friendship records. Only works for accepted friendships.
 *
 * @param friendId - The ID of the friend to remove
 * @returns Success status
 */
export const removeFriend = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: successResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find the accepted friendship
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", args.friendId))
      .first();

    if (!friendship || friendship.status !== "accepted") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "You are not friends with this user",
      });
    }

    // Delete both friendship entries
    await ctx.db.delete(friendship._id);

    const reciprocalFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", args.friendId).eq("friendId", userId))
      .first();

    if (reciprocalFriendship) {
      await ctx.db.delete(reciprocalFriendship._id);
    }

    return { success: true };
  },
});

/**
 * Blocks a user, preventing them from sending friend requests or interacting.
 * Updates existing friendship to "blocked" status or creates a new blocked entry.
 * Removes any reciprocal friendship the target user had.
 *
 * @param friendId - The ID of the user to block
 * @returns Success status
 */
export const blockUser = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: successResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    if (args.friendId === userId) {
      throw createError(ErrorCode.SOCIAL_CANNOT_SELF_FRIEND);
    }

    // Check if friendship exists
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", args.friendId))
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
        .withIndex("by_user_friend", (q) => q.eq("userId", args.friendId).eq("friendId", userId))
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
 * Removes a block on a user, allowing them to send friend requests again.
 * Deletes the blocked friendship record.
 *
 * @param friendId - The ID of the user to unblock
 * @returns Success status
 */
export const unblockUser = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: successResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", args.friendId))
      .first();

    if (!friendship || friendship.status !== "blocked") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        message: "This user is not blocked",
      });
    }

    // Delete the block entry
    await ctx.db.delete(friendship._id);

    return { success: true };
  },
});

/**
 * Retrieves the authenticated user's list of accepted friends with their details.
 * Includes online status (active within last 2 minutes) and friendship metadata.
 *
 * @returns Array of friends with username, level, ELO, online status, and timestamps
 */
export const getFriends = query({
  args: {},
  returns: v.array(friendInfoValidator),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "accepted"))
      .collect();

    // Batch fetch all friend user records
    const friendIds = friendships.map((f) => f.friendId);
    const users = await Promise.all(friendIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => [u._id, u])
    );

    // Batch fetch all presence records
    const presenceRecords = await Promise.all(
      friendIds.map((friendId) =>
        ctx.db
          .query("userPresence")
          .withIndex("by_user", (q) => q.eq("userId", friendId))
          .first()
      )
    );
    const presenceMap = new Map(
      presenceRecords
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => [p.userId, p])
    );

    // Join data from Maps
    const friends = friendships
      .map((friendship) => {
        const friend = userMap.get(friendship.friendId);
        if (!friend) return null;

        const presence = presenceMap.get(friendship.friendId);
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
      .filter((f) => f !== null) as Array<{
      userId: Id<"users">;
      username: string | undefined;
      level: number;
      rankedElo: number;
      isOnline: boolean;
      friendsSince: number;
      lastInteraction: number | undefined;
    }>;

    return friends;
  },
});

/**
 * Retrieves all incoming friend requests for the authenticated user.
 * Returns only requests sent by other users, not requests sent by the caller.
 *
 * @returns Array of incoming friend requests with requester details and timestamp
 */
export const getIncomingRequests = query({
  args: {},
  returns: v.array(friendRequestValidator),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();

    // Filter to only incoming requests (where requestedBy is the friendId)
    const incomingRequests = friendships.filter((f) => f.requestedBy !== userId);

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

    return requests.filter((r) => r !== null) as Array<{
      userId: Id<"users">;
      username: string | undefined;
      level: number;
      rankedElo: number;
      requestedAt: number;
    }>;
  },
});

/**
 * Retrieves all outgoing friend requests sent by the authenticated user.
 * Returns only requests sent by the caller that are still pending.
 *
 * @returns Array of outgoing friend requests with target user details and timestamp
 */
export const getOutgoingRequests = query({
  args: {},
  returns: v.array(friendRequestValidator),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();

    // Filter to only outgoing requests (where requestedBy is the user)
    const outgoingRequests = friendships.filter((f) => f.requestedBy === userId);

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

    return requests.filter((r) => r !== null) as Array<{
      userId: Id<"users">;
      username: string | undefined;
      level: number;
      rankedElo: number;
      requestedAt: number;
    }>;
  },
});

/**
 * Retrieves the list of users blocked by the authenticated user.
 * Returns user details and the timestamp when they were blocked.
 *
 * @returns Array of blocked users with username and block timestamp
 */
export const getBlockedUsers = query({
  args: {},
  returns: v.array(
    v.object({
      userId: v.id("users"),
      username: v.optional(v.string()),
      blockedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "blocked"))
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

    return blockedUsers.filter((u) => u !== null) as Array<{
      userId: Id<"users">;
      username: string | undefined;
      blockedAt: number;
    }>;
  },
});

/**
 * Searches for users by username prefix (case-insensitive). Returns matching users
 * with their friendship status relative to the authenticated user. Excludes the
 * authenticated user from results.
 *
 * NOTE: This currently performs a table scan due to Convex limitations. For production
 * deployments with large user bases, consider implementing:
 * - A separate text search index if Convex adds support
 * - An external search service (Algolia, Elasticsearch)
 * - A materialized view with prefix indexing
 *
 * @param query - Username search query (prefix match)
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of users matching the query with friendship status and details
 */
export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      username: v.optional(v.string()),
      level: v.number(),
      rankedElo: v.number(),
      friendshipStatus: v.union(
        v.null(),
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("blocked")
      ),
      isSentRequest: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const limit = args.limit || 20;

    // PERFORMANCE WARNING: This performs a limited table scan.
    // Convex does not currently support text search or prefix indexes on string fields.
    // For large user bases (>10k users), consider using an external search service.
    // Limit scan to 500 users to prevent OOM - may miss matches in large databases.
    const allUsers = await ctx.db.query("users").take(500);

    const matchingUsers = allUsers
      .filter(
        (user) =>
          (user.username || user.name || "").toLowerCase().startsWith(args.query.toLowerCase()) &&
          user._id !== userId
      )
      .slice(0, limit);

    // Get friendship status for each user
    const results = await Promise.all(
      matchingUsers.map(async (user) => {
        const friendship = await ctx.db
          .query("friendships")
          .withIndex("by_user_friend", (q) => q.eq("userId", userId).eq("friendId", user._id))
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
