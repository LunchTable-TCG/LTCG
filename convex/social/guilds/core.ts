import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";

// ============================================================================
// Constants
// ============================================================================

const GUILD_NAME_MIN_LENGTH = 3;
const GUILD_NAME_MAX_LENGTH = 32;
const GUILD_DESCRIPTION_MAX_LENGTH = 500;
export const MAX_GUILD_MEMBERS = 50;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validates guild name format
 * - 3-32 characters
 * - Letters, numbers, spaces, underscores, hyphens only
 */
function isValidGuildName(name: string): boolean {
  if (name.length < GUILD_NAME_MIN_LENGTH || name.length > GUILD_NAME_MAX_LENGTH) {
    return false;
  }
  // Allow letters, numbers, spaces, underscores, and hyphens
  return /^[a-zA-Z0-9 _-]+$/.test(name);
}

/**
 * Checks if a user is already in any guild
 */
export async function getUserGuildMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Doc<"guildMembers"> | null> {
  return await ctx.db
    .query("guildMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/**
 * Gets a guild by ID with null check
 */
export async function getGuildById(
  ctx: QueryCtx | MutationCtx,
  guildId: Id<"guilds">
): Promise<Doc<"guilds">> {
  const guild = await ctx.db.get(guildId);
  if (!guild) {
    throw createError(ErrorCode.GUILD_NOT_FOUND);
  }
  return guild;
}

/**
 * Checks if user is a member of a guild
 */
export async function requireGuildMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  guildId: Id<"guilds">
): Promise<Doc<"guildMembers">> {
  const membership = await ctx.db
    .query("guildMembers")
    .withIndex("by_guild_user", (q) => q.eq("guildId", guildId).eq("userId", userId))
    .first();

  if (!membership) {
    throw createError(ErrorCode.GUILD_NOT_A_MEMBER);
  }

  return membership;
}

/**
 * Checks if user is the owner of a guild
 */
export async function requireGuildOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  guildId: Id<"guilds">
): Promise<Doc<"guildMembers">> {
  const membership = await requireGuildMembership(ctx, userId, guildId);

  if (membership.role !== "owner") {
    throw createError(ErrorCode.GUILD_OWNER_REQUIRED);
  }

  return membership;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets a guild by ID with storage URLs resolved
 */
export const getGuild = query({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("guilds"),
      name: v.string(),
      description: v.optional(v.string()),
      profileImageUrl: v.optional(v.string()),
      bannerImageUrl: v.optional(v.string()),
      visibility: v.union(v.literal("public"), v.literal("private")),
      ownerId: v.id("users"),
      ownerUsername: v.optional(v.string()),
      memberCount: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const guild = await ctx.db.get(args.guildId);
    if (!guild) {
      return null;
    }

    // Resolve storage URLs
    const [profileImageUrl, bannerImageUrl, owner] = await Promise.all([
      guild.profileImageId ? ctx.storage.getUrl(guild.profileImageId) : null,
      guild.bannerImageId ? ctx.storage.getUrl(guild.bannerImageId) : null,
      ctx.db.get(guild.ownerId),
    ]);

    return {
      _id: guild._id,
      name: guild.name,
      description: guild.description,
      profileImageUrl: profileImageUrl ?? undefined,
      bannerImageUrl: bannerImageUrl ?? undefined,
      visibility: guild.visibility,
      ownerId: guild.ownerId,
      ownerUsername: owner?.username,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt,
    };
  },
});

/**
 * Gets the current user's guild (if they're in one)
 */
export const getMyGuild = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("guilds"),
      name: v.string(),
      description: v.optional(v.string()),
      profileImageUrl: v.optional(v.string()),
      bannerImageUrl: v.optional(v.string()),
      visibility: v.union(v.literal("public"), v.literal("private")),
      ownerId: v.id("users"),
      ownerUsername: v.optional(v.string()),
      memberCount: v.number(),
      createdAt: v.number(),
      myRole: v.union(v.literal("owner"), v.literal("member")),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    // Find user's guild membership
    const membership = await ctx.db
      .query("guildMembers")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    if (!membership) {
      return null;
    }

    const guild = await ctx.db.get(membership.guildId);
    if (!guild) {
      return null;
    }

    // Resolve storage URLs
    const [profileImageUrl, bannerImageUrl, owner] = await Promise.all([
      guild.profileImageId ? ctx.storage.getUrl(guild.profileImageId) : null,
      guild.bannerImageId ? ctx.storage.getUrl(guild.bannerImageId) : null,
      ctx.db.get(guild.ownerId),
    ]);

    return {
      _id: guild._id,
      name: guild.name,
      description: guild.description,
      profileImageUrl: profileImageUrl ?? undefined,
      bannerImageUrl: bannerImageUrl ?? undefined,
      visibility: guild.visibility,
      ownerId: guild.ownerId,
      ownerUsername: owner?.username,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt,
      myRole: membership.role,
      joinedAt: membership.joinedAt,
    };
  },
});

/**
 * Checks if current user has a guild
 */
export const hasGuild = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const membership = await ctx.db
      .query("guildMembers")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .first();

    return membership !== null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Creates a new guild
 * - User must not already be in a guild
 * - Guild name must be unique (case-insensitive)
 * - Creates the guild and adds the creator as owner
 */
export const createGuild = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.object({
    guildId: v.id("guilds"),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Validate guild name
    if (!isValidGuildName(args.name)) {
      throw createError(ErrorCode.GUILD_NAME_INVALID);
    }

    // Validate description length if provided
    if (args.description && args.description.length > GUILD_DESCRIPTION_MAX_LENGTH) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Description must be ${GUILD_DESCRIPTION_MAX_LENGTH} characters or less`,
      });
    }

    // Check if user is already in a guild
    const existingMembership = await getUserGuildMembership(ctx, userId);
    if (existingMembership) {
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD);
    }

    // Check if guild name is taken (case-insensitive)
    const nameLower = args.name.toLowerCase();
    const existingGuild = await ctx.db
      .query("guilds")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    // Also do a broader check for case-insensitive match
    if (!existingGuild) {
      const allGuilds = await ctx.db.query("guilds").collect();
      const nameMatch = allGuilds.find((g) => g.name.toLowerCase() === nameLower);
      if (nameMatch) {
        throw createError(ErrorCode.GUILD_NAME_TAKEN);
      }
    } else {
      throw createError(ErrorCode.GUILD_NAME_TAKEN);
    }

    const now = Date.now();

    // Create the guild
    const guildId = await ctx.db.insert("guilds", {
      name: args.name,
      description: args.description,
      visibility: args.visibility,
      ownerId: userId,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as owner
    await ctx.db.insert("guildMembers", {
      guildId,
      userId,
      role: "owner",
      joinedAt: now,
    });

    return { guildId };
  },
});

/**
 * Updates guild settings
 * - Only owner can update
 * - Can update name, description, visibility
 */
export const updateGuild = mutation({
  args: {
    guildId: v.id("guilds"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, userId, args.guildId);
    const guild = await getGuildById(ctx, args.guildId);

    const updates: Partial<Doc<"guilds">> = {
      updatedAt: Date.now(),
    };

    // Validate and set name if provided
    if (args.name !== undefined) {
      if (!isValidGuildName(args.name)) {
        throw createError(ErrorCode.GUILD_NAME_INVALID);
      }

      // Check if name is taken (excluding current guild)
      const nameLower = args.name.toLowerCase();
      if (guild.name.toLowerCase() !== nameLower) {
        const allGuilds = await ctx.db.query("guilds").collect();
        const nameMatch = allGuilds.find(
          (g) => g._id !== args.guildId && g.name.toLowerCase() === nameLower
        );
        if (nameMatch) {
          throw createError(ErrorCode.GUILD_NAME_TAKEN);
        }
      }
      updates.name = args.name;
    }

    // Validate and set description if provided
    if (args.description !== undefined) {
      if (args.description.length > GUILD_DESCRIPTION_MAX_LENGTH) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `Description must be ${GUILD_DESCRIPTION_MAX_LENGTH} characters or less`,
        });
      }
      updates.description = args.description;
    }

    // Set visibility if provided
    if (args.visibility !== undefined) {
      updates.visibility = args.visibility;
    }

    await ctx.db.patch(args.guildId, updates);

    return { success: true };
  },
});

/**
 * Uploads and sets guild profile image
 * - Only owner can upload
 */
export const setProfileImage = mutation({
  args: {
    guildId: v.id("guilds"),
    storageId: v.id("_storage"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, userId, args.guildId);

    await ctx.db.patch(args.guildId, {
      profileImageId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Uploads and sets guild banner image
 * - Only owner can upload
 */
export const setBannerImage = mutation({
  args: {
    guildId: v.id("guilds"),
    storageId: v.id("_storage"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, userId, args.guildId);

    await ctx.db.patch(args.guildId, {
      bannerImageId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Deletes a guild
 * - Only owner can delete
 * - Removes all members, invites, requests, and messages
 */
export const deleteGuild = mutation({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, userId, args.guildId);

    // Delete all members
    const members = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .collect();
    await Promise.all(members.map((m) => ctx.db.delete(m._id)));

    // Delete all invites
    const invites = await ctx.db
      .query("guildInvites")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId).eq("status", "pending"))
      .collect();
    await Promise.all(invites.map((i) => ctx.db.delete(i._id)));

    // Delete all join requests
    const requests = await ctx.db
      .query("guildJoinRequests")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId).eq("status", "pending"))
      .collect();
    await Promise.all(requests.map((r) => ctx.db.delete(r._id)));

    // Delete all messages (in batches)
    let hasMoreMessages = true;
    while (hasMoreMessages) {
      const messages = await ctx.db
        .query("guildMessages")
        .withIndex("by_guild_created", (q) => q.eq("guildId", args.guildId))
        .take(1000);
      if (messages.length === 0) {
        hasMoreMessages = false;
      } else {
        await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
      }
    }

    // Delete the guild
    await ctx.db.delete(args.guildId);

    return { success: true };
  },
});

/**
 * Transfers guild ownership to another member
 * - Only owner can transfer
 * - New owner must be a current member
 */
export const transferOwnership = mutation({
  args: {
    guildId: v.id("guilds"),
    newOwnerId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify current ownership
    const currentOwnerMembership = await requireGuildOwnership(ctx, userId, args.guildId);

    // Verify new owner is a member
    const newOwnerMembership = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", args.guildId).eq("userId", args.newOwnerId)
      )
      .first();

    if (!newOwnerMembership) {
      throw createError(ErrorCode.GUILD_NOT_A_MEMBER);
    }

    // Update roles
    await Promise.all([
      ctx.db.patch(currentOwnerMembership._id, { role: "member" }),
      ctx.db.patch(newOwnerMembership._id, { role: "owner" }),
      ctx.db.patch(args.guildId, {
        ownerId: args.newOwnerId,
        updatedAt: Date.now(),
      }),
    ]);

    return { success: true };
  },
});
