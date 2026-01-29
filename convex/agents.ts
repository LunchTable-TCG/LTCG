import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAuthMutation, requireAuthQuery } from "./lib/convexAuth";
import { ErrorCode, createError } from "./lib/errorCodes";
import { STARTER_DECKS, type StarterDeckCode, VALID_DECK_CODES } from "./seeds/starterDecks";

const MAX_AGENTS_PER_USER = 3;

// Type guard for starter deck codes
function isValidDeckCode(code: string): code is StarterDeckCode {
  return VALID_DECK_CODES.includes(code as StarterDeckCode);
}

// Generate a cryptographically secure API key
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  const key = Array.from(randomValues)
    .map((byte) => chars[byte % chars.length])
    .join("");
  return `ltcg_${key}`;
}

/**
 * Hash API key using bcrypt with 12 salt rounds
 * Bcrypt provides strong one-way hashing for secure API key storage
 * @param key - The plain text API key to hash
 * @returns Promise resolving to the bcrypt hash
 */
async function hashApiKey(key: string): Promise<string> {
  const saltRounds = 12; // Good balance of security and performance
  return await bcrypt.hash(key, saltRounds);
}

/**
 * Verify an API key against a stored bcrypt hash
 * @param key - The plain text API key to verify
 * @param hash - The stored bcrypt hash to compare against
 * @returns Promise resolving to true if key matches, false otherwise
 */
async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(key, hash);
  } catch (error) {
    // If hash format is invalid or comparison fails, return false
    console.error("API key verification error:", error);
    return false;
  }
}

// Get key prefix for display (first 12 chars including "ltcg_")
function getKeyPrefix(key: string): string {
  return `${key.substring(0, 12)}...`;
}

// ============================================
// INTERNAL FUNCTIONS
// ============================================

/**
 * Validate an API key and return the associated agent
 * Internal function for use by other Convex functions (not exposed to clients)
 * @param ctx - Convex context with database access
 * @param apiKey - The API key to validate
 * @returns The agent record if valid, null otherwise
 */
export async function validateApiKeyInternal(
  // biome-ignore lint/suspicious/noExplicitAny: Convex context type abstraction
  ctx: { db: any },
  apiKey: string
): Promise<{ agentId: string; userId: string } | null> {
  // Basic format validation
  if (!apiKey || !apiKey.startsWith("ltcg_") || apiKey.length < 37) {
    return null;
  }

  try {
    // Get all active API keys and check each one
    // Note: We need to iterate because bcrypt hashes can't be directly queried
    const allKeys = await ctx.db
      .query("apiKeys")
      // biome-ignore lint/suspicious/noExplicitAny: Convex filter callback type
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    for (const keyRecord of allKeys) {
      const isValid = await verifyApiKey(apiKey, keyRecord.keyHash);
      if (isValid) {
        // Update last used timestamp
        await ctx.db.patch(keyRecord._id, {
          lastUsedAt: Date.now(),
        });

        // Get the agent to ensure it's still active
        const agent = await ctx.db.get(keyRecord.agentId);
        if (agent?.isActive) {
          return {
            agentId: agent._id,
            userId: agent.userId,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("API key validation error:", error);
    return null;
  }
}

// ============================================
// QUERIES
// ============================================

/**
 * Get all available starter decks
 */
export const getStarterDecks = query({
  args: {},
  handler: async (ctx) => {
    // First check if we have seeded data in the database
    const dbDecks = await ctx.db
      .query("starterDeckDefinitions")
      .withIndex("by_available", (q) => q.eq("isAvailable", true))
      .collect();

    if (dbDecks.length > 0) {
      return dbDecks;
    }

    // Fall back to static definitions if not seeded
    return STARTER_DECKS.map((deck) => ({
      ...deck,
      isAvailable: true,
      createdAt: Date.now(),
    }));
  },
});

/**
 * Get all agents for the authenticated user
 */
export const getUserAgents = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get all active agents for this user
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter to only active agents and get their API key prefixes
    const activeAgents = agents.filter((a) => a.isActive);

    const agentsWithKeys = await Promise.all(
      activeAgents.map(async (agent) => {
        const apiKey = await ctx.db
          .query("apiKeys")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        return {
          ...agent,
          keyPrefix: apiKey?.keyPrefix || null,
        };
      })
    );

    return agentsWithKeys;
  },
});

/**
 * Get the count of active agents for a user
 */
export const getAgentCount = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) {
      return 0;
    }

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    return agents.filter((a) => a.isActive).length;
  },
});

/**
 * Get a single agent by ID (for the owner)
 */
export const getAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) {
      return null;
    }

    const agent = await ctx.db.get(args.agentId);

    if (!agent || agent.userId !== auth.userId || !agent.isActive) {
      return null;
    }

    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return {
      ...agent,
      keyPrefix: apiKey?.keyPrefix || null,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Validate an API key (public endpoint)
 * Returns agent information if the key is valid
 */
export const validateApiKey = mutation({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await validateApiKeyInternal(ctx, args.apiKey);

    if (!result) {
      throw createError(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    // Get full agent details from agents table
    const agent = await ctx.db
      .query("agents")
      .filter((q) => q.eq(q.field("_id"), result.agentId))
      .first();

    if (!agent || !agent.isActive) {
      throw createError(ErrorCode.AGENT_NOT_FOUND, { agentId: result.agentId });
    }

    return {
      agentId: agent._id,
      name: agent.name,
      userId: agent.userId,
      starterDeckCode: agent.starterDeckCode,
    };
  },
});

/**
 * Register a new AI agent
 */
export const registerAgent = mutation({
  args: {
    name: v.string(),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    starterDeckCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Check agent limit
    const existingAgents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeCount = existingAgents.filter((a) => a.isActive).length;

    if (activeCount >= MAX_AGENTS_PER_USER) {
      throw createError(ErrorCode.AGENT_LIMIT_REACHED, { maxAgents: MAX_AGENTS_PER_USER });
    }

    // 3. Validate agent name
    const trimmedName = args.name.trim();

    if (trimmedName.length < 3 || trimmedName.length > 32) {
      throw createError(ErrorCode.AGENT_NAME_INVALID_LENGTH, { length: trimmedName.length });
    }

    // Check for valid characters (alphanumeric, spaces, underscores, hyphens)
    if (!/^[a-zA-Z0-9\s_-]+$/.test(trimmedName)) {
      throw createError(ErrorCode.AGENT_NAME_INVALID_CHARS, { name: trimmedName });
    }

    // Check uniqueness per user
    const duplicateName = existingAgents.find(
      (a) => a.isActive && a.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateName) {
      throw createError(ErrorCode.AGENT_NAME_DUPLICATE, { name: trimmedName });
    }

    // 4. Validate starter deck code
    if (!isValidDeckCode(args.starterDeckCode)) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    // 5. Validate optional URLs
    if (args.profilePictureUrl) {
      try {
        new URL(args.profilePictureUrl);
      } catch {
        throw createError(ErrorCode.AGENT_INVALID_PROFILE_URL, { url: args.profilePictureUrl });
      }
    }

    if (args.socialLink) {
      try {
        new URL(args.socialLink);
      } catch {
        throw createError(ErrorCode.AGENT_INVALID_SOCIAL_URL, { url: args.socialLink });
      }
    }

    // 6. Create agent record
    const agentId = await ctx.db.insert("agents", {
      userId: userId,
      name: trimmedName,
      profilePictureUrl: args.profilePictureUrl,
      socialLink: args.socialLink,
      starterDeckCode: args.starterDeckCode,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
      },
      createdAt: Date.now(),
      isActive: true,
    });

    // 7. Generate and store API key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey); // Now async with bcrypt
    const keyPrefix = getKeyPrefix(apiKey);

    await ctx.db.insert("apiKeys", {
      agentId,
      userId: userId,
      keyHash,
      keyPrefix,
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      agentId,
      apiKey, // Full key - shown only once!
      keyPrefix,
      message: "Agent registered successfully",
    };
  },
});

/**
 * Regenerate API key for an agent
 */
export const regenerateApiKey = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify agent ownership
    const agent = await ctx.db.get(args.agentId);

    if (!agent || agent.userId !== userId) {
      throw createError(ErrorCode.AGENT_NOT_FOUND, { agentId: args.agentId });
    }

    if (!agent.isActive) {
      throw createError(ErrorCode.AGENT_DELETED, { agentId: args.agentId });
    }

    // Deactivate all existing keys for this agent
    const existingKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    for (const key of existingKeys) {
      if (key.isActive) {
        await ctx.db.patch(key._id, { isActive: false });
      }
    }

    // Generate new key
    const apiKey = generateApiKey();
    const keyHash = await hashApiKey(apiKey); // Now async with bcrypt
    const keyPrefix = getKeyPrefix(apiKey);

    await ctx.db.insert("apiKeys", {
      agentId: args.agentId,
      userId: userId,
      keyHash,
      keyPrefix,
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      apiKey, // Full key - shown only once!
      keyPrefix,
    };
  },
});

/**
 * Update agent profile
 */
export const updateAgent = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const auth = await getCurrentUser(ctx);
    if (!auth) {
      throw createError(ErrorCode.AUTH_REQUIRED);
    }

    // Verify agent ownership
    const agent = await ctx.db.get(args.agentId);

    if (!agent || agent.userId !== auth.userId) {
      throw createError(ErrorCode.AGENT_NOT_FOUND, { agentId: args.agentId });
    }

    if (!agent.isActive) {
      throw createError(ErrorCode.AGENT_DELETED, { agentId: args.agentId });
    }

    const updates: Partial<{
      name: string;
      profilePictureUrl: string;
      socialLink: string;
    }> = {};

    // Validate and set name if provided
    if (args.name !== undefined) {
      const trimmedName = args.name.trim();

      if (trimmedName.length < 3 || trimmedName.length > 32) {
        throw createError(ErrorCode.AGENT_NAME_INVALID_LENGTH, { length: trimmedName.length });
      }

      if (!/^[a-zA-Z0-9\s_-]+$/.test(trimmedName)) {
        throw createError(ErrorCode.AGENT_NAME_INVALID_CHARS, { name: trimmedName });
      }

      // Check uniqueness (excluding current agent)
      const existingAgents = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", auth.userId))
        .collect();

      const duplicateName = existingAgents.find(
        (a) =>
          a._id !== args.agentId && a.isActive && a.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicateName) {
        throw createError(ErrorCode.AGENT_NAME_DUPLICATE, { name: trimmedName });
      }

      updates.name = trimmedName;
    }

    // Validate URLs if provided
    if (args.profilePictureUrl !== undefined) {
      if (args.profilePictureUrl) {
        try {
          new URL(args.profilePictureUrl);
        } catch {
          throw createError(ErrorCode.AGENT_INVALID_PROFILE_URL, { url: args.profilePictureUrl });
        }
      }
      updates.profilePictureUrl = args.profilePictureUrl;
    }

    if (args.socialLink !== undefined) {
      if (args.socialLink) {
        try {
          new URL(args.socialLink);
        } catch {
          throw createError(ErrorCode.AGENT_INVALID_SOCIAL_URL, { url: args.socialLink });
        }
      }
      updates.socialLink = args.socialLink;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.agentId, updates);
    }

    return { success: true };
  },
});

/**
 * Delete (deactivate) an agent
 */
export const deleteAgent = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify agent ownership
    const agent = await ctx.db.get(args.agentId);

    if (!agent || agent.userId !== userId) {
      throw createError(ErrorCode.AGENT_NOT_FOUND, { agentId: args.agentId });
    }

    // Soft delete - deactivate agent
    await ctx.db.patch(args.agentId, { isActive: false });

    // Deactivate all API keys for this agent
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    for (const key of apiKeys) {
      if (key.isActive) {
        await ctx.db.patch(key._id, { isActive: false });
      }
    }

    return { success: true };
  },
});
