import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { presence } from "../presence";
import type { UserStatus } from "./types";

/**
 * Presence Migration Utilities
 *
 * This module provides dual-write and validation utilities for safely migrating
 * from the legacy userPresence table to @convex-dev/presence.
 *
 * Migration Strategy:
 * 1. Stage 1 (Dual Write): Write to both old and new systems, read from old
 * 2. Stage 2 (Dual Read): Write to both, read from new with fallback to old
 * 3. Stage 3 (New Only): Write to new system only, deprecate old table
 *
 * Feature Flags:
 * - USE_NEW_PRESENCE: Enable reading from @convex-dev/presence
 * - DUAL_WRITE_PRESENCE: Write to both systems (safety net)
 *
 * @see convex/schema.ts for userPresence table definition
 * @see convex/presence.ts for new presence system
 */

// =============================================================================
// Feature Flags
// =============================================================================

/**
 * Control which presence system is active
 * Set via environment variables or Convex dashboard
 */
export const FEATURE_FLAGS = {
  /**
   * Read from @convex-dev/presence instead of userPresence table
   * Default: false (still reading from old system)
   */
  USE_NEW_PRESENCE: false,

  /**
   * Write to both old and new presence systems
   * Default: true (safe dual-write during migration)
   */
  DUAL_WRITE_PRESENCE: true,

  /**
   * Enable verbose logging for presence migration
   * Default: false
   */
  DEBUG_PRESENCE_MIGRATION: false,
};

// =============================================================================
// Types
// =============================================================================

interface PresenceUpdateData {
  userId: Id<"users">;
  username: string;
  status: UserStatus;
  roomId?: string; // Required for new system, optional for old (defaults to global)
  sessionId?: string; // Required for new system
  interval?: number; // Heartbeat interval in ms
}

interface DualWriteResult {
  oldSystemId?: Id<"userPresence">; // ID from userPresence table
  newSystemTokens?: {
    roomToken: string;
    sessionToken: string;
    presenceId: string;
  };
  error?: string;
}

// =============================================================================
// Dual-Write Functions
// =============================================================================

/**
 * Update presence in both old and new systems
 *
 * This function writes to both the userPresence table (legacy) and
 * @convex-dev/presence (new system) to ensure consistency during migration.
 *
 * @param ctx - Mutation context
 * @param data - Presence update data
 * @returns IDs/tokens from both systems
 */
export async function dualWritePresence(
  ctx: MutationCtx,
  data: PresenceUpdateData
): Promise<DualWriteResult> {
  const result: DualWriteResult = {};

  // Write to old system (userPresence table)
  try {
    const now = Date.now();
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", data.userId))
      .first();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        username: data.username,
        lastActiveAt: now,
        status: data.status,
      });
      result.oldSystemId = existingPresence._id;
    } else {
      result.oldSystemId = await ctx.db.insert("userPresence", {
        userId: data.userId,
        username: data.username,
        lastActiveAt: now,
        status: data.status,
      });
    }

    if (FEATURE_FLAGS.DEBUG_PRESENCE_MIGRATION) {
      console.log(
        `[Migration] Updated old presence system for user ${data.userId}: ${result.oldSystemId}`
      );
    }
  } catch (error) {
    console.error("Failed to write to old presence system:", error);
    result.error = `Old system write failed: ${error}`;
  }

  // Write to new system (@convex-dev/presence)
  if (FEATURE_FLAGS.DUAL_WRITE_PRESENCE) {
    try {
      const roomId = data.roomId || "global_chat";
      const sessionId = data.sessionId || `legacy-${data.userId}`;
      const interval = data.interval || 30000; // Default 30s heartbeat

      const tokens = await presence.heartbeat(
        ctx,
        roomId,
        data.userId,
        sessionId,
        interval,
        {
          username: data.username,
          status: data.status,
          lastActiveAt: Date.now(),
        }
      );

      result.newSystemTokens = {
        roomToken: tokens.roomToken,
        sessionToken: tokens.sessionToken,
        presenceId: `${roomId}:${data.userId}:${sessionId}`,
      };

      if (FEATURE_FLAGS.DEBUG_PRESENCE_MIGRATION) {
        console.log(
          `[Migration] Updated new presence system for user ${data.userId} in room ${roomId}`
        );
      }
    } catch (error) {
      console.error("Failed to write to new presence system:", error);
      result.error = result.error
        ? `${result.error}; New system write failed: ${error}`
        : `New system write failed: ${error}`;
    }
  }

  return result;
}

/**
 * Disconnect user from both old and new systems
 */
export async function dualDisconnectPresence(
  ctx: MutationCtx,
  userId: Id<"users">,
  sessionToken?: string
): Promise<void> {
  // Remove from old system
  try {
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPresence) {
      await ctx.db.delete(existingPresence._id);
    }
  } catch (error) {
    console.error("Failed to disconnect from old presence system:", error);
  }

  // Remove from new system
  if (sessionToken && FEATURE_FLAGS.DUAL_WRITE_PRESENCE) {
    try {
      await presence.disconnect(ctx, sessionToken);
    } catch (error) {
      console.error("Failed to disconnect from new presence system:", error);
    }
  }
}

// =============================================================================
// Read Functions (with Feature Flag)
// =============================================================================

export interface PresenceUserData {
  userId: Id<"users">;
  username: string;
  status: UserStatus;
  lastActiveAt: number;
}

/**
 * Read presence data from active system (controlled by feature flag)
 *
 * @param ctx - Query context
 * @param roomId - Optional room ID (only used for new system)
 * @returns List of online users
 */
export async function readPresence(
  ctx: QueryCtx,
  roomId?: string
): Promise<PresenceUserData[]> {
  if (FEATURE_FLAGS.USE_NEW_PRESENCE && roomId) {
    // Read from new system
    try {
      const roomPresence = await presence.listRoom(ctx, roomId, true);

      return roomPresence.map((p) => ({
        userId: p.userId as Id<"users">,
        username: (p.data as any)?.username ?? "Unknown",
        status: (p.data as any)?.status ?? "online",
        lastActiveAt: (p.data as any)?.lastActiveAt ?? Date.now(),
      }));
    } catch (error) {
      console.error("Failed to read from new presence system, falling back to old:", error);
      // Fall through to old system
    }
  }

  // Read from old system (default)
  const now = Date.now();
  const timeoutMs = 300000; // 5 minutes (from CHAT.PRESENCE_TIMEOUT_MS)

  const onlineUsers = await ctx.db
    .query("userPresence")
    .withIndex("by_last_active")
    .order("desc")
    .filter((q) => q.gt(q.field("lastActiveAt"), now - timeoutMs))
    .collect();

  return onlineUsers.map((user) => ({
    userId: user.userId,
    username: user.username,
    status: user.status,
    lastActiveAt: user.lastActiveAt,
  }));
}

// =============================================================================
// Validation & Monitoring
// =============================================================================

interface PresenceComparison {
  oldSystemCount: number;
  newSystemCount: number;
  difference: number;
  percentageDiff: number;
  oldSystemUsers: string[];
  newSystemUsers: string[];
  onlyInOld: string[];
  onlyInNew: string[];
}

/**
 * Compare presence data between old and new systems
 *
 * Use this query to monitor consistency during dual-write phase.
 * Should be called periodically to detect discrepancies.
 *
 * @param ctx - Query context
 * @param roomId - Room to compare (defaults to global_chat)
 * @returns Comparison metrics
 */
export async function comparePresenceSystems(
  ctx: QueryCtx,
  roomId = "global_chat"
): Promise<PresenceComparison> {
  // Get users from old system
  const now = Date.now();
  const timeoutMs = 300000; // 5 minutes
  const oldUsers = await ctx.db
    .query("userPresence")
    .withIndex("by_last_active")
    .order("desc")
    .filter((q) => q.gt(q.field("lastActiveAt"), now - timeoutMs))
    .collect();

  const oldSystemUserIds = new Set(oldUsers.map((u) => u.userId));

  // Get users from new system
  let newSystemUserIds = new Set<string>();
  try {
    const newUsers = await presence.listRoom(ctx, roomId, true);
    newSystemUserIds = new Set(newUsers.map((u) => u.userId));
  } catch (error) {
    console.error("Failed to query new presence system:", error);
  }

  // Compare
  const onlyInOld = Array.from(oldSystemUserIds).filter((id) => !newSystemUserIds.has(id));
  const onlyInNew = Array.from(newSystemUserIds).filter((id) => !oldSystemUserIds.has(id));

  const difference = Math.abs(oldSystemUserIds.size - newSystemUserIds.size);
  const percentageDiff =
    oldSystemUserIds.size > 0 ? (difference / oldSystemUserIds.size) * 100 : 0;

  return {
    oldSystemCount: oldSystemUserIds.size,
    newSystemCount: newSystemUserIds.size,
    difference,
    percentageDiff,
    oldSystemUsers: Array.from(oldSystemUserIds),
    newSystemUsers: Array.from(newSystemUserIds),
    onlyInOld,
    onlyInNew,
  };
}

/**
 * Check if presence systems are in sync
 *
 * Returns true if difference is within acceptable threshold (5%)
 */
export function areSystemsInSync(comparison: PresenceComparison): boolean {
  return comparison.percentageDiff <= 5;
}

// =============================================================================
// Migration Utilities
// =============================================================================

/**
 * Migrate existing userPresence records to new presence system
 *
 * This is a one-time migration function to seed the new presence system
 * with existing active users from the old system.
 *
 * Should be called as an internal mutation during deployment.
 */
export async function migrateExistingPresence(ctx: MutationCtx): Promise<number> {
  const now = Date.now();
  const timeoutMs = 300000; // 5 minutes

  // Get all active users from old system
  const activeUsers = await ctx.db
    .query("userPresence")
    .withIndex("by_last_active")
    .order("desc")
    .filter((q) => q.gt(q.field("lastActiveAt"), now - timeoutMs))
    .collect();

  let migratedCount = 0;

  // Create presence records in new system
  for (const user of activeUsers) {
    try {
      await presence.heartbeat(
        ctx,
        "global_chat", // Default to global chat room
        user.userId,
        `migration-${user.userId}`, // Generate session ID
        30000, // 30s interval
        {
          username: user.username,
          status: user.status,
          lastActiveAt: user.lastActiveAt,
        }
      );
      migratedCount++;
    } catch (error) {
      console.error(`Failed to migrate user ${user.userId}:`, error);
    }
  }

  console.log(`Migrated ${migratedCount} users to new presence system`);
  return migratedCount;
}

/**
 * Clean up stale presence records in old system
 *
 * Remove records older than threshold (default: 24 hours)
 */
export async function cleanupStalePresence(
  ctx: MutationCtx,
  thresholdMs = 86400000
): Promise<number> {
  const cutoff = Date.now() - thresholdMs;

  const staleRecords = await ctx.db
    .query("userPresence")
    .withIndex("by_last_active")
    .filter((q) => q.lt(q.field("lastActiveAt"), cutoff))
    .collect();

  for (const record of staleRecords) {
    await ctx.db.delete(record._id);
  }

  return staleRecords.length;
}
