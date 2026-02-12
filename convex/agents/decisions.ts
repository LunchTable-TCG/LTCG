/**
 * Agent Decision History
 *
 * Stores agent gameplay decisions for analytics, debugging, and learning.
 * Decisions are persisted to the agentDecisions table.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type MutationCtx, query, type QueryCtx } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";

type DecisionAccess = { kind: "internal" } | { kind: "user"; userId: Id<"users"> };

function hasValidInternalAuth(internalAuth?: string): boolean {
  const expectedSecret = process.env["INTERNAL_API_SECRET"]?.trim();
  const providedSecret = internalAuth?.trim();
  if (!expectedSecret || !providedSecret) {
    return false;
  }
  return expectedSecret === providedSecret;
}

async function isInternalCaller(ctx: QueryCtx | MutationCtx, internalAuth?: string): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.issuer === "convex") {
    return true;
  }
  return hasValidInternalAuth(internalAuth);
}

async function resolveWriteAccess(
  ctx: MutationCtx,
  internalAuth?: string
): Promise<DecisionAccess> {
  if (await isInternalCaller(ctx, internalAuth)) {
    return { kind: "internal" };
  }
  const auth = await requireAuthMutation(ctx);
  return { kind: "user", userId: auth.userId };
}

async function resolveReadAccess(
  ctx: QueryCtx,
  internalAuth?: string
): Promise<DecisionAccess> {
  if (await isInternalCaller(ctx, internalAuth)) {
    return { kind: "internal" };
  }
  const auth = await requireAuthQuery(ctx);
  return { kind: "user", userId: auth.userId };
}

async function assertAgentOwnedByUser(
  ctx: QueryCtx | MutationCtx,
  agentId: Id<"agents">,
  userId: Id<"users">
) {
  const agent = await ctx.db.get(agentId);
  if (!agent || agent.userId !== userId) {
    throw new Error("Unauthorized");
  }
}

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
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveWriteAccess(ctx, args.internalAuth);
    if (access.kind === "user") {
      await assertAgentOwnedByUser(ctx, args.agentId, access.userId);
    }

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

/**
 * Get decisions for a specific game
 * Called from HTTP API endpoints (auth handled by caller)
 */
export const getGameDecisions = query({
  args: {
    gameId: v.string(),
    agentId: v.optional(v.id("agents")),
    limit: v.optional(v.number()),
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveReadAccess(ctx, args.internalAuth);
    const limit = args.limit ?? 100;

    if (access.kind === "user") {
      if (!args.agentId) {
        throw new Error("agentId is required");
      }
      await assertAgentOwnedByUser(ctx, args.agentId, access.userId);
    }

    const decisions = args.agentId
      ? await ctx.db
          .query("agentDecisions")
          .withIndex("by_agent_game", (q) =>
            q.eq("agentId", args.agentId as Id<"agents">).eq("gameId", args.gameId)
          )
          .order("asc")
          .take(limit)
      : await ctx.db
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
    internalAuth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = await resolveReadAccess(ctx, args.internalAuth);
    if (access.kind === "user") {
      await assertAgentOwnedByUser(ctx, args.agentId, access.userId);
    }

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
