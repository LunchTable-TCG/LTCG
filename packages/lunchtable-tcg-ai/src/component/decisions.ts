import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record an AI agent decision.
 */
export const recordDecision = mutation({
  args: {
    agentId: v.id("agents"),
    gameId: v.string(),
    turnNumber: v.number(),
    phase: v.string(),
    action: v.string(),
    reasoning: v.string(),
    parameters: v.optional(v.any()),
    executionTimeMs: v.optional(v.number()),
    result: v.optional(v.string()),
  },
  returns: v.id("agentDecisions"),
  handler: async (ctx, args) => {
    const decisionId = await ctx.db.insert("agentDecisions", {
      agentId: args.agentId,
      gameId: args.gameId,
      turnNumber: args.turnNumber,
      phase: args.phase,
      action: args.action,
      reasoning: args.reasoning,
      parameters: args.parameters,
      executionTimeMs: args.executionTimeMs,
      result: args.result,
      createdAt: Date.now(),
    });

    return decisionId;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get decisions with optional filtering by agent or game.
 */
export const getDecisions = query({
  args: {
    agentId: v.optional(v.id("agents")),
    gameId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.agentId !== undefined && args.gameId !== undefined) {
      return await ctx.db
        .query("agentDecisions")
        .withIndex("by_agent_game", (q) =>
          q.eq("agentId", args.agentId!).eq("gameId", args.gameId!)
        )
        .order("desc")
        .take(limit);
    }

    if (args.agentId !== undefined) {
      return await ctx.db
        .query("agentDecisions")
        .withIndex("by_agent", (q) => q.eq("agentId", args.agentId!))
        .order("desc")
        .take(limit);
    }

    if (args.gameId !== undefined) {
      return await ctx.db
        .query("agentDecisions")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("agentDecisions")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get all decisions for a specific game.
 */
export const getDecisionsByGame = query({
  args: { gameId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentDecisions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});
