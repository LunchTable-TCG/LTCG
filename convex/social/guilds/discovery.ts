import { v } from "convex/values";
import { query } from "../../_generated/server";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// ============================================================================
// Return Type Validator
// ============================================================================

const guildPreviewValidator = v.object({
  _id: v.id("guilds"),
  name: v.string(),
  description: v.optional(v.string()),
  profileImageUrl: v.optional(v.string()),
  visibility: v.union(v.literal("public"), v.literal("private")),
  memberCount: v.number(),
  createdAt: v.number(),
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Searches public guilds by name
 * - Uses search index for fuzzy matching
 */
export const searchGuilds = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(guildPreviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    if (args.query.length < 2) {
      return [];
    }

    // Use search index
    const guilds = await ctx.db
      .query("guilds")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .filter((q) => q.eq(q.field("visibility"), "public"))
      .take(limit);

    // Resolve profile images
    const results = await Promise.all(
      guilds.map(async (guild) => {
        const profileImageUrl = guild.profileImageId
          ? await ctx.storage.getUrl(guild.profileImageId)
          : null;

        return {
          _id: guild._id,
          name: guild.name,
          description: guild.description,
          profileImageUrl: profileImageUrl ?? undefined,
          visibility: guild.visibility,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
        };
      })
    );

    return results;
  },
});

/**
 * Gets public guilds sorted by member count (most popular)
 */
export const getPopularGuilds = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(guildPreviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // Get public guilds sorted by member count
    const guilds = await ctx.db
      .query("guilds")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .order("desc")
      .take(limit * 2); // Get extra to sort by member count

    // Sort by member count (descending)
    const sorted = guilds.sort((a, b) => b.memberCount - a.memberCount).slice(0, limit);

    // Resolve profile images
    const results = await Promise.all(
      sorted.map(async (guild) => {
        const profileImageUrl = guild.profileImageId
          ? await ctx.storage.getUrl(guild.profileImageId)
          : null;

        return {
          _id: guild._id,
          name: guild.name,
          description: guild.description,
          profileImageUrl: profileImageUrl ?? undefined,
          visibility: guild.visibility,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
        };
      })
    );

    return results;
  },
});

/**
 * Gets recently created public guilds
 */
export const getRecentGuilds = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(guildPreviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // Get recently created public guilds
    const guilds = await ctx.db
      .query("guilds")
      .withIndex("by_created")
      .order("desc")
      .filter((q) => q.eq(q.field("visibility"), "public"))
      .take(limit);

    // Resolve profile images
    const results = await Promise.all(
      guilds.map(async (guild) => {
        const profileImageUrl = guild.profileImageId
          ? await ctx.storage.getUrl(guild.profileImageId)
          : null;

        return {
          _id: guild._id,
          name: guild.name,
          description: guild.description,
          profileImageUrl: profileImageUrl ?? undefined,
          visibility: guild.visibility,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
        };
      })
    );

    return results;
  },
});

/**
 * Gets featured guilds (mix of popular and recent)
 * Used for the "no guild" view discovery section
 */
export const getFeaturedGuilds = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(guildPreviewValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 6, MAX_LIMIT);

    // Get all public guilds
    const allGuilds = await ctx.db
      .query("guilds")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .collect();

    if (allGuilds.length === 0) {
      return [];
    }

    // Score guilds based on:
    // - Member count (weighted higher)
    // - Recency (bonus for guilds created in last 7 days)
    const now = Date.now();
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    const scored = allGuilds.map((guild) => {
      const memberScore = guild.memberCount * 10;
      const isRecent = now - guild.createdAt < WEEK_MS;
      const recencyBonus = isRecent ? 20 : 0;
      // Add some randomness for variety
      const randomBonus = Math.random() * 5;

      return {
        guild,
        score: memberScore + recencyBonus + randomBonus,
      };
    });

    // Sort by score and take top N
    const featured = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.guild);

    // Resolve profile images
    const results = await Promise.all(
      featured.map(async (guild) => {
        const profileImageUrl = guild.profileImageId
          ? await ctx.storage.getUrl(guild.profileImageId)
          : null;

        return {
          _id: guild._id,
          name: guild.name,
          description: guild.description,
          profileImageUrl: profileImageUrl ?? undefined,
          visibility: guild.visibility,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
        };
      })
    );

    return results;
  },
});

/**
 * Gets all public guilds with pagination
 */
export const getPublicGuilds = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("members"), v.literal("recent"), v.literal("name"))),
  },
  returns: v.object({
    guilds: v.array(guildPreviewValidator),
    hasMore: v.boolean(),
    total: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = args.offset ?? 0;
    const sortBy = args.sortBy ?? "members";

    // Get all public guilds
    const allGuilds = await ctx.db
      .query("guilds")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .collect();

    // Sort based on sortBy parameter
    let sorted: typeof allGuilds;
    switch (sortBy) {
      case "members":
        sorted = allGuilds.sort((a, b) => b.memberCount - a.memberCount);
        break;
      case "recent":
        sorted = allGuilds.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "name":
        sorted = allGuilds.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted = allGuilds;
    }

    // Apply pagination
    const paginated = sorted.slice(offset, offset + limit);

    // Resolve profile images
    const results = await Promise.all(
      paginated.map(async (guild) => {
        const profileImageUrl = guild.profileImageId
          ? await ctx.storage.getUrl(guild.profileImageId)
          : null;

        return {
          _id: guild._id,
          name: guild.name,
          description: guild.description,
          profileImageUrl: profileImageUrl ?? undefined,
          visibility: guild.visibility,
          memberCount: guild.memberCount,
          createdAt: guild.createdAt,
        };
      })
    );

    return {
      guilds: results,
      hasMore: offset + limit < allGuilds.length,
      total: allGuilds.length,
    };
  },
});
