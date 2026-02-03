/**
 * Migration: Update Admin Roles Schema
 *
 * Converts existing admin records to new role hierarchy:
 * - Existing "admin" roles → "admin" (unchanged)
 * - Existing "moderator" roles → "moderator" (unchanged)
 * - Ensures grantedBy is set for all records
 *
 * Run this migration after deploying the new schema.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
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

/**
 * Worker mutation: Update a single admin role's grantedBy field
 */
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
