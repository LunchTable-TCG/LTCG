import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const friendshipReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId1: v.string(),
  userId2: v.string(),
  status: v.string(),
  initiatedBy: v.string(),
  createdAt: v.number(),
  metadata: v.optional(v.any()),
});

export const sendRequest = mutation({
  args: {
    fromUserId: v.string(),
    toUserId: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.fromUserId === args.toUserId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if relationship already exists
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.fromUserId).eq("userId2", args.toUserId)
      )
      .first();

    if (existing) {
      throw new Error("Friendship relationship already exists");
    }

    // Check reverse direction
    const existingReverse = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.toUserId).eq("userId2", args.fromUserId)
      )
      .first();

    if (existingReverse) {
      throw new Error("Friendship relationship already exists");
    }

    const id = await ctx.db.insert("friendships", {
      userId1: args.fromUserId,
      userId2: args.toUserId,
      status: "pending",
      initiatedBy: args.fromUserId,
      createdAt: Date.now(),
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const acceptRequest = mutation({
  args: {
    requestId: v.id("friendships"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.requestId);
    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.status !== "pending") {
      throw new Error("Friend request is not pending");
    }

    // Only the recipient can accept
    if (friendship.userId2 !== args.userId) {
      throw new Error("Only the recipient can accept this request");
    }

    await ctx.db.patch(args.requestId, {
      status: "accepted",
    });

    return null;
  },
});

export const declineRequest = mutation({
  args: {
    requestId: v.id("friendships"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const friendship = await ctx.db.get(args.requestId);
    if (!friendship) {
      throw new Error("Friend request not found");
    }

    if (friendship.status !== "pending") {
      throw new Error("Friend request is not pending");
    }

    // Only the recipient can decline
    if (friendship.userId2 !== args.userId) {
      throw new Error("Only the recipient can decline this request");
    }

    await ctx.db.delete(args.requestId);
    return null;
  },
});

export const removeFriend = mutation({
  args: {
    userId: v.string(),
    friendId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check both directions
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.userId).eq("userId2", args.friendId)
      )
      .first();

    const friendshipReverse = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.friendId).eq("userId2", args.userId)
      )
      .first();

    const record = friendship || friendshipReverse;
    if (!record) {
      throw new Error("Friendship not found");
    }

    if (record.status !== "accepted") {
      throw new Error("Not currently friends");
    }

    await ctx.db.delete(record._id);
    return null;
  },
});

export const blockUser = mutation({
  args: {
    userId: v.string(),
    blockedUserId: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.userId === args.blockedUserId) {
      throw new Error("Cannot block yourself");
    }

    // Remove existing friendship if any
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.userId).eq("userId2", args.blockedUserId)
      )
      .first();

    const existingReverse = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.blockedUserId).eq("userId2", args.userId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    if (existingReverse) {
      await ctx.db.delete(existingReverse._id);
    }

    // Create block record
    const id = await ctx.db.insert("friendships", {
      userId1: args.userId,
      userId2: args.blockedUserId,
      status: "blocked",
      initiatedBy: args.userId,
      createdAt: Date.now(),
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const unblockUser = mutation({
  args: {
    userId: v.string(),
    blockedUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const blockRecord = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.userId).eq("userId2", args.blockedUserId)
      )
      .first();

    if (!blockRecord || blockRecord.status !== "blocked") {
      throw new Error("Block record not found");
    }

    await ctx.db.delete(blockRecord._id);
    return null;
  },
});

export const getFriends = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(friendshipReturnValidator),
  handler: async (ctx, args) => {
    const asFriend1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("userId1", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const asFriend2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("userId2", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return [...asFriend1, ...asFriend2].map((f) => ({
      ...f,
      _id: f._id as string,
    }));
  },
});

export const getPendingRequests = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(friendshipReturnValidator),
  handler: async (ctx, args) => {
    // Get incoming requests where user is userId2
    const requests = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("userId2", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return requests.map((r) => ({
      ...r,
      _id: r._id as string,
    }));
  },
});

export const getFriendshipStatus = query({
  args: {
    userId: v.string(),
    otherUserId: v.string(),
  },
  returns: v.union(
    v.object({
      status: v.string(),
      friendship: friendshipReturnValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Check both directions
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.userId).eq("userId2", args.otherUserId)
      )
      .first();

    if (friendship) {
      return {
        status: friendship.status,
        friendship: {
          ...friendship,
          _id: friendship._id as string,
        },
      };
    }

    const friendshipReverse = await ctx.db
      .query("friendships")
      .withIndex("by_pair", (q) =>
        q.eq("userId1", args.otherUserId).eq("userId2", args.userId)
      )
      .first();

    if (friendshipReverse) {
      return {
        status: friendshipReverse.status,
        friendship: {
          ...friendshipReverse,
          _id: friendshipReverse._id as string,
        },
      };
    }

    return null;
  },
});
