/**
 * Launch Schedule Management
 *
 * Schedule and manage the token launch timing.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const scheduleStatusValidator = v.union(
  v.literal("not_scheduled"),
  v.literal("scheduled"),
  v.literal("countdown"),
  v.literal("go"),
  v.literal("launched"),
  v.literal("aborted")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the current launch schedule
 */
export const getSchedule = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const schedule = await ctx.db.query("launchSchedule").order("desc").first();

    if (!schedule) {
      return {
        status: "not_scheduled" as const,
        scheduledAt: null,
        countdown: null,
      };
    }

    // Calculate countdown if scheduled
    let countdown = null;
    if (schedule.scheduledAt && schedule.status !== "launched" && schedule.status !== "aborted") {
      const now = Date.now();
      const diff = schedule.scheduledAt - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdown = {
          total: diff,
          days,
          hours,
          minutes,
          seconds,
          formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        };
      }
    }

    return {
      ...schedule,
      countdown,
    };
  },
});

/**
 * Get launch status summary
 */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get all relevant data
    const schedule = await ctx.db.query("launchSchedule").order("desc").first();
    const config = await ctx.db.query("tokenConfig").order("desc").first();
    const checklist = await ctx.db.query("launchChecklist").collect();
    const approvals = await ctx.db.query("launchApprovals").collect();

    // Calculate checklist progress
    const requiredItems = checklist.filter((i) => i.isRequired);
    const completedRequired = requiredItems.filter((i) => i.isCompleted);
    const checklistReady = completedRequired.length === requiredItems.length;

    // Calculate approval status
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
    const approvedCount = approvals.filter((a) => a.approved).length;
    const approvalsReady = approvedCount >= requiredApprovals;

    // Config ready
    const configReady = config?.status === "ready" || config?.status === "launched";

    // Overall readiness
    const isReady = checklistReady && approvalsReady && configReady;

    return {
      scheduleStatus: schedule?.status ?? "not_scheduled",
      scheduledAt: schedule?.scheduledAt ?? null,
      tokenStatus: config?.status ?? "draft",
      checklist: {
        total: checklist.length,
        completed: checklist.filter((i) => i.isCompleted).length,
        requiredTotal: requiredItems.length,
        requiredCompleted: completedRequired.length,
        ready: checklistReady,
      },
      approvals: {
        count: approvedCount,
        required: requiredApprovals,
        ready: approvalsReady,
      },
      config: {
        ready: configReady,
        name: config?.name,
        symbol: config?.symbol,
      },
      isReady,
      canLaunch: isReady && (schedule?.status === "go" || !schedule),
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create or update launch schedule
 */
export const setSchedule = mutation({
  args: {
    scheduledAt: v.number(),
    timezone: v.string(),
    countdownEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate scheduled time is in the future
    if (args.scheduledAt <= Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    const existing = await ctx.db.query("launchSchedule").order("desc").first();

    // Determine status based on time
    const hoursUntilLaunch = (args.scheduledAt - Date.now()) / (1000 * 60 * 60);
    const status = hoursUntilLaunch <= 24 ? "countdown" : "scheduled";

    if (existing) {
      await ctx.db.patch(existing._id, {
        scheduledAt: args.scheduledAt,
        timezone: args.timezone,
        countdownEnabled: args.countdownEnabled ?? true,
        status,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("launchSchedule", {
        scheduledAt: args.scheduledAt,
        timezone: args.timezone,
        countdownEnabled: args.countdownEnabled ?? true,
        status,
        updatedAt: Date.now(),
      });
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.schedule.set",
      metadata: {
        scheduledAt: new Date(args.scheduledAt).toISOString(),
        timezone: args.timezone,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Update schedule status
 */
export const updateStatus = mutation({
  args: {
    status: scheduleStatusValidator,
    abortReason: v.optional(v.string()),
    launchTxSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const schedule = await ctx.db.query("launchSchedule").order("desc").first();
    if (!schedule) {
      throw new Error("No launch schedule found");
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.abortReason) updates["abortReason"] = args.abortReason;
    if (args.launchTxSignature) updates["launchTxSignature"] = args.launchTxSignature;

    await ctx.db.patch(schedule._id, updates);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: `launch.schedule.${args.status}`,
      metadata: {
        previousStatus: schedule.status,
        newStatus: args.status,
        abortReason: args.abortReason,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Mark launch as GO (final approval before launch)
 */
export const markGo = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Verify all prerequisites
    const schedule = await ctx.db.query("launchSchedule").order("desc").first();
    if (!schedule) {
      throw new Error("No launch schedule found");
    }

    // Check checklist
    const checklist = await ctx.db.query("launchChecklist").collect();
    const requiredItems = checklist.filter((i) => i.isRequired);
    const incompleteRequired = requiredItems.filter((i) => !i.isCompleted);
    if (incompleteRequired.length > 0) {
      throw new Error(`${incompleteRequired.length} required checklist items incomplete`);
    }

    // Check approvals
    const approvals = await ctx.db.query("launchApprovals").collect();
    const approvedCount = approvals.filter((a) => a.approved).length;
    if (approvedCount < 2) {
      throw new Error("At least 2 approvals required");
    }

    // Check config
    const config = await ctx.db.query("tokenConfig").order("desc").first();
    if (!config || config.status !== "ready") {
      throw new Error("Token configuration must be marked as ready");
    }

    // Mark as GO
    await ctx.db.patch(schedule._id, {
      status: "go",
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.schedule.go",
      metadata: {
        approvalCount: approvedCount,
        checklistComplete: true,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Abort the launch
 */
export const abort = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const schedule = await ctx.db.query("launchSchedule").order("desc").first();
    if (!schedule) {
      throw new Error("No launch schedule found");
    }

    if (schedule.status === "launched") {
      throw new Error("Cannot abort - already launched");
    }

    await ctx.db.patch(schedule._id, {
      status: "aborted",
      abortReason: args.reason,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.schedule.abort",
      metadata: { reason: args.reason },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Clear schedule (for re-scheduling)
 */
export const clearSchedule = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const schedules = await ctx.db.query("launchSchedule").collect();
    for (const schedule of schedules) {
      await ctx.db.delete(schedule._id);
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.schedule.clear",
      metadata: { count: schedules.length },
      success: true,
    });

    return { success: true };
  },
});
