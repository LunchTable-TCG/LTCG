/**
 * API Key Management Module
 *
 * Admin operations for managing agent API keys.
 * Allows viewing, revoking, and managing API keys for agents.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Query Operations
// =============================================================================

/**
 * List all API keys with pagination
 * Requires moderator role or higher
 */
export const listApiKeys = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const apiKeys = await ctx.db.query("apiKeys").order("desc").take(limit);

    // Enrich with user and agent info
    const enrichedKeys = await Promise.all(
      apiKeys.map(async (key) => {
        const user = await ctx.db.get(key.userId);
        const agent = await ctx.db.get(key.agentId);

        return {
          _id: key._id,
          keyPrefix: key.keyPrefix,
          userId: key.userId,
          agentId: key.agentId,
          playerName: user?.username || user?.email || "Unknown",
          agentName: agent?.name || "Unknown",
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
        };
      })
    );

    return enrichedKeys;
  },
});

/**
 * Get API key details
 * Requires moderator role or higher
 */
export const getApiKeyDetails = query({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, { keyId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const apiKey = await ctx.db.get(keyId);
    if (!apiKey) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "API key not found",
      });
    }

    const user = await ctx.db.get(apiKey.userId);
    const agent = await ctx.db.get(apiKey.agentId);

    return {
      _id: apiKey._id,
      keyPrefix: apiKey.keyPrefix,
      userId: apiKey.userId,
      agentId: apiKey.agentId,
      playerName: user?.username || user?.email || "Unknown",
      agentName: agent?.name || "Unknown",
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
    };
  },
});

// =============================================================================
// Mutation Operations
// =============================================================================

/**
 * Revoke an API key
 * Requires admin role or higher
 */
export const revokeApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, { keyId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    let errorMessage: string | undefined;

    try {
      const apiKey = await ctx.db.get(keyId);
      if (!apiKey) {
        throw createError(ErrorCode.NOT_FOUND, {
          reason: "API key not found",
        });
      }

      if (!apiKey.isActive) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "API key is already inactive",
        });
      }

      await ctx.db.patch(keyId, {
        isActive: false,
      });

      const user = await ctx.db.get(apiKey.userId);
      const agent = await ctx.db.get(apiKey.agentId);

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "revoke_api_key",
        targetUserId: apiKey.userId,
        targetEmail: user?.email,
        metadata: {
          keyId,
          keyPrefix: apiKey.keyPrefix,
          agentName: agent?.name,
        },
        success: true,
      });

      return {
        success: true,
        message: "API key revoked successfully",
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      await scheduleAuditLog(ctx, {
        adminId,
        action: "revoke_api_key",
        metadata: {
          keyId,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Reactivate an API key
 * Requires admin role or higher
 */
export const reactivateApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, { keyId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    let errorMessage: string | undefined;

    try {
      const apiKey = await ctx.db.get(keyId);
      if (!apiKey) {
        throw createError(ErrorCode.NOT_FOUND, {
          reason: "API key not found",
        });
      }

      if (apiKey.isActive) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "API key is already active",
        });
      }

      await ctx.db.patch(keyId, {
        isActive: true,
      });

      const user = await ctx.db.get(apiKey.userId);
      const agent = await ctx.db.get(apiKey.agentId);

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "reactivate_api_key",
        targetUserId: apiKey.userId,
        targetEmail: user?.email,
        metadata: {
          keyId,
          keyPrefix: apiKey.keyPrefix,
          agentName: agent?.name,
        },
        success: true,
      });

      return {
        success: true,
        message: "API key reactivated successfully",
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      await scheduleAuditLog(ctx, {
        adminId,
        action: "reactivate_api_key",
        metadata: {
          keyId,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Delete an API key permanently
 * Requires superadmin role (destructive operation)
 */
export const deleteApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  handler: async (ctx, { keyId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    let errorMessage: string | undefined;

    try {
      const apiKey = await ctx.db.get(keyId);
      if (!apiKey) {
        throw createError(ErrorCode.NOT_FOUND, {
          reason: "API key not found",
        });
      }

      const user = await ctx.db.get(apiKey.userId);
      const agent = await ctx.db.get(apiKey.agentId);

      await ctx.db.delete(keyId);

      // Log action
      await scheduleAuditLog(ctx, {
        adminId,
        action: "delete_api_key",
        targetUserId: apiKey.userId,
        targetEmail: user?.email,
        metadata: {
          keyId,
          keyPrefix: apiKey.keyPrefix,
          agentName: agent?.name,
        },
        success: true,
      });

      return {
        success: true,
        message: "API key deleted successfully",
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);

      await scheduleAuditLog(ctx, {
        adminId,
        action: "delete_api_key",
        metadata: {
          keyId,
          error: errorMessage,
        },
        success: false,
        errorMessage,
      });

      throw error;
    }
  },
});
