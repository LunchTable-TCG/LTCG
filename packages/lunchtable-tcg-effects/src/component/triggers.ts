import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Trigger return validator
const triggerValidator = v.object({
  _id: v.string(),
  gameId: v.string(),
  sourceCardId: v.string(),
  effectType: v.string(),
  targets: v.array(v.string()),
  duration: v.string(),
  data: v.any(),
  appliedTurn: v.optional(v.number()),
  appliedPhase: v.optional(v.string()),
  metadata: v.optional(v.any()),
});

/**
 * Registers a trigger callback.
 * Stores in activeEffects table with effectType prefixed as "trigger:".
 */
export const registerTrigger = mutation({
  args: {
    gameId: v.string(),
    sourceCardId: v.string(),
    triggerEvent: v.string(),
    callbackHandle: v.string(),
    spellSpeed: v.number(),
    isOptional: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const triggerId = await ctx.db.insert("activeEffects", {
      gameId: args.gameId,
      sourceCardId: args.sourceCardId,
      effectType: `trigger:${args.triggerEvent}`,
      targets: [],
      duration: "permanent",
      data: {
        callbackHandle: args.callbackHandle,
        spellSpeed: args.spellSpeed,
        isOptional: args.isOptional ?? false,
      },
      metadata: args.metadata,
    });

    return triggerId as string;
  },
});

/**
 * Finds all registered triggers matching an event type for a game.
 * Queries activeEffects where effectType starts with "trigger:" and matches the event.
 */
export const getTriggered = query({
  args: {
    gameId: v.string(),
    triggerEvent: v.string(),
  },
  returns: v.array(triggerValidator),
  handler: async (ctx, args) => {
    const triggers = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Filter by trigger event type
    const matchingTriggers = triggers.filter(
      (trigger) => trigger.effectType === `trigger:${args.triggerEvent}`
    );

    return matchingTriggers.map((trigger) => ({
      ...trigger,
      _id: trigger._id as string,
    }));
  },
});

/**
 * Removes a registered trigger by ID.
 */
export const removeTrigger = mutation({
  args: {
    triggerId: v.id("activeEffects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trigger = await ctx.db.get(args.triggerId);
    if (!trigger) {
      throw new Error(`Trigger not found: ${args.triggerId}`);
    }

    await ctx.db.delete(args.triggerId);
    return null;
  },
});

/**
 * Removes all triggers for a specific card (when card leaves field).
 */
export const clearTriggersForCard = mutation({
  args: {
    gameId: v.string(),
    sourceCardId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const triggers = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Filter by sourceCardId and effectType starting with "trigger:"
    const cardTriggers = triggers.filter(
      (trigger) =>
        trigger.sourceCardId === args.sourceCardId &&
        trigger.effectType.startsWith("trigger:")
    );

    // Delete all matching triggers
    for (const trigger of cardTriggers) {
      await ctx.db.delete(trigger._id);
    }

    return null;
  },
});

/**
 * Removes all triggers for a game (cleanup).
 */
export const clearTriggersForGame = mutation({
  args: {
    gameId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const triggers = await ctx.db
      .query("activeEffects")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Filter by effectType starting with "trigger:"
    const gameTriggers = triggers.filter((trigger) =>
      trigger.effectType.startsWith("trigger:")
    );

    // Delete all matching triggers
    for (const trigger of gameTriggers) {
      await ctx.db.delete(trigger._id);
    }

    return null;
  },
});
