import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";
import { emailCategoryValidator } from "../schema";

/**
 * Email Templates CRUD
 * Manages reusable email templates with variable support
 */

// List all email templates
export const list = query({
  args: {
    category: v.optional(emailCategoryValidator),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    // Build query based on filters
    if (args.category && args.activeOnly !== false) {
      const { category } = args;
      return await ctx.db
        .query("emailTemplates")
        .withIndex("by_category", (q) => q.eq("category", category).eq("isActive", true))
        .collect();
    }

    if (args.category) {
      const { category } = args;
      return await ctx.db
        .query("emailTemplates")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    }

    if (args.activeOnly !== false) {
      return await ctx.db
        .query("emailTemplates")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    return await ctx.db.query("emailTemplates").collect();
  },
});

// Get a single template by ID
export const get = query({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);
    return await ctx.db.get(args.id);
  },
});

// Create a new email template
export const create = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    variables: v.array(v.string()),
    category: emailCategoryValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    return await ctx.db.insert("emailTemplates", {
      ...args,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing template
export const update = mutation({
  args: {
    id: v.id("emailTemplates"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    body: v.optional(v.string()),
    variables: v.optional(v.array(v.string())),
    category: v.optional(emailCategoryValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Template not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete a template
export const remove = mutation({
  args: { id: v.id("emailTemplates") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Extract variables from template body (helper for frontend)
export const extractVariables = query({
  args: { body: v.string() },
  handler: async (_ctx, args) => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match = regex.exec(args.body);
    while (match !== null) {
      const variable = match[1];
      if (variable && !variables.includes(variable)) {
        variables.push(variable);
      }
      match = regex.exec(args.body);
    }
    return variables;
  },
});
