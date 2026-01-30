import bcrypt from "bcryptjs";
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, requireAuthMutation, requireAuthQuery } from "./lib/convexAuth";
import { ErrorCode, createError } from "./lib/errorCodes";
import { STARTER_DECKS, type StarterDeckCode, VALID_DECK_CODES } from "./seeds/starterDecks";
import {
  ABYSSAL_DEPTHS_CARDS,
  INFERNAL_DRAGONS_CARDS,
  IRON_LEGION_CARDS,
  STORM_RIDERS_CARDS,
} from "./seeds/starterCards";
import type { Id } from "./_generated/dataModel";

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
function hashApiKey(key: string): string {
  // Reduced from 12 to 4 rounds for Convex serverless (1s timeout limit)
  // Still secure with strong random API keys (32+ chars)
  const saltRounds = 4;
  return bcrypt.hashSync(key, saltRounds);
}

/**
 * Verify an API key against a stored bcrypt hash
 * @param key - The plain text API key to verify
 * @param hash - The stored bcrypt hash to compare against
 * @returns Promise resolving to true if key matches, false otherwise
 */
function verifyApiKey(key: string, hash: string): boolean {
  try {
    // Use compareSync instead of compare because Convex queries/mutations
    // don't allow setTimeout (which async bcrypt uses internally)
    return bcrypt.compareSync(key, hash);
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
): Promise<{ agentId: string; userId: string; isValid?: boolean; apiKeyId?: string } | null> {
  // Basic format validation
  if (!apiKey || !apiKey.startsWith("ltcg_") || apiKey.length < 37) {
    return null;
  }

  try {
    // Extract prefix for fast database lookup (first 12 chars including "ltcg_")
    const keyPrefixToFind = `${apiKey.substring(0, 12)}...`;
    console.log("[API_KEY_DEBUG] Looking for prefix:", keyPrefixToFind);

    // DEBUG: Get all keys to see what's in the database
    const allKeys = await ctx.db.query("apiKeys").collect();
    console.log("[API_KEY_DEBUG] Total keys in DB:", allKeys.length);
    for (const k of allKeys.slice(0, 5)) {
      console.log("[API_KEY_DEBUG] DB key:", k.keyPrefix, "isActive:", k.isActive);
    }

    // Query keys matching this prefix - try filter first to debug
    const matchingKeys = await ctx.db
      .query("apiKeys")
      .filter((q: any) =>
        q.and(
          q.eq(q.field("keyPrefix"), keyPrefixToFind),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    console.log("[API_KEY_DEBUG] Found matching keys:", matchingKeys.length);

    for (const keyRecord of matchingKeys) {
      console.log("[API_KEY_DEBUG] Comparing against stored prefix:", keyRecord.keyPrefix);
      const isValid = verifyApiKey(apiKey, keyRecord.keyHash);
      console.log("[API_KEY_DEBUG] bcrypt compareSync result:", isValid);
      if (isValid) {
        // Note: lastUsedAt update removed - queries are read-only in Convex
        // This can be tracked separately via a mutation if needed

        // Get the agent to ensure it's still active
        const agent = await ctx.db.get(keyRecord.agentId);
        if (agent?.isActive) {
          return {
            isValid: true,
            agentId: agent._id,
            userId: agent.userId,
            apiKeyId: keyRecord._id,
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
// INTERNAL QUERIES
// ============================================

/**
 * Internal query wrapper for validateApiKeyInternal
 * Used by HTTP actions to validate API keys
 */
export const validateApiKeyInternalQuery = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await validateApiKeyInternal(ctx, args.apiKey);
  },
});

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

/**
 * Internal query to get agent by ID for HTTP handlers.
 * Accepts agentId directly (for API key auth contexts).
 */
export const getAgentByIdInternal = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);

    if (!agent || !agent.isActive) {
      return null;
    }

    // Get user stats for elo/wins/losses
    const user = await ctx.db.get(agent.userId);

    return {
      agentId: agent._id,
      userId: agent.userId,
      name: agent.name,
      elo: user?.rankedElo ?? 1000,
      wins: user?.rankedWins ?? 0,
      losses: user?.rankedLosses ?? 0,
      createdAt: agent._creationTime,
      walletAddress: agent.walletAddress,
      walletChainType: agent.walletChainType,
      walletCreatedAt: agent.walletCreatedAt,
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

// ============================================
// INTERNAL MUTATIONS
// ============================================

/**
 * Internal mutation for HTTP API agent registration
 * Creates a system user and agent without authentication
 */
export const registerAgentInternal = internalMutation({
  args: {
    name: v.string(),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    starterDeckCode: v.string(),
    callbackUrl: v.optional(v.string()), // Webhook URL for real-time notifications
  },
  handler: async (ctx, args) => {
    // For HTTP API registrations, create a system user for the agent
    // These users don't have email/auth as they're API-only agents
    const internalAgentId = `agent:${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const userId = await ctx.db.insert("users", {
      privyId: internalAgentId, // Internal agent ID (not a Privy DID)
      username: `agent_${args.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      email: `agent_${Date.now()}@ltcg.api`, // Placeholder email for API agents
      isAnonymous: false,
      createdAt: Date.now(),
    });

    // Validate agent name
    const trimmedName = args.name.trim();

    if (trimmedName.length < 3 || trimmedName.length > 32) {
      throw createError(ErrorCode.AGENT_NAME_INVALID_LENGTH, { length: trimmedName.length });
    }

    if (!/^[a-zA-Z0-9\s_-]+$/.test(trimmedName)) {
      throw createError(ErrorCode.AGENT_NAME_INVALID_CHARS, { name: trimmedName });
    }

    // Validate starter deck code
    if (!isValidDeckCode(args.starterDeckCode)) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    // Create agent record
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
      // Webhook configuration
      callbackUrl: args.callbackUrl,
      webhookEnabled: !!args.callbackUrl,
      webhookFailCount: 0,
    });

    // Generate and store API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);

    await ctx.db.insert("apiKeys", {
      agentId,
      userId: userId,
      keyHash,
      keyPrefix,
      isActive: true,
      createdAt: Date.now(),
    });

    // === CREATE STARTER DECK FOR AGENT ===
    // This ensures the agent has a usable deck immediately after registration

    // Get starter deck metadata
    const starterDeck = STARTER_DECKS.find((d) => d.deckCode === args.starterDeckCode);
    if (!starterDeck) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    // Load card list based on deck code
    const cardListMap: Record<string, readonly (typeof INFERNAL_DRAGONS_CARDS)[number][]> = {
      INFERNAL_DRAGONS: INFERNAL_DRAGONS_CARDS,
      ABYSSAL_DEPTHS: ABYSSAL_DEPTHS_CARDS,
      IRON_LEGION: IRON_LEGION_CARDS,
      STORM_RIDERS: STORM_RIDERS_CARDS,
    };

    const cardList = cardListMap[args.starterDeckCode];
    if (!cardList) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    const now = Date.now();

    // Auto-seed cards if they don't exist (first-time setup)
    const firstCard = cardList[0];
    if (firstCard) {
      const existingCardDefs = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", firstCard.name))
        .first();

      if (!existingCardDefs) {
        // Seed all starter cards on first use
        const allCards = [
          ...INFERNAL_DRAGONS_CARDS,
          ...ABYSSAL_DEPTHS_CARDS,
          ...IRON_LEGION_CARDS,
          ...STORM_RIDERS_CARDS,
        ];
        for (const card of allCards) {
          await ctx.db.insert("cardDefinitions", {
            name: card.name,
            rarity: card.rarity,
            cardType: card.cardType,
            archetype: card.archetype,
            cost: card.cost,
            attack: "attack" in card ? card.attack : undefined,
            defense: "defense" in card ? card.defense : undefined,
            ability: "ability" in card ? card.ability : undefined,
            isActive: true,
            createdAt: now,
          });
        }
      }
    }

    // Group cards by name to get quantities
    const cardQuantities = new Map<string, { card: (typeof cardList)[number]; count: number }>();
    for (const card of cardList) {
      const existing = cardQuantities.get(card.name);
      if (existing) {
        existing.count++;
      } else {
        cardQuantities.set(card.name, { card, count: 1 });
      }
    }

    // Create player card inventory
    const cardDefinitionIds: Array<{ id: Id<"cardDefinitions">; quantity: number }> = [];

    for (const [cardName, { card, count }] of Array.from(cardQuantities.entries())) {
      const cardDef = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", cardName))
        .filter((q) => q.eq(q.field("archetype"), card.archetype))
        .filter((q) => q.eq(q.field("cardType"), card.cardType))
        .first();

      if (!cardDef) {
        // Skip if card not found (shouldn't happen after seeding)
        continue;
      }

      // Check if user already owns this card
      const existingPlayerCard = await ctx.db
        .query("playerCards")
        .withIndex("by_user_card", (q) =>
          q.eq("userId", userId).eq("cardDefinitionId", cardDef._id)
        )
        .first();

      if (existingPlayerCard) {
        await ctx.db.patch(existingPlayerCard._id, {
          quantity: existingPlayerCard.quantity + count,
          lastUpdatedAt: now,
        });
      } else {
        await ctx.db.insert("playerCards", {
          userId,
          cardDefinitionId: cardDef._id,
          quantity: count,
          isFavorite: false,
          acquiredAt: now,
          lastUpdatedAt: now,
        });
      }

      cardDefinitionIds.push({ id: cardDef._id, quantity: count });
    }

    // Create the deck
    const deckId = await ctx.db.insert("userDecks", {
      userId,
      name: starterDeck.name,
      description: starterDeck.description,
      deckArchetype: starterDeck.archetype,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add cards to the deck
    const deckCardCounts = new Map<Id<"cardDefinitions">, number>();

    for (const card of cardList) {
      const cardDef = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", card.name))
        .filter((q) => q.eq(q.field("archetype"), card.archetype))
        .filter((q) => q.eq(q.field("cardType"), card.cardType))
        .first();

      if (cardDef) {
        const existing = deckCardCounts.get(cardDef._id);
        deckCardCounts.set(cardDef._id, (existing || 0) + 1);
      }
    }

    // Insert deck cards
    for (const [cardDefId, quantity] of Array.from(deckCardCounts.entries())) {
      await ctx.db.insert("deckCards", {
        deckId,
        cardDefinitionId: cardDefId,
        quantity,
        position: undefined,
      });
    }

    // Set as active deck
    await ctx.db.patch(userId, {
      activeDeckId: deckId,
    });

    return {
      agentId,
      apiKey, // Full key - shown only once!
      keyPrefix,
      internalAgentId, // For wallet ownership
      deckId, // Include the created deck ID
      message: "Agent registered successfully with starter deck",
    };
  },
});

/**
 * Select a starter deck for an existing agent that doesn't have one
 * Used for agents registered before starter deck creation was implemented
 */
export const selectStarterDeckInternal = internalMutation({
  args: {
    userId: v.id("users"),
    starterDeckCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate starter deck code
    if (!isValidDeckCode(args.starterDeckCode)) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.USER_NOT_FOUND, { userId: args.userId });
    }

    // Check if user already has an active deck
    if (user.activeDeckId) {
      throw new Error("Agent already has a deck");
    }

    // Get starter deck metadata
    const starterDeck = STARTER_DECKS.find((d) => d.deckCode === args.starterDeckCode);
    if (!starterDeck) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    // Load card list based on deck code
    const cardListMap: Record<string, readonly (typeof INFERNAL_DRAGONS_CARDS)[number][]> = {
      INFERNAL_DRAGONS: INFERNAL_DRAGONS_CARDS,
      ABYSSAL_DEPTHS: ABYSSAL_DEPTHS_CARDS,
      IRON_LEGION: IRON_LEGION_CARDS,
      STORM_RIDERS: STORM_RIDERS_CARDS,
    };

    const cardList = cardListMap[args.starterDeckCode];
    if (!cardList) {
      throw createError(ErrorCode.AGENT_INVALID_STARTER_DECK, { code: args.starterDeckCode });
    }

    const now = Date.now();

    // Auto-seed cards if they don't exist
    const firstCard = cardList[0];
    if (firstCard) {
      const existingCardDefs = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", firstCard.name))
        .first();

      if (!existingCardDefs) {
        const allCards = [
          ...INFERNAL_DRAGONS_CARDS,
          ...ABYSSAL_DEPTHS_CARDS,
          ...IRON_LEGION_CARDS,
          ...STORM_RIDERS_CARDS,
        ];
        for (const card of allCards) {
          await ctx.db.insert("cardDefinitions", {
            name: card.name,
            rarity: card.rarity,
            cardType: card.cardType,
            archetype: card.archetype,
            cost: card.cost,
            attack: "attack" in card ? card.attack : undefined,
            defense: "defense" in card ? card.defense : undefined,
            ability: "ability" in card ? card.ability : undefined,
            isActive: true,
            createdAt: now,
          });
        }
      }
    }

    // Group cards by name to get quantities
    const cardQuantities = new Map<string, { card: (typeof cardList)[number]; count: number }>();
    for (const card of cardList) {
      const existing = cardQuantities.get(card.name);
      if (existing) {
        existing.count++;
      } else {
        cardQuantities.set(card.name, { card, count: 1 });
      }
    }

    // Create player card inventory
    for (const [cardName, { card, count }] of Array.from(cardQuantities.entries())) {
      const cardDef = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", cardName))
        .filter((q) => q.eq(q.field("archetype"), card.archetype))
        .filter((q) => q.eq(q.field("cardType"), card.cardType))
        .first();

      if (!cardDef) continue;

      const existingPlayerCard = await ctx.db
        .query("playerCards")
        .withIndex("by_user_card", (q) =>
          q.eq("userId", args.userId).eq("cardDefinitionId", cardDef._id)
        )
        .first();

      if (existingPlayerCard) {
        await ctx.db.patch(existingPlayerCard._id, {
          quantity: existingPlayerCard.quantity + count,
          lastUpdatedAt: now,
        });
      } else {
        await ctx.db.insert("playerCards", {
          userId: args.userId,
          cardDefinitionId: cardDef._id,
          quantity: count,
          isFavorite: false,
          acquiredAt: now,
          lastUpdatedAt: now,
        });
      }
    }

    // Create the deck
    const deckId = await ctx.db.insert("userDecks", {
      userId: args.userId,
      name: starterDeck.name,
      description: starterDeck.description,
      deckArchetype: starterDeck.archetype,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add cards to the deck
    const deckCardCounts = new Map<Id<"cardDefinitions">, number>();

    for (const card of cardList) {
      const cardDef = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_name", (q) => q.eq("name", card.name))
        .filter((q) => q.eq(q.field("archetype"), card.archetype))
        .filter((q) => q.eq(q.field("cardType"), card.cardType))
        .first();

      if (cardDef) {
        const existing = deckCardCounts.get(cardDef._id);
        deckCardCounts.set(cardDef._id, (existing || 0) + 1);
      }
    }

    for (const [cardDefId, quantity] of Array.from(deckCardCounts.entries())) {
      await ctx.db.insert("deckCards", {
        deckId,
        cardDefinitionId: cardDefId,
        quantity,
        position: undefined,
      });
    }

    // Set as active deck
    await ctx.db.patch(args.userId, {
      activeDeckId: deckId,
    });

    return {
      success: true,
      deckId,
      deckName: starterDeck.name,
      cardCount: cardList.length,
      message: "Starter deck selected and set as active",
    };
  },
});

/**
 * Register a new AI agent (authenticated version)
 * Creates an HD wallet for the agent derived from the user's wallet tree
 */
export const registerAgent = mutation({
  args: {
    name: v.string(),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    starterDeckCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, privyId } = await requireAuthMutation(ctx);

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
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);

    await ctx.db.insert("apiKeys", {
      agentId,
      userId: userId,
      keyHash,
      keyPrefix,
      isActive: true,
      createdAt: Date.now(),
    });

    // 8. Schedule HD wallet creation for the agent
    // Wallet is derived from user's HD tree at next available index
    // This is non-blocking - wallet will be created asynchronously
    await ctx.scheduler.runAfter(0, internal.wallet.createAgentWallet.createWalletForUserAgent, {
      agentId,
      userId,
      privyUserId: privyId,
    });

    return {
      agentId,
      apiKey, // Full key - shown only once!
      keyPrefix,
      message: "Agent registered successfully. HD wallet creation in progress.",
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
    const keyHash = hashApiKey(apiKey);
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

// TEMPORARY DEBUG - Remove after debugging
export const debugApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const keys = await ctx.db.query("apiKeys").take(10);
    return keys.map(k => ({
      prefix: k.keyPrefix,
      isActive: k.isActive,
      hasHash: !!k.keyHash,
      hashLength: k.keyHash?.length,
    }));
  },
});
