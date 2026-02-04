/**
 * Launch Approval Management
 *
 * Multi-admin approval workflow for token launch.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all launch approvals
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const approvals = await ctx.db.query("launchApprovals").collect();

    // Enrich with admin info
    const enriched = await Promise.all(
      approvals.map(async (approval) => {
        const admin = await ctx.db.get(approval.adminId);
        return {
          ...approval,
          adminName: admin?.name || admin?.username || "Unknown",
          adminEmail: admin?.email,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get current user's approval status
 */
export const getMyApproval = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("launchApprovals")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .first();
  },
});

/**
 * Get approval summary
 */
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const approvals = await ctx.db.query("launchApprovals").collect();
    const approved = approvals.filter((a) => a.approved);

    // Get admin roles to count total admins
    const adminRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_role", (q) => q.eq("role", "admin").eq("isActive", true))
      .collect();

    const superadminRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_role", (q) => q.eq("role", "superadmin").eq("isActive", true))
      .collect();

    const totalAdmins = adminRoles.length + superadminRoles.length;

    // Check if current user has approved
    const userApproval = approvals.find((a) => a.adminId === userId);

    return {
      totalApprovals: approvals.length,
      approvedCount: approved.length,
      totalAdmins,
      hasCurrentUserApproved: userApproval?.approved ?? false,
      currentUserApproval: userApproval ?? null,
      // Require at least 2 approvals or 50% of admins, whichever is higher
      requiredApprovals: Math.max(2, Math.ceil(totalAdmins / 2)),
      hasEnoughApprovals: approved.length >= Math.max(2, Math.ceil(totalAdmins / 2)),
    };
  },
});

/**
 * Check if launch is approved
 */
export const isApproved = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const approvals = await ctx.db.query("launchApprovals").collect();
    const approved = approvals.filter((a) => a.approved);

    // Get admin count
    const adminRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_role", (q) => q.eq("role", "admin").eq("isActive", true))
      .collect();

    const superadminRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_role", (q) => q.eq("role", "superadmin").eq("isActive", true))
      .collect();

    const totalAdmins = adminRoles.length + superadminRoles.length;
    const requiredApprovals = Math.max(2, Math.ceil(totalAdmins / 2));

    return {
      approved: approved.length >= requiredApprovals,
      approvalCount: approved.length,
      requiredCount: requiredApprovals,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Submit approval for launch
 */
export const approve = mutation({
  args: {
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Check if already approved
    const existing = await ctx.db
      .query("launchApprovals")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        approved: true,
        comments: args.comments,
        approvedAt: Date.now(),
      });
    } else {
      // Create new
      await ctx.db.insert("launchApprovals", {
        adminId: userId,
        approved: true,
        comments: args.comments,
        approvedAt: Date.now(),
      });
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.approval.approve",
      metadata: { comments: args.comments },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Revoke approval
 */
export const revoke = mutation({
  args: {
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const existing = await ctx.db
      .query("launchApprovals")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .first();

    if (!existing) {
      throw new Error("No approval found to revoke");
    }

    await ctx.db.patch(existing._id, {
      approved: false,
      comments: args.reason ? `Revoked: ${args.reason}` : "Revoked",
      approvedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.approval.revoke",
      metadata: { reason: args.reason },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Reset all approvals (for re-launch or abort)
 */
export const resetAll = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const approvals = await ctx.db.query("launchApprovals").collect();

    for (const approval of approvals) {
      await ctx.db.delete(approval._id);
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.approval.reset_all",
      metadata: { reason: args.reason, count: approvals.length },
      success: true,
    });

    return { success: true, resetCount: approvals.length };
  },
});
