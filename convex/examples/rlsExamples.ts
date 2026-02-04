/**
 * Row-Level Security (RLS) Usage Examples
 *
 * This file demonstrates how to use RLS-enabled query and mutation builders
 * for automatic access control enforcement at the database layer.
 *
 * WHEN TO USE RLS:
 * ================
 * Use rlsQuery/rlsMutation when:
 * - Working with sensitive user data (API keys, personal cards, private decks)
 * - Need automatic filtering based on user permissions
 * - Want to prevent unauthorized access at the database layer
 * - Implementing multi-user features with strict data isolation
 *
 * WHEN NOT TO USE RLS:
 * ====================
 * Don't use RLS for:
 * - Public data (card definitions, game templates)
 * - Admin-only operations (use adminQuery/adminMutation instead)
 * - Complex cross-user queries (manual permission checks are clearer)
 * - Performance-critical paths (RLS adds overhead for permission checks)
 *
 * ARCHITECTURE:
 * =============
 * RLS works by wrapping ctx.db with permission checks:
 *
 * 1. Query Operations:
 *    - Results are automatically filtered to only authorized documents
 *    - Unauthorized documents are silently excluded (no errors thrown)
 *    - User sees only data they have permission to access
 *
 * 2. Mutation Operations:
 *    - Insert/update/delete validated against RLS rules
 *    - Unauthorized operations throw permission errors immediately
 *    - Prevents accidental or malicious data modification
 *
 * 3. Integration:
 *    - Works seamlessly with existing triggers (triggers.ts)
 *    - Composable with custom authentication (customFunctions.ts)
 *    - Type-safe with full Convex type inference
 */

import { v } from "convex/values";
import { rlsQuery, rlsMutation } from "../lib/customFunctions";
import { ErrorCode, createError } from "../lib/errorCodes";

// =============================================================================
// EXAMPLE 1: API KEYS - USER ISOLATION
// =============================================================================

/**
 * Get all API keys for the current user
 *
 * RLS automatically filters results to only this user's keys.
 * Even if we query all keys, only authorized ones are returned.
 *
 * SECURITY:
 * - Users see only their own API keys
 * - Admins can see all keys (defined in RLS rules)
 * - Superadmins have unrestricted access
 */
export const getMyApiKeys = rlsQuery({
  args: {},
  handler: async (ctx) => {
    // Query all API keys - RLS will filter to user's keys only
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", ctx.auth.userId))
      .collect();

    // Map to safe response (don't expose key hashes)
    return keys.map((key) => ({
      _id: key._id,
      keyPrefix: key.keyPrefix,
      agentId: key.agentId,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    }));
  },
});

/**
 * Create a new API key for the current user
 *
 * RLS validates that the userId in the insert matches the authenticated user.
 * Throws an error if user tries to create a key for someone else.
 *
 * SECURITY:
 * - Users can only create keys for themselves
 * - Superadmins can create keys for anyone
 */
export const createMyApiKey = rlsMutation({
  args: {
    agentId: v.id("agents"),
    keyHash: v.string(),
    keyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify agent exists and belongs to user
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Agent not found",
      });
    }

    if (agent.createdBy !== ctx.auth.userId) {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: "Cannot create API key for another user's agent",
      });
    }

    // RLS will validate that userId matches authenticated user
    const keyId = await ctx.db.insert("apiKeys", {
      userId: ctx.auth.userId, // Must match auth.userId or RLS will reject
      agentId: args.agentId,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      isActive: true,
      createdAt: Date.now(),
    });

    return keyId;
  },
});

/**
 * Revoke (deactivate) a user's own API key
 *
 * RLS validates that the key belongs to the authenticated user before allowing update.
 * Throws an error if user tries to revoke another user's key.
 *
 * SECURITY:
 * - Users can only revoke their own keys
 * - Admins can revoke any key (via admin endpoints)
 */
export const revokeMyApiKey = rlsMutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "API key not found",
      });
    }

    // RLS will verify key.userId === ctx.auth.userId before allowing patch
    await ctx.db.patch(args.keyId, {
      isActive: false,
    });

    return {
      success: true,
      message: "API key revoked successfully",
    };
  },
});

// =============================================================================
// EXAMPLE 2: PLAYER CARDS - COLLECTION ISOLATION
// =============================================================================

/**
 * Get the current user's card collection
 *
 * RLS ensures users only see their own cards.
 * Admins can see all collections (for support purposes).
 *
 * SECURITY:
 * - Users see only their owned cards
 * - Admins can view any collection
 * - Superadmins have full access
 */
export const getMyCards = rlsQuery({
  args: {
    favoriteOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Build base query - RLS will filter to user's cards
    let query = ctx.db
      .query("playerCards")
      .withIndex("by_user", (q) => q.eq("userId", ctx.auth.userId));

    // Apply favorite filter if requested
    if (args.favoriteOnly) {
      query = query.filter((q) => q.eq(q.field("isFavorite"), true));
    }

    const playerCards = await query.collect();

    // Enrich with card definitions
    const enrichedCards = await Promise.all(
      playerCards.map(async (pc) => {
        const cardDef = await ctx.db.get(pc.cardDefinitionId);
        return {
          ...pc,
          cardDefinition: cardDef,
        };
      })
    );

    return enrichedCards;
  },
});

/**
 * Mark a card as favorite in user's collection
 *
 * RLS validates the card belongs to the user before allowing update.
 *
 * SECURITY:
 * - Users can only modify their own card collection
 * - Prevents users from favoriting cards in other collections
 */
export const toggleCardFavorite = rlsMutation({
  args: {
    playerCardId: v.id("playerCards"),
    isFavorite: v.boolean(),
  },
  handler: async (ctx, args) => {
    const playerCard = await ctx.db.get(args.playerCardId);
    if (!playerCard) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Card not found in your collection",
      });
    }

    // RLS validates playerCard.userId === ctx.auth.userId
    await ctx.db.patch(args.playerCardId, {
      isFavorite: args.isFavorite,
      lastUpdatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Card ${args.isFavorite ? "added to" : "removed from"} favorites`,
    };
  },
});

// =============================================================================
// EXAMPLE 3: DECK MANAGEMENT - OWNERSHIP VALIDATION
// =============================================================================

/**
 * Get all decks for the current user
 *
 * RLS filters to only decks owned by the authenticated user.
 * Admins can see all decks (for moderation/support).
 *
 * SECURITY:
 * - Users see only their own decks
 * - Admins can view all decks
 * - Deck privacy is enforced at DB layer
 */
export const getMyDecks = rlsQuery({
  args: {},
  handler: async (ctx) => {
    // RLS automatically filters to user's decks
    const decks = await ctx.db
      .query("userDecks")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", ctx.auth.userId).eq("isActive", true)
      )
      .collect();

    // Get card counts for each deck
    const decksWithCounts = await Promise.all(
      decks.map(async (deck) => {
        const deckCards = await ctx.db
          .query("deckCards")
          .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
          .collect();

        const cardCount = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);

        return {
          _id: deck._id,
          name: deck.name,
          description: deck.description,
          deckArchetype: deck.deckArchetype,
          cardCount,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
        };
      })
    );

    return decksWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Update a deck's name and description
 *
 * RLS validates the deck belongs to the user before allowing update.
 * Prevents users from modifying other players' decks.
 *
 * SECURITY:
 * - Users can only modify their own decks
 * - Deck ownership verified at DB layer
 * - Superadmins can modify any deck
 */
export const updateMyDeck = rlsMutation({
  args: {
    deckId: v.id("userDecks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.deckId);
    if (!deck) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Deck not found",
      });
    }

    // Build update object
    type DeckUpdate = {
      updatedAt: number;
      name?: string;
      description?: string;
    };

    const updates: DeckUpdate = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    // RLS validates deck.userId === ctx.auth.userId
    await ctx.db.patch(args.deckId, updates);

    return {
      success: true,
      message: "Deck updated successfully",
    };
  },
});

/**
 * Add a card to a user's deck
 *
 * RLS validates:
 * 1. The deck belongs to the user (via deckCards RLS rule)
 * 2. The card is being added to an owned deck
 *
 * SECURITY:
 * - Users can only add cards to their own decks
 * - Deck ownership validated through deck lookup
 * - Prevents adding cards to other users' decks
 */
export const addCardToDeck = rlsMutation({
  args: {
    deckId: v.id("userDecks"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify deck exists and belongs to user
    const deck = await ctx.db.get(args.deckId);
    if (!deck) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Deck not found",
      });
    }

    // Verify user owns this card
    const playerCard = await ctx.db
      .query("playerCards")
      .withIndex("by_user_card", (q) =>
        q.eq("userId", ctx.auth.userId).eq("cardDefinitionId", args.cardDefinitionId)
      )
      .first();

    if (!playerCard || playerCard.quantity < args.quantity) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You don't own enough copies of this card",
      });
    }

    // Check if card already exists in deck
    const existingDeckCard = await ctx.db
      .query("deckCards")
      .withIndex("by_deck_card", (q) =>
        q.eq("deckId", args.deckId).eq("cardDefinitionId", args.cardDefinitionId)
      )
      .first();

    if (existingDeckCard) {
      // Update quantity (RLS validates deck ownership)
      await ctx.db.patch(existingDeckCard._id, {
        quantity: existingDeckCard.quantity + args.quantity,
      });
    } else {
      // Insert new deck card (RLS validates deck ownership)
      await ctx.db.insert("deckCards", {
        deckId: args.deckId,
        cardDefinitionId: args.cardDefinitionId,
        quantity: args.quantity,
      });
    }

    // Update deck timestamp
    await ctx.db.patch(args.deckId, {
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Card added to deck successfully",
    };
  },
});

// =============================================================================
// EXAMPLE 4: ADMIN OPERATIONS - BYPASS RESTRICTIONS
// =============================================================================

/**
 * Admin endpoint to view any user's API keys
 *
 * Uses regular adminQuery instead of rlsQuery because:
 * - Admins explicitly need to see all keys
 * - RLS would require manual bypass logic
 * - Clearer to use adminQuery for admin-specific operations
 *
 * WHEN TO USE adminQuery vs rlsQuery:
 * - adminQuery: When you WANT full access to all data
 * - rlsQuery: When you WANT automatic filtering based on permissions
 */
// NOTE: This would be in admin/apiKeys.ts, not here
// Shown for comparison purposes only

// =============================================================================
// NOTES & BEST PRACTICES
// =============================================================================

/**
 * PERFORMANCE CONSIDERATIONS:
 * ===========================
 * - RLS adds permission checks on every DB operation
 * - For read operations, this is usually negligible
 * - For write operations with complex rules, consider caching admin status
 * - Profile before optimizing - most apps won't notice the overhead
 *
 * TESTING RLS:
 * ============
 * Always test:
 * 1. User can access their own data
 * 2. User CANNOT access other users' data
 * 3. Admins have appropriate access levels
 * 4. Superadmins can bypass restrictions
 * 5. Error messages don't leak information about forbidden data
 *
 * DEBUGGING RLS:
 * ==============
 * If queries return no results unexpectedly:
 * 1. Check RLS rules in lib/rowLevelSecurity.ts
 * 2. Verify auth context is populated correctly
 * 3. Test with superadmin user to confirm data exists
 * 4. Add logging to RLS rules (temporary, for debugging)
 *
 * MIGRATION FROM NON-RLS CODE:
 * ============================
 * When converting existing endpoints to RLS:
 * 1. Identify tables that need access control
 * 2. Define RLS rules in lib/rowLevelSecurity.ts
 * 3. Replace query/mutation with rlsQuery/rlsMutation
 * 4. Remove manual permission checks (RLS handles it)
 * 5. Test thoroughly with different user roles
 * 6. Verify existing frontend code still works
 */
