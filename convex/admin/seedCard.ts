import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Insert a single card definition into the database.
 * Called by the admin seed-cards HTTP endpoint.
 */
export const insertCard = mutation({
  args: {
    name: v.string(),
    rarity: v.string(),
    archetype: v.string(),
    cardType: v.string(),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),
    level: v.optional(v.number()),
    attribute: v.optional(v.string()),
    spellType: v.optional(v.string()),
    trapType: v.optional(v.string()),
    viceType: v.optional(v.string()),
    ability: v.optional(v.any()),
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin role check
    await ctx.db.insert("cardDefinitions", args);
  },
});
