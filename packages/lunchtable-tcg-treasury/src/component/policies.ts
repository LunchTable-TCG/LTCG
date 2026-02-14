import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const policyRulesValidator = v.object({
  maxTransactionAmount: v.optional(v.number()),
  dailyLimit: v.optional(v.number()),
  allowedRecipients: v.optional(v.array(v.string())),
  requiresApproval: v.boolean(),
  minApprovers: v.optional(v.number()),
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new treasury policy.
 */
export const createPolicy = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    privyPolicyId: v.optional(v.string()),
    rules: policyRulesValidator,
    isActive: v.boolean(),
    createdBy: v.string(),
  },
  returns: v.id("treasuryPolicies"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const policyId = await ctx.db.insert("treasuryPolicies", {
      name: args.name,
      description: args.description,
      privyPolicyId: args.privyPolicyId,
      rules: args.rules,
      isActive: args.isActive,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return policyId;
  },
});

/**
 * Update an existing policy.
 */
export const updatePolicy = mutation({
  args: {
    policyId: v.id("treasuryPolicies"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.policyId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all policies, optionally filtering by active status.
 */
export const getPolicies = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db.query("treasuryPolicies").withIndex("by_active", (q) => q.eq("isActive", true)).collect();
    }
    return await ctx.db.query("treasuryPolicies").collect();
  },
});

/**
 * Get a single policy by ID.
 */
export const getPolicy = query({
  args: {
    policyId: v.id("treasuryPolicies"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const policy = await ctx.db.get(args.policyId);
    return policy;
  },
});
