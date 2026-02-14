import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const getGuidelines = query({
  args: {
    section: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("brandingGuidelines")
      .withIndex("by_section", (q) => q.eq("section", args.section))
      .first();
  },
});

export const getAllGuidelines = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("brandingGuidelines").collect();
  },
});

export const updateGuidelines = mutation({
  args: {
    section: v.string(),
    structuredData: v.object({
      colors: v.optional(
        v.array(
          v.object({
            name: v.string(),
            hex: v.string(),
            usage: v.optional(v.string()),
          })
        )
      ),
      fonts: v.optional(
        v.array(
          v.object({
            name: v.string(),
            weights: v.array(v.number()),
            usage: v.optional(v.string()),
          })
        )
      ),
      brandVoice: v.optional(
        v.object({
          tone: v.string(),
          formality: v.number(),
          keywords: v.optional(v.array(v.string())),
          avoid: v.optional(v.array(v.string())),
        })
      ),
      customFields: v.optional(v.any()),
    }),
    richTextContent: v.string(),
    updatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brandingGuidelines")
      .withIndex("by_section", (q) => q.eq("section", args.section))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        structuredData: args.structuredData,
        richTextContent: args.richTextContent,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
    } else {
      await ctx.db.insert("brandingGuidelines", {
        section: args.section,
        structuredData: args.structuredData,
        richTextContent: args.richTextContent,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
    }

    return null;
  },
});
