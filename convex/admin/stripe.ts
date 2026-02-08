/**
 * Admin Stripe Dashboard
 *
 * Queries for Stripe subscription and payment visibility.
 * Provides MRR, churn, subscription analytics, and webhook monitoring.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// ============================================================================
// OVERVIEW METRICS
// ============================================================================

/**
 * Get Stripe overview with MRR and subscription metrics
 */
export const getStripeOverview = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get all subscriptions
    const subscriptions = await ctx.db.query("stripeSubscriptions").collect();
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );
    const canceledSubscriptions = subscriptions.filter((s) => s.status === "canceled");
    const pastDueSubscriptions = subscriptions.filter((s) => s.status === "past_due");

    // Calculate MRR (Monthly Recurring Revenue)
    // Normalize yearly to monthly: year / 12
    const mrr = activeSubscriptions.reduce((sum, s) => {
      const monthlyAmount = s.planInterval === "year" ? s.planAmount / 12 : s.planAmount;
      return sum + monthlyAmount;
    }, 0);

    // Calculate ARR (Annual Recurring Revenue)
    const arr = mrr * 12;

    // Churn calculation (30-day window)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentCancellations = subscriptions.filter(
      (s) => s.canceledAt && s.canceledAt >= thirtyDaysAgo
    ).length;

    // Subscribers at start of period (approximate)
    const subscribersAtStart = activeSubscriptions.length + recentCancellations;
    const churnRate = subscribersAtStart > 0 ? (recentCancellations / subscribersAtStart) * 100 : 0;

    // Plan breakdown
    const monthlyActive = activeSubscriptions.filter((s) => s.planInterval === "month").length;
    const yearlyActive = activeSubscriptions.filter((s) => s.planInterval === "year").length;

    // Customers
    const customers = await ctx.db.query("stripeCustomers").collect();

    // Average revenue per user
    const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

    // Pending cancellations (active but cancelAtPeriodEnd = true)
    const pendingCancellations = activeSubscriptions.filter((s) => s.cancelAtPeriodEnd).length;

    return {
      mrr: mrr / 100, // Convert cents to dollars
      arr: arr / 100,
      arpu: arpu / 100,
      subscriptions: {
        active: activeSubscriptions.length,
        trialing: subscriptions.filter((s) => s.status === "trialing").length,
        canceled: canceledSubscriptions.length,
        pastDue: pastDueSubscriptions.length,
        pendingCancellation: pendingCancellations,
        total: subscriptions.length,
      },
      plans: {
        monthly: monthlyActive,
        yearly: yearlyActive,
      },
      churn: {
        rate: churnRate,
        recentCancellations,
      },
      customers: {
        total: customers.length,
        withActiveSubscription: activeSubscriptions.length,
      },
    };
  },
});

/**
 * Get subscription breakdown by plan and status
 */
export const getSubscriptionBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const subscriptions = await ctx.db.query("stripeSubscriptions").collect();

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const sub of subscriptions) {
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
    }

    // Group by plan amount (tier)
    const byPlanAmount: Record<string, { count: number; mrr: number }> = {};
    for (const sub of subscriptions) {
      if (sub.status === "active" || sub.status === "trialing") {
        const key = `$${(sub.planAmount / 100).toFixed(2)}/${sub.planInterval}`;
        if (!byPlanAmount[key]) {
          byPlanAmount[key] = { count: 0, mrr: 0 };
        }
        byPlanAmount[key].count++;
        const monthlyAmount = sub.planInterval === "year" ? sub.planAmount / 12 : sub.planAmount;
        byPlanAmount[key].mrr += monthlyAmount;
      }
    }

    return {
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byPlanAmount: Object.entries(byPlanAmount)
        .map(([plan, data]) => ({
          plan,
          count: data.count,
          mrr: data.mrr / 100,
        }))
        .sort((a, b) => b.mrr - a.mrr),
    };
  },
});

// ============================================================================
// TREND ANALYTICS
// ============================================================================

/**
 * Get subscription trend over time
 */
export const getSubscriptionTrend = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const days = args.days ?? 30;
    const now = Date.now();

    // Get webhook events for subscription changes
    const webhookEvents = await ctx.db
      .query("stripeWebhookEvents")
      .filter((q) => q.gte(q.field("receivedAt"), now - days * 24 * 60 * 60 * 1000))
      .collect();

    // Group events by day
    const dailyData: Record<
      string,
      { date: string; created: number; canceled: number; updated: number }
    > = {};

    for (let i = 0; i < days; i++) {
      const dayStart = now - (i + 1) * 24 * 60 * 60 * 1000;
      const dateKey = new Date(dayStart).toISOString().split("T")[0] ?? "";
      dailyData[dateKey] = { date: dateKey, created: 0, canceled: 0, updated: 0 };
    }

    for (const event of webhookEvents) {
      const dateKey = new Date(event.receivedAt).toISOString().split("T")[0] ?? "";
      if (dailyData[dateKey]) {
        if (event.type.includes("created")) {
          dailyData[dateKey].created++;
        } else if (event.type.includes("canceled") || event.type.includes("deleted")) {
          dailyData[dateKey].canceled++;
        } else if (event.type.includes("updated")) {
          dailyData[dateKey].updated++;
        }
      }
    }

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  },
});

// ============================================================================
// WEBHOOK MONITORING
// ============================================================================

/**
 * Get recent Stripe webhook events
 */
export const getRecentStripeEvents = query({
  args: {
    limit: v.optional(v.number()),
    includeProcessed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 50;
    const includeProcessed = args.includeProcessed ?? true;

    let events = await ctx.db
      .query("stripeWebhookEvents")
      .order("desc")
      .take(limit * 2); // Fetch extra to account for filtering

    if (!includeProcessed) {
      events = events.filter((e) => !e.processed);
    }

    return events.slice(0, limit).map((e) => ({
      ...e,
      age: Date.now() - e.receivedAt,
      ageFormatted: formatAge(Date.now() - e.receivedAt),
    }));
  },
});

/**
 * Get failed/errored webhook events
 */
export const getFailedWebhookEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 50;

    const events = await ctx.db
      .query("stripeWebhookEvents")
      .filter((q) => q.neq(q.field("error"), undefined))
      .order("desc")
      .take(limit);

    return events;
  },
});

// ============================================================================
// CUSTOMER DETAILS
// ============================================================================

/**
 * Get subscription details for a specific user
 */
export const getCustomerSubscriptionDetails = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Get customer
    const customer = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!customer) {
      return null;
    }

    // Get subscriptions
    const subscriptions = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .collect();

    // Get user details
    const user = await ctx.db.get(args.targetUserId);

    return {
      customer: {
        stripeCustomerId: customer.stripeCustomerId,
        email: customer.email,
        createdAt: customer.createdAt,
      },
      subscriptions: subscriptions.map((s) => ({
        ...s,
        isExpiring: s.cancelAtPeriodEnd,
        daysUntilRenewal: Math.ceil((s.currentPeriodEnd - Date.now()) / (24 * 60 * 60 * 1000)),
      })),
      user: user
        ? {
            username: user.username || user.name || "Unknown",
            email: user.email,
          }
        : null,
    };
  },
});

/**
 * Search Stripe customers
 */
export const searchStripeCustomers = query({
  args: {
    search: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 20;
    const searchLower = args.search.toLowerCase();

    const customers = await ctx.db.query("stripeCustomers").take(500);

    const filtered = customers.filter(
      (c) =>
        c.email.toLowerCase().includes(searchLower) ||
        c.stripeCustomerId.toLowerCase().includes(searchLower)
    );

    // Get user details for matches
    const userIds = filtered.map((c) => c.userId);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const existingUsers = users.filter((u): u is NonNullable<typeof u> => Boolean(u));
    const userMap = new Map(existingUsers.map((u) => [u._id.toString(), u]));

    return filtered.slice(0, limit).map((c) => {
      const user = userMap.get(c.userId.toString());
      return {
        ...c,
        username: user?.username || user?.name || "Unknown",
      };
    });
  },
});

// ============================================================================
// HELPERS
// ============================================================================

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
