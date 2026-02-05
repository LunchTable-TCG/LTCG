import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const textFieldValidator = v.object({
  id: v.string(),
  dataField: v.string(),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  rotation: v.number(),
  fontFamily: v.string(),
  fontSize: v.number(),
  fontWeight: v.string(),
  color: v.string(),
  align: v.string(),
  stroke: v.optional(v.object({ color: v.string(), width: v.number() })),
  shadow: v.optional(v.object({
    color: v.string(),
    blur: v.number(),
    offsetX: v.number(),
    offsetY: v.number(),
  })),
  letterSpacing: v.number(),
  lineHeight: v.number(),
  autoScale: v.boolean(),
});

// List all templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cardTypeTemplates").order("desc").collect();
  },
});

// Get templates by card type
export const getByCardType = query({
  args: { cardType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cardTypeTemplates")
      .withIndex("by_card_type", (q) => q.eq("cardType", args.cardType))
      .first();
  },
});

// Get single template by ID
export const get = query({
  args: { id: v.id("cardTypeTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create or update template
export const upsert = mutation({
  args: {
    id: v.optional(v.id("cardTypeTemplates")),
    cardType: v.string(),
    name: v.string(),
    backgroundId: v.id("cardBackgrounds"),
    canvasWidth: v.number(),
    canvasHeight: v.number(),
    textFields: v.array(textFieldValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        backgroundId: args.backgroundId,
        canvasWidth: args.canvasWidth,
        canvasHeight: args.canvasHeight,
        textFields: args.textFields,
        updatedAt: now,
      });
      return args.id;
    } else {
      return await ctx.db.insert("cardTypeTemplates", {
        cardType: args.cardType,
        name: args.name,
        backgroundId: args.backgroundId,
        canvasWidth: args.canvasWidth,
        canvasHeight: args.canvasHeight,
        textFields: args.textFields,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Delete template
export const remove = mutation({
  args: { id: v.id("cardTypeTemplates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
