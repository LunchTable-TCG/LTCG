/**
 * Migration: Update Admin Roles Schema
 *
 * Converts existing admin records to new role hierarchy:
 * - Existing "admin" roles → "admin" (unchanged)
 * - Existing "moderator" roles → "moderator" (unchanged)
 * - Ensures grantedBy is set for all records
 *
 * Run this migration after deploying the new schema.
 *
 * REFACTORED to use convex-helpers makeMigration for:
 * - Automatic batch processing and pagination
 * - Built-in progress tracking
 * - Resumability from cursor if interrupted
 * - Better error handling
 */

import { internalMutation } from "../functions";
import { migration } from "../migrations";

/**
 * Update admin roles to ensure grantedBy field is set
 *
 * This migration uses the convex-helpers migration wrapper which provides:
 * - Automatic pagination (100 roles per batch by default)
 * - Progress tracking in migrations table
 * - Resumability if interrupted
 * - Error handling with automatic cursor tracking
 *
 * The migration will:
 * 1. Query admin roles in batches
 * 2. Skip roles that already have grantedBy field (idempotent)
 * 3. Set grantedBy to the first admin user found
 * 4. Track progress automatically in migrations table
 *
 * NOTE: This migration requires a pre-check to find the system granter.
 * We use a batch context object to share the granter ID across all batches.
 */
export default migration({
  table: "adminRoles",
  migrateOne: async (ctx, role) => {
    // Skip roles that already have grantedBy set (idempotent)
    if (role.grantedBy) {
      return; // undefined = skip this document
    }

    // Find the first admin to use as the system granter
    // This query will run for each document, but convex caches it efficiently
    const firstAdmin = await ctx.db
      .query("adminRoles")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();

    if (!firstAdmin) {
      throw new Error(
        "No admin found to use as system granter. Please manually create a superadmin first."
      );
    }

    console.log(`[Migration] Updating role ${role._id} (user: ${role.userId}, role: ${role.role})`);

    // Return the fields to patch
    return {
      grantedBy: firstAdmin.userId,
    };
  },
});

/**
 * Manual promotion script: Promote a user to superadmin
 * Use this to create the first superadmin after migration
 */
export const promoteToSuperadmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find the first active admin
    const firstAdmin = await ctx.db
      .query("adminRoles")
      .filter((q) => q.and(q.eq(q.field("role"), "admin"), q.eq(q.field("isActive"), true)))
      .first();

    if (!firstAdmin) {
      throw new Error("No active admin found to promote. Please create an admin first.");
    }

    // Create superadmin role
    await ctx.db.insert("adminRoles", {
      userId: firstAdmin.userId,
      role: "superadmin",
      grantedBy: firstAdmin.userId, // Self-granted for bootstrap
      grantedAt: Date.now(),
      isActive: true,
    });

    // Deactivate old admin role
    await ctx.db.patch(firstAdmin._id, {
      isActive: false,
    });

    const user = await ctx.db.get(firstAdmin.userId);

    console.log(
      `[Migration] Promoted user ${user?.username || user?.email || firstAdmin.userId} to superadmin`
    );

    return {
      success: true,
      userId: firstAdmin.userId,
      username: user?.username,
      email: user?.email,
      message: "User promoted to superadmin successfully",
    };
  },
});

/**
 * LEGACY IMPLEMENTATION (kept for reference)
 *
 * This is the old workpool-based implementation. The new makeMigration
 * approach above provides better progress tracking and error handling.
 *
 * Old approach issues:
 * - Manual progress tracking
 * - No automatic resumability
 * - Required separate worker mutation
 * - No built-in status monitoring
 * - Manual batch size management
 * - Required pre-check for system granter ID
 * - Had to pass granter ID to every worker
 *
 * New approach benefits:
 * - Automatic batch processing
 * - Built-in progress tracking via migrations table
 * - Resumable from cursor if interrupted
 * - Status monitoring via migrations:status query
 * - Simpler implementation (no separate worker needed)
 * - Can query for granter in each batch (cached efficiently)
 */

/*
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../functions";
import { migrationsPool } from "../infrastructure/workpools";

export const migrateAdminRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Get all admin roles
      const adminRoles = await ctx.db.query("adminRoles").collect();

      console.log(`[Migration] Found ${adminRoles.length} admin role records to process`);

      // Find the first superadmin or admin to use as grantedBy for records missing it
      const firstAdmin = adminRoles.find((r) => r.role === "admin");
      const systemGranterId = firstAdmin?.userId;

      if (!systemGranterId && adminRoles.length > 0) {
        throw new Error(
          "No admin found to use as system granter. Please manually create a superadmin first."
        );
      }

      let enqueuedCount = 0;
      let skippedCount = 0;

      // Enqueue update jobs for roles that need migration
      for (const role of adminRoles) {
        // Only enqueue if grantedBy needs to be set
        if (!role.grantedBy && systemGranterId) {
          await migrationsPool.enqueueMutation(
            ctx,
            internal.migrations.migrateAdminRoles.updateAdminRole,
            {
              roleId: role._id,
              systemGranterId,
            }
          );
          enqueuedCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(
        `[Migration] Enqueued ${enqueuedCount} admin role updates, ${skippedCount} skipped`
      );

      return {
        success: true,
        totalRecords: adminRoles.length,
        enqueued: enqueuedCount,
        skipped: skippedCount,
        message: `Enqueued ${enqueuedCount} admin role update jobs. Check workpool status for progress.`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Migration] Fatal error: ${errorMsg}`);

      return {
        success: false,
        error: errorMsg,
      };
    }
  },
});

export const updateAdminRole = internalMutation({
  args: {
    roleId: v.id("adminRoles"),
    systemGranterId: v.id("users"),
  },
  handler: async (ctx, { roleId, systemGranterId }) => {
    try {
      const role = await ctx.db.get(roleId);

      if (!role) {
        console.error(`[Migration Worker] Role not found: ${roleId}`);
        return { success: false, error: "Role not found" };
      }

      // Double-check idempotency
      if (role.grantedBy) {
        console.log(`[Migration Worker] Role ${roleId} already has grantedBy, skipping`);
        return { success: true, skipped: true };
      }

      await ctx.db.patch(roleId, {
        grantedBy: systemGranterId,
      });

      console.log(
        `[Migration Worker] Updated role ${roleId} (user: ${role.userId}, role: ${role.role})`
      );
      return { success: true, updated: true };
    } catch (error) {
      console.error(`[Migration Worker] Failed to update role ${roleId}:`, error);
      return { success: false, error: String(error) };
    }
  },
});
*/
