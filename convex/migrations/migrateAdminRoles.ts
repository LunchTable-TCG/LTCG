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

import { internalMutation } from "../_generated/server";

export const migrateAdminRoles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let migrationLog = {
      totalRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      errors: [] as string[],
    };

    try {
      // Get all admin roles
      const adminRoles = await ctx.db.query("adminRoles").collect();
      migrationLog.totalRecords = adminRoles.length;

      console.log(`[Migration] Found ${adminRoles.length} admin role records to process`);

      // Find the first superadmin or admin to use as grantedBy for records missing it
      const firstAdmin = adminRoles.find((r) => r.role === "admin");
      const systemGranterId = firstAdmin?.userId;

      if (!systemGranterId && adminRoles.length > 0) {
        throw new Error(
          "No admin found to use as system granter. Please manually create a superadmin first."
        );
      }

      for (const role of adminRoles) {
        try {
          const updates: {
            grantedBy?: typeof systemGranterId;
          } = {};

          // Ensure grantedBy is set
          if (!role.grantedBy && systemGranterId) {
            updates.grantedBy = systemGranterId;
          }

          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            await ctx.db.patch(role._id, updates);
            migrationLog.updatedRecords++;
            console.log(
              `[Migration] Updated role ${role._id} (user: ${role.userId}, role: ${role.role})`
            );
          } else {
            migrationLog.skippedRecords++;
          }
        } catch (error) {
          const errorMsg = `Failed to migrate role ${role._id}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[Migration] ${errorMsg}`);
          migrationLog.errors.push(errorMsg);
        }
      }

      console.log("[Migration] Admin role migration completed");
      console.log(`[Migration] Summary:`, migrationLog);

      return {
        success: true,
        ...migrationLog,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Migration] Fatal error: ${errorMsg}`);

      return {
        success: false,
        error: errorMsg,
        ...migrationLog,
      };
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
