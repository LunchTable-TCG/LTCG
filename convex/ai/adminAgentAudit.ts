/**
 * Admin Agent Audit Logging
 *
 * Provides audit logging for all Admin Agent operations.
 * Logs are stored in the adminAuditLogs table for compliance and debugging.
 *
 * Tracks:
 * - Agent tool calls and their parameters
 * - Token usage and response metrics
 * - Admin actions executed through the agent
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// =============================================================================
// Internal Mutations for Audit Logging
// =============================================================================

/**
 * Log when the agent uses a tool
 *
 * Records tool invocations with their parameters and results
 * for debugging and audit trail purposes.
 */
export const logAgentToolCall = internalMutation({
  args: {
    adminId: v.id("users"),
    threadId: v.string(),
    toolName: v.string(),
    toolArgs: v.any(),
    toolResult: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.insert("adminAuditLogs", {
        adminId: args.adminId,
        action: "agent_tool_call",
        timestamp: Date.now(),
        success: args.success,
        errorMessage: args.errorMessage,
        metadata: {
          threadId: args.threadId,
          toolName: args.toolName,
          toolArgs: args.toolArgs,
          toolResult: args.toolResult,
          durationMs: args.durationMs,
        },
      });

      return { success: true };
    } catch (error) {
      // Log error but don't throw - we don't want audit logging to break agent operations
      console.error("Failed to log agent tool call:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Log agent response metrics
 *
 * Records token usage and response statistics for monitoring
 * and cost tracking purposes.
 */
export const logAgentResponse = internalMutation({
  args: {
    adminId: v.id("users"),
    threadId: v.string(),
    promptLength: v.number(),
    responseLength: v.number(),
    toolCallCount: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    modelId: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.insert("adminAuditLogs", {
        adminId: args.adminId,
        action: "agent_response",
        timestamp: Date.now(),
        success: true,
        metadata: {
          threadId: args.threadId,
          promptLength: args.promptLength,
          responseLength: args.responseLength,
          toolCallCount: args.toolCallCount,
          inputTokens: args.inputTokens,
          outputTokens: args.outputTokens,
          totalTokens: args.totalTokens,
          modelId: args.modelId,
          durationMs: args.durationMs,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to log agent response:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Log when the agent executes an admin action
 *
 * Records when the agent performs write operations on behalf
 * of an admin (e.g., banning a player, adding currency).
 */
export const logAgentAction = internalMutation({
  args: {
    adminId: v.id("users"),
    threadId: v.string(),
    actionType: v.string(),
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    actionParams: v.any(),
    result: v.any(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    requiresConfirmation: v.optional(v.boolean()),
    confirmedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.insert("adminAuditLogs", {
        adminId: args.adminId,
        action: `agent_action:${args.actionType}`,
        targetUserId: args.targetUserId,
        targetEmail: args.targetEmail,
        timestamp: Date.now(),
        success: args.success,
        errorMessage: args.errorMessage,
        metadata: {
          threadId: args.threadId,
          actionType: args.actionType,
          actionParams: args.actionParams,
          result: args.result,
          requiresConfirmation: args.requiresConfirmation,
          confirmedBy: args.confirmedBy,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to log agent action:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Log agent session events
 *
 * Records session-level events like thread creation, deletion,
 * and context switches.
 */
export const logAgentSessionEvent = internalMutation({
  args: {
    adminId: v.id("users"),
    threadId: v.optional(v.string()),
    eventType: v.union(
      v.literal("thread_created"),
      v.literal("thread_deleted"),
      v.literal("thread_cleared"),
      v.literal("context_loaded"),
      v.literal("rag_search")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.db.insert("adminAuditLogs", {
        adminId: args.adminId,
        action: `agent_session:${args.eventType}`,
        timestamp: Date.now(),
        success: true,
        metadata: {
          threadId: args.threadId,
          eventType: args.eventType,
          ...args.metadata,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to log agent session event:", error);
      return { success: false, error: String(error) };
    }
  },
});

// =============================================================================
// Audit Query Helpers
// =============================================================================

/**
 * Parameters for agent audit log retrieval
 */
export interface AgentAuditLogParams {
  adminId?: Id<"users">;
  threadId?: string;
  actionType?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
}

/**
 * Get agent-related audit logs
 *
 * Filters audit logs for agent-specific actions and formats
 * them for the admin dashboard.
 */
export async function getAgentAuditSummary(
  _ctx: { db: { query: (table: string) => unknown } },
  _params: AgentAuditLogParams
) {
  // This would be called from a query function
  // Implementation left as a stub since we need the proper context type
  return {
    totalCalls: 0,
    toolCalls: [],
    responses: [],
    actions: [],
  };
}

// =============================================================================
// Types for Audit Log Metadata
// =============================================================================

/**
 * Metadata structure for agent tool call logs
 */
export interface ToolCallMetadata {
  threadId: string;
  toolName: string;
  toolArgs: unknown;
  toolResult?: unknown;
  durationMs?: number;
}

/**
 * Metadata structure for agent response logs
 */
export interface ResponseMetadata {
  threadId: string;
  promptLength: number;
  responseLength: number;
  toolCallCount: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelId?: string;
  durationMs?: number;
}

/**
 * Metadata structure for agent action logs
 */
export interface ActionMetadata {
  threadId: string;
  actionType: string;
  actionParams: unknown;
  result: unknown;
  requiresConfirmation?: boolean;
  confirmedBy?: Id<"users">;
}

/**
 * Metadata structure for session event logs
 */
export interface SessionEventMetadata {
  threadId?: string;
  eventType: string;
  [key: string]: unknown;
}
