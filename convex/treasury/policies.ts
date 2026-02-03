/**
 * Treasury Policy Management
 *
 * CRUD operations for spending policies.
 * Requires admin role.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all policies
 */
export const listPolicies = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    let policies = await ctx.db.query("treasuryPolicies").collect();

    if (!args.includeInactive) {
      policies = policies.filter((p) => p.isActive);
    }

    // Sort by creation date
    policies.sort((a, b) => b.createdAt - a.createdAt);

    return policies;
  },
});

/**
 * Get a single policy
 */
export const getPolicy = query({
  args: {
    policyId: v.id("treasuryPolicies"),
  },
  handler: async (ctx, { policyId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db.get(policyId);
  },
});

/**
 * Get wallets using a policy
 */
export const getWalletsUsingPolicy = query({
  args: {
    policyId: v.id("treasuryPolicies"),
  },
  handler: async (ctx, { policyId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const policy = await ctx.db.get(policyId);
    if (!policy || !policy.privyPolicyId) {
      return [];
    }

    // Find wallets with this policy
    const wallets = await ctx.db.query("treasuryWallets").collect();
    return wallets.filter((w) => w.policyId === policy.privyPolicyId);
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new policy
 */
export const createPolicy = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    rules: v.object({
      maxTransactionAmount: v.optional(v.number()),
      dailyLimit: v.optional(v.number()),
      allowedRecipients: v.optional(v.array(v.string())),
      requiresApproval: v.boolean(),
      minApprovers: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const policyId = await ctx.db.insert("treasuryPolicies", {
      name: args.name,
      description: args.description,
      rules: args.rules,
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.policy.create",
      metadata: {
        policyId,
        name: args.name,
        rules: args.rules,
      },
      success: true,
    });

    return policyId;
  },
});

/**
 * Update a policy
 */
export const updatePolicy = mutation({
  args: {
    policyId: v.id("treasuryPolicies"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    rules: v.optional(
      v.object({
        maxTransactionAmount: v.optional(v.number()),
        dailyLimit: v.optional(v.number()),
        allowedRecipients: v.optional(v.array(v.string())),
        requiresApproval: v.boolean(),
        minApprovers: v.optional(v.number()),
      })
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.rules !== undefined) updates["rules"] = args.rules;
    if (args.isActive !== undefined) updates["isActive"] = args.isActive;

    await ctx.db.patch(args.policyId, updates);

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.policy.update",
      metadata: {
        policyId: args.policyId,
        updates,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Delete a policy (soft delete by setting inactive)
 */
export const deletePolicy = mutation({
  args: {
    policyId: v.id("treasuryPolicies"),
  },
  handler: async (ctx, { policyId }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const policy = await ctx.db.get(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    // Check if any wallets are using this policy
    const wallets = await ctx.db.query("treasuryWallets").collect();
    const usingPolicy = wallets.filter((w) => w.policyId === policy.privyPolicyId);

    if (usingPolicy.length > 0) {
      throw new Error(
        `Cannot delete policy: ${usingPolicy.length} wallet(s) are using it`
      );
    }

    // Soft delete
    await ctx.db.patch(policyId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.policy.delete",
      metadata: {
        policyId,
        name: policy.name,
      },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Check if a transaction would be allowed by a policy
 */
export const checkTransaction = query({
  args: {
    policyId: v.id("treasuryPolicies"),
    amount: v.number(),
    recipientAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const policy = await ctx.db.get(args.policyId);
    if (!policy) {
      return { allowed: false, reason: "Policy not found" };
    }

    if (!policy.isActive) {
      return { allowed: false, reason: "Policy is inactive" };
    }

    const { rules } = policy;

    // Check max transaction amount
    if (rules.maxTransactionAmount && args.amount > rules.maxTransactionAmount) {
      return {
        allowed: false,
        reason: `Amount exceeds max transaction limit of ${rules.maxTransactionAmount}`,
      };
    }

    // Check allowed recipients
    if (rules.allowedRecipients && args.recipientAddress) {
      if (!rules.allowedRecipients.includes(args.recipientAddress)) {
        return {
          allowed: false,
          reason: "Recipient is not in allowed list",
        };
      }
    }

    // Check if requires approval
    if (rules.requiresApproval) {
      return {
        allowed: true,
        requiresApproval: true,
        minApprovers: rules.minApprovers || 1,
        reason: `Transaction requires ${rules.minApprovers || 1} approval(s)`,
      };
    }

    return { allowed: true, requiresApproval: false };
  },
});

// =============================================================================
// Default Policies Setup
// =============================================================================

/**
 * Create default policies if none exist
 */
export const setupDefaultPolicies = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const existingPolicies = await ctx.db.query("treasuryPolicies").collect();
    if (existingPolicies.length > 0) {
      return { message: "Policies already exist", count: existingPolicies.length };
    }

    const defaultPolicies = [
      {
        name: "Fee Collection - Auto",
        description: "Automatic fee collection with no limits",
        rules: {
          requiresApproval: false,
        },
      },
      {
        name: "Distribution - Standard",
        description: "Standard distribution policy requiring one approval",
        rules: {
          maxTransactionAmount: 100_000_000_000, // 100 SOL in lamports
          requiresApproval: true,
          minApprovers: 1,
        },
      },
      {
        name: "Distribution - High Value",
        description: "High value distributions requiring multiple approvals",
        rules: {
          requiresApproval: true,
          minApprovers: 2,
        },
      },
      {
        name: "Liquidity - Controlled",
        description: "Liquidity operations with daily limits",
        rules: {
          dailyLimit: 500_000_000_000, // 500 SOL in lamports
          requiresApproval: true,
          minApprovers: 1,
        },
      },
    ];

    const created = [];
    for (const policy of defaultPolicies) {
      const id = await ctx.db.insert("treasuryPolicies", {
        ...policy,
        rules: policy.rules as {
          maxTransactionAmount?: number;
          dailyLimit?: number;
          allowedRecipients?: string[];
          requiresApproval: boolean;
          minApprovers?: number;
        },
        isActive: true,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      created.push(id);
    }

    // Audit log
    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "treasury.policy.setup_defaults",
      metadata: {
        policiesCreated: created.length,
      },
      success: true,
    });

    return { message: "Default policies created", count: created.length };
  },
});
