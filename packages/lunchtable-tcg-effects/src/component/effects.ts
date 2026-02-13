import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// EFFECT MANAGEMENT
// ============================================================================

/**
 * Activate a new effect
 *
 * Inserts into activeEffects table with the provided configuration.
 * Returns the effect ID as a string for component boundary compatibility.
 */
export const activate = mutation({
  args: {
    gameId: v.string(),
    sourceCardId: v.string(),
    effectType: v.string(),
    targets: v.array(v.string()),
    duration: v.string(),
    data: v.any(),
    appliedTurn: v.optional(v.number()),
    appliedPhase: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("activeEffects", {
      gameId: args.gameId,
      sourceCardId: args.sourceCardId,
      effectType: args.effectType,
      targets: args.targets,
      duration: args.duration,
      data: args.data,
      appliedTurn: args.appliedTurn,
      appliedPhase: args.appliedPhase,
      metadata: args.metadata,
    });
    return id as string;
  },
});

/**
 * Get all active effects for a game
 *
 * Uses the by_game index for efficient querying.
 */
export const getActive = query({
  args: {
    gameId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const effects = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    return effects.map((effect) => ({
      ...effect,
      _id: effect._id as string,
    }));
  },
});

/**
 * Get active effects for a specific source card
 *
 * Filters all active effects by sourceCardId.
 */
export const getActiveForCard = query({
  args: {
    gameId: v.string(),
    sourceCardId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const effects = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const filtered = effects.filter(
      (effect) => effect.sourceCardId === args.sourceCardId
    );

    return filtered.map((effect) => ({
      ...effect,
      _id: effect._id as string,
    }));
  },
});

/**
 * Get all modifier effects affecting game state
 *
 * Returns effects with types that modify stats or apply continuous buffs/debuffs.
 * Optionally filters by target card ID.
 */
export const getModifiers = query({
  args: {
    gameId: v.string(),
    targetCardId: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const modifierTypes = new Set([
      "modifyATK",
      "modifyDEF",
      "continuous_buff",
      "continuous_debuff",
    ]);

    const effects = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    let filtered = effects.filter((effect) =>
      modifierTypes.has(effect.effectType)
    );

    // Filter by target if provided
    if (args.targetCardId !== undefined) {
      const targetCardId = args.targetCardId;
      filtered = filtered.filter((effect) =>
        effect.targets.includes(targetCardId)
      );
    }

    return filtered.map((effect) => ({
      ...effect,
      _id: effect._id as string,
    }));
  },
});

/**
 * Remove a specific active effect
 *
 * Deletes an effect by ID.
 */
export const remove = mutation({
  args: {
    effectId: v.id("activeEffects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.effectId);
    return null;
  },
});

/**
 * Cleanup expired effects
 *
 * Removes effects based on duration rules:
 * - "until_end_of_turn" + appliedTurn < currentTurn → remove
 * - "until_end_of_phase" + appliedPhase !== currentPhase → remove
 * - "turns:N" where N turns have passed → remove
 * - "permanent" → never remove
 *
 * Returns count of removed effects.
 */
export const cleanupExpired = mutation({
  args: {
    gameId: v.string(),
    currentTurn: v.number(),
    currentPhase: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const effects = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    let removedCount = 0;

    for (const effect of effects) {
      let shouldRemove = false;

      if (effect.duration === "until_end_of_turn") {
        // Remove if applied turn is before current turn
        if (
          effect.appliedTurn !== undefined &&
          effect.appliedTurn < args.currentTurn
        ) {
          shouldRemove = true;
        }
      } else if (effect.duration === "until_end_of_phase") {
        // Remove if phase has changed
        if (
          effect.appliedPhase !== undefined &&
          effect.appliedPhase !== args.currentPhase
        ) {
          shouldRemove = true;
        }
      } else if (effect.duration.startsWith("turns:")) {
        // Extract turn count and check if expired
        const turnCount = parseInt(effect.duration.split(":")[1], 10);
        if (
          !isNaN(turnCount) &&
          effect.appliedTurn !== undefined &&
          args.currentTurn - effect.appliedTurn >= turnCount
        ) {
          shouldRemove = true;
        }
      }
      // "permanent" effects are never removed by cleanup

      if (shouldRemove) {
        await ctx.db.delete(effect._id);
        removedCount++;
      }
    }

    return removedCount;
  },
});

/**
 * Remove all active effects for a game
 *
 * Typically called when a game ends or resets.
 * Returns count of removed effects.
 */
export const removeAllForGame = mutation({
  args: {
    gameId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const effects = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    for (const effect of effects) {
      await ctx.db.delete(effect._id);
    }

    return effects.length;
  },
});

// ============================================================================
// OPT (ONCE PER TURN) TRACKING
// ============================================================================

/**
 * Check if a card's effect can be activated this turn
 *
 * Returns whether the effect has been used based on OPT tracking.
 */
export const checkOPT = query({
  args: {
    gameId: v.string(),
    cardId: v.string(),
    effectId: v.string(),
    turnNumber: v.number(),
  },
  returns: v.object({
    canActivate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const tracking = await ctx.db
      .query("optTracking")
      .withIndex("by_game_card", (q) =>
        q.eq("gameId", args.gameId).eq("cardId", args.cardId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("effectId"), args.effectId),
          q.eq(q.field("turnNumber"), args.turnNumber)
        )
      )
      .first();

    // If no tracking entry exists, or usedThisTurn is false, can activate
    const canActivate = !tracking || !tracking.usedThisTurn;

    return { canActivate };
  },
});

/**
 * Mark an effect as used this turn
 *
 * Creates or updates OPT tracking entry.
 */
export const markUsed = mutation({
  args: {
    gameId: v.string(),
    cardId: v.string(),
    effectId: v.string(),
    turnNumber: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if entry exists
    const existing = await ctx.db
      .query("optTracking")
      .withIndex("by_game_card", (q) =>
        q.eq("gameId", args.gameId).eq("cardId", args.cardId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("effectId"), args.effectId),
          q.eq(q.field("turnNumber"), args.turnNumber)
        )
      )
      .first();

    if (existing) {
      // Update existing entry
      await ctx.db.patch(existing._id, {
        usedThisTurn: true,
      });
    } else {
      // Create new entry
      await ctx.db.insert("optTracking", {
        gameId: args.gameId,
        cardId: args.cardId,
        effectId: args.effectId,
        turnNumber: args.turnNumber,
        usedThisTurn: true,
      });
    }

    return null;
  },
});

/**
 * Reset OPT tracking for a new turn
 *
 * Deletes all tracking entries from previous turns.
 */
export const resetForTurn = mutation({
  args: {
    gameId: v.string(),
    currentTurn: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const allTracking = await ctx.db
      .query("optTracking")
      .withIndex("by_game_card", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Delete entries from previous turns
    for (const entry of allTracking) {
      if (entry.turnNumber < args.currentTurn) {
        await ctx.db.delete(entry._id);
      }
    }

    return null;
  },
});
