/**
 * Card Definition Admin Module
 *
 * CRUD operations for managing card definitions.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Card type validators matching schema
const rarityValidator = v.union(
  v.literal("common"),
  v.literal("uncommon"),
  v.literal("rare"),
  v.literal("epic"),
  v.literal("legendary")
);

const archetypeValidator = v.union(
  // Primary archetypes
  v.literal("infernal_dragons"),
  v.literal("abyssal_depths"),
  v.literal("iron_legion"),
  v.literal("necro_empire"),
  // Legacy archetypes
  v.literal("abyssal_horrors"),
  v.literal("nature_spirits"),
  v.literal("storm_elementals"),
  // Future archetypes
  v.literal("shadow_assassins"),
  v.literal("celestial_guardians"),
  v.literal("undead_legion"),
  v.literal("divine_knights"),
  v.literal("arcane_mages"),
  v.literal("mechanical_constructs"),
  v.literal("neutral"),
  // Deprecated archetypes (for backward compatibility)
  v.literal("fire"),
  v.literal("water"),
  v.literal("earth"),
  v.literal("wind")
);

const cardTypeValidator = v.union(
  v.literal("creature"),
  v.literal("spell"),
  v.literal("trap"),
  v.literal("equipment")
);

const attributeValidator = v.union(
  v.literal("fire"),
  v.literal("water"),
  v.literal("earth"),
  v.literal("wind"),
  v.literal("light"),
  v.literal("dark"),
  v.literal("divine"),
  v.literal("neutral")
);

const monsterTypeValidator = v.union(
  v.literal("dragon"),
  v.literal("spellcaster"),
  v.literal("warrior"),
  v.literal("beast"),
  v.literal("fiend"),
  v.literal("zombie"),
  v.literal("machine"),
  v.literal("aqua"),
  v.literal("pyro"),
  v.literal("divine_beast")
);

const spellTypeValidator = v.union(
  v.literal("normal"),
  v.literal("quick_play"),
  v.literal("continuous"),
  v.literal("field"),
  v.literal("equip"),
  v.literal("ritual")
);

const trapTypeValidator = v.union(
  v.literal("normal"),
  v.literal("continuous"),
  v.literal("counter")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all card definitions with optional filtering
 */
export const listCards = query({
  args: {
    rarity: v.optional(rarityValidator),
    archetype: v.optional(archetypeValidator),
    cardType: v.optional(cardTypeValidator),
    search: v.optional(v.string()),
    includeInactive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    // Build query based on filters
    const cards = await (async () => {
      if (args.rarity) {
        const rarity = args.rarity;
        return await ctx.db
          .query("cardDefinitions")
          .withIndex("by_rarity", (q) => q.eq("rarity", rarity))
          .collect();
      }
      if (args.archetype) {
        const archetype = args.archetype;
        return await ctx.db
          .query("cardDefinitions")
          .withIndex("by_archetype", (q) => q.eq("archetype", archetype))
          .collect();
      }
      if (args.cardType) {
        const cardType = args.cardType;
        return await ctx.db
          .query("cardDefinitions")
          .withIndex("by_type", (q) => q.eq("cardType", cardType))
          .collect();
      }
      return await ctx.db.query("cardDefinitions").collect();
    })();

    type Card = (typeof cards)[number];

    // Apply additional filters
    let filtered = cards;

    if (!args.includeInactive) {
      filtered = filtered.filter((c: Card) => c.isActive);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filtered = filtered.filter((c: Card) => c.name.toLowerCase().includes(searchLower));
    }

    // Sort by name
    filtered.sort((a: Card, b: Card) => a.name.localeCompare(b.name));

    // Paginate
    const totalCount = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      cards: paginated,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

/**
 * Get a single card definition by ID
 */
export const getCard = query({
  args: {
    cardId: v.id("cardDefinitions"),
  },
  handler: async (ctx, { cardId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db.get(cardId);
  },
});

/**
 * Get card statistics
 */
export const getCardStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const allCards = await ctx.db.query("cardDefinitions").collect();
    const activeCards = allCards.filter((c) => c.isActive);

    // Count by rarity
    const byRarity = {
      common: activeCards.filter((c) => c.rarity === "common").length,
      uncommon: activeCards.filter((c) => c.rarity === "uncommon").length,
      rare: activeCards.filter((c) => c.rarity === "rare").length,
      epic: activeCards.filter((c) => c.rarity === "epic").length,
      legendary: activeCards.filter((c) => c.rarity === "legendary").length,
    };

    // Count by type
    const byType = {
      creature: activeCards.filter((c) => c.cardType === "creature").length,
      spell: activeCards.filter((c) => c.cardType === "spell").length,
      trap: activeCards.filter((c) => c.cardType === "trap").length,
      equipment: activeCards.filter((c) => c.cardType === "equipment").length,
    };

    // Count by archetype
    const archetypeCounts: Record<string, number> = {};
    for (const card of activeCards) {
      archetypeCounts[card.archetype] = (archetypeCounts[card.archetype] || 0) + 1;
    }

    return {
      totalCards: allCards.length,
      activeCards: activeCards.length,
      inactiveCards: allCards.length - activeCards.length,
      byRarity,
      byType,
      byArchetype: archetypeCounts,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new card definition
 */
export const createCard = mutation({
  args: {
    name: v.string(),
    rarity: rarityValidator,
    archetype: archetypeValidator,
    cardType: cardTypeValidator,
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),
    level: v.optional(v.number()),
    attribute: v.optional(attributeValidator),
    monsterType: v.optional(monsterTypeValidator),
    spellType: v.optional(spellTypeValidator),
    trapType: v.optional(trapTypeValidator),
    ability: v.optional(v.any()),
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate creature has attack/defense
    if (args.cardType === "creature") {
      if (args.attack === undefined || args.defense === undefined) {
        throw new Error("Creatures must have attack and defense values");
      }
    }

    const cardId = await ctx.db.insert("cardDefinitions", {
      name: args.name,
      rarity: args.rarity,
      archetype: args.archetype,
      cardType: args.cardType,
      attack: args.attack,
      defense: args.defense,
      cost: args.cost,
      level: args.level,
      attribute: args.attribute,
      monsterType: args.monsterType,
      spellType: args.spellType,
      trapType: args.trapType,
      ability: args.ability,
      flavorText: args.flavorText,
      imageUrl: args.imageUrl,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_card",
      metadata: {
        cardId,
        cardName: args.name,
        rarity: args.rarity,
        cardType: args.cardType,
        archetype: args.archetype,
      },
      success: true,
    });

    return { cardId, message: `Created card "${args.name}"` };
  },
});

/**
 * Update an existing card definition
 */
export const updateCard = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
    name: v.optional(v.string()),
    rarity: v.optional(rarityValidator),
    archetype: v.optional(archetypeValidator),
    cardType: v.optional(cardTypeValidator),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.optional(v.number()),
    level: v.optional(v.number()),
    attribute: v.optional(attributeValidator),
    monsterType: v.optional(monsterTypeValidator),
    spellType: v.optional(spellTypeValidator),
    trapType: v.optional(trapTypeValidator),
    ability: v.optional(v.any()),
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const { cardId, ...updates } = args;

    const existingCard = await ctx.db.get(cardId);
    if (!existingCard) {
      throw new Error("Card not found");
    }

    // Build update object with only defined values
    const updateObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateObj[key] = value;
      }
    }

    if (Object.keys(updateObj).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(cardId, updateObj);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_card",
      metadata: {
        cardId,
        cardName: existingCard.name,
        updates: Object.keys(updateObj).join(", "),
      },
      success: true,
    });

    return { success: true, message: `Updated card "${existingCard.name}"` };
  },
});

/**
 * Toggle card active status (soft delete/undelete)
 */
export const toggleCardActive = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
  },
  handler: async (ctx, { cardId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    const newStatus = !card.isActive;
    await ctx.db.patch(cardId, { isActive: newStatus });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "activate_card" : "deactivate_card",
      metadata: {
        cardId,
        cardName: card.name,
        previousStatus: card.isActive,
        newStatus,
      },
      success: true,
    });

    return {
      success: true,
      isActive: newStatus,
      message: `Card "${card.name}" is now ${newStatus ? "active" : "inactive"}`,
    };
  },
});

/**
 * Delete a card permanently (use with caution)
 * Only deletes if no players own this card
 */
export const deleteCard = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { cardId, force }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin"); // Requires superadmin

    const card = await ctx.db.get(cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Check if any players own this card
    const playerCards = await ctx.db
      .query("playerCards")
      .withIndex("by_user_card")
      .filter((q) => q.eq(q.field("cardDefinitionId"), cardId))
      .first();

    if (playerCards && !force) {
      throw new Error(
        "Cannot delete card: players own this card. Use force=true to delete anyway (will orphan player cards)."
      );
    }

    await ctx.db.delete(cardId);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_card",
      metadata: {
        cardId,
        cardName: card.name,
        forced: !!force,
      },
      success: true,
    });

    return { success: true, message: `Permanently deleted card "${card.name}"` };
  },
});

/**
 * Duplicate a card (useful for creating variants)
 */
export const duplicateCard = mutation({
  args: {
    cardId: v.id("cardDefinitions"),
    newName: v.string(),
  },
  handler: async (ctx, { cardId, newName }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const sourceCard = await ctx.db.get(cardId);
    if (!sourceCard) {
      throw new Error("Source card not found");
    }

    // Check for name collision
    const existingCard = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_name", (q) => q.eq("name", newName))
      .first();

    if (existingCard) {
      throw new Error(`A card named "${newName}" already exists`);
    }

    // Extract only the fields needed, excluding _id and _creationTime
    const { _id, _creationTime, ...cardData } = sourceCard;
    const newCardId = await ctx.db.insert("cardDefinitions", {
      ...cardData,
      name: newName,
      isActive: false, // Start as inactive
      createdAt: Date.now(),
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId,
      action: "duplicate_card",
      metadata: {
        sourceCardId: cardId,
        sourceCardName: sourceCard.name,
        newCardId,
        newCardName: newName,
      },
      success: true,
    });

    return {
      cardId: newCardId,
      message: `Created "${newName}" as a copy of "${sourceCard.name}"`,
    };
  },
});
