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
import { migrations } from "./index";

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
export default migrations.define({
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

