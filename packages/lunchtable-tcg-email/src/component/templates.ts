import { v } from "convex/values";
import { literals } from "convex-helpers/validators";
import { mutation, query } from "./_generated/server.js";

export const createTemplate = mutation({
  args: {
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    variables: v.array(v.string()),
    category: literals("newsletter", "announcement", "promotional", "transactional", "custom"),
    isActive: v.boolean(),
    createdBy: v.string(),
  },
  returns: v.id("emailTemplates"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const templateId = await ctx.db.insert("emailTemplates", {
      name: args.name,
      subject: args.subject,
      body: args.body,
      variables: args.variables,
      category: args.category,
      isActive: args.isActive,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return templateId;
  },
});

export const getTemplates = query({
  args: {
    category: v.optional(literals("newsletter", "announcement", "promotional", "transactional", "custom")),
    isActive: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    let templates;

    if (args.category !== undefined) {
      const category = args.category;
      const isActive = args.isActive ?? true;
      templates = await ctx.db
        .query("emailTemplates")
        .withIndex("by_category", (q) =>
          q.eq("category", category).eq("isActive", isActive)
        )
        .collect();
    } else if (args.isActive !== undefined) {
      const isActive = args.isActive;
      templates = await ctx.db
        .query("emailTemplates")
        .withIndex("by_active", (q) => q.eq("isActive", isActive))
        .collect();
    } else {
      templates = await ctx.db.query("emailTemplates").collect();
    }

    return templates;
  },
});

export const getTemplate = query({
  args: {
    templateId: v.id("emailTemplates"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    return template;
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("emailTemplates"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.templateId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteTemplate = mutation({
  args: {
    templateId: v.id("emailTemplates"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return null;
  },
});
