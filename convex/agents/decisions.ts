/**
 * Agent Decision History
 *
 * Stores agent gameplay decisions for analytics, debugging, and learning.
 * Decisions are persisted to the agentDecisions table.
 */

import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";

/**
 * Get recent decisions for streaming overlay (public query)
 * Used by the streaming overlay to display agent decision reasoning
 */
export const getRecentDecisionsForStream = query({
  args: {
    agentId: v.id("agents"),
    gameId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    // If gameId provided, filter to current game only (prevents stale decisions)
    const decisions = args.gameId
      ? await ctx.db
          .query("agentDecisions")
          .withIndex("by_agent_game", (q) =>
            q.eq("agentId", args.agentId).eq("gameId", args.gameId as string)
          )
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("agentDecisions")
          .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
          .order("desc")
          .take(limit);

    // Return only necessary fields for streaming display
    return decisions.map((d) => ({
      turnNumber: d.turnNumber,
      action: d.action,
      reasoning: d.reasoning,
      timestamp: d.createdAt,
    }));
  },
});

/**
 * Save an agent decision to the database
 * Called from HTTP API endpoints (auth handled by caller)
 */
export const saveDecision = mutation({
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
  handler: async (ctx, args) => {
    const decisionId = await ctx.db.insert("agentDecisions", {
      ...args,
      createdAt: Date.now(),
    });
    return decisionId;
  },
});

/**
 * Get decisions for a specific game
 * Called from HTTP API endpoints (auth handled by caller)
 */
export const getGameDecisions = query({
  args: {
    gameId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const decisions = await ctx.db
      .query("agentDecisions")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("asc")
      .take(limit);
    return decisions;
  },
});

/**
 * Get recent decisions for an agent
 * Called from HTTP API endpoints (auth handled by caller)
 */
export const getAgentDecisions = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const decisions = await ctx.db
      .query("agentDecisions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);
    return decisions;
  },
});

/**
 * Get decision statistics for an agent
 */
export const getAgentDecisionStats = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const decisions = await ctx.db
      .query("agentDecisions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const actionCounts: Record<string, number> = {};
    let totalExecutionTime = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const decision of decisions) {
      // Count actions
      actionCounts[decision.action] = (actionCounts[decision.action] ?? 0) + 1;

      // Sum execution times
      if (decision.executionTimeMs) {
        totalExecutionTime += decision.executionTimeMs;
      }

      // Count results
      if (decision.result === "success") {
        successCount++;
      } else if (decision.result === "failure" || decision.result === "error") {
        failureCount++;
      }
    }

    return {
      totalDecisions: decisions.length,
      actionCounts,
      avgExecutionTimeMs: decisions.length > 0 ? totalExecutionTime / decisions.length : 0,
      successRate: decisions.length > 0 ? successCount / decisions.length : 0,
      successCount,
      failureCount,
    };
  },
});

/**
 * Clean up old decisions (keep last N per agent)
 */
export const cleanupOldDecisions = internalMutation({
  args: {
    agentId: v.id("agents"),
    keepCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const keepCount = args.keepCount ?? 1000;

    const decisions = await ctx.db
      .query("agentDecisions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();

    // Delete decisions beyond the keep count
    const toDelete = decisions.slice(keepCount);
    for (const decision of toDelete) {
      await ctx.db.delete(decision._id);
    }

    return { deleted: toDelete.length, kept: Math.min(decisions.length, keepCount) };
  },
});
