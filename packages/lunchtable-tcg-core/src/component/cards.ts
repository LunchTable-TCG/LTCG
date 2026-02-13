import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const cardFields = {
  name: v.string(),
  cardType: v.string(),
  attack: v.optional(v.number()),
  defense: v.optional(v.number()),
  level: v.optional(v.number()),
  rarity: v.string(),
  stereotype: v.optional(v.string()),
  abilities: v.optional(v.any()),
  description: v.string(),
  imageUrl: v.optional(v.string()),
  metadata: v.optional(v.any()),
};

const cardReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  cardType: v.string(),
  attack: v.optional(v.number()),
  defense: v.optional(v.number()),
  level: v.optional(v.number()),
  rarity: v.string(),
  stereotype: v.optional(v.string()),
  abilities: v.optional(v.any()),
  description: v.string(),
  imageUrl: v.optional(v.string()),
  metadata: v.optional(v.any()),
});

export const register = mutation({
  args: cardFields,
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("cardDefinitions", args);
    return id as string;
  },
});

export const bulkImport = mutation({
  args: {
    cards: v.array(v.object(cardFields)),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const card of args.cards) {
      const id = await ctx.db.insert("cardDefinitions", card);
      ids.push(id as string);
    }
    return ids;
  },
});

export const getAll = query({
  args: {},
  returns: v.array(cardReturnValidator),
  handler: async (ctx) => {
    const cards = await ctx.db.query("cardDefinitions").collect();
    return cards.map((card) => ({
      ...card,
      _id: card._id as string,
    }));
  },
});

export const getById = query({
  args: { id: v.id("cardDefinitions") },
  returns: v.union(cardReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.id);
    if (!card) return null;
    return { ...card, _id: card._id as string };
  },
});

export const getByName = query({
  args: { name: v.string() },
  returns: v.union(cardReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const card = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
    if (!card) return null;
    return { ...card, _id: card._id as string };
  },
});

export const getByType = query({
  args: { cardType: v.string() },
  returns: v.array(cardReturnValidator),
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cardDefinitions")
      .withIndex("by_type", (q) => q.eq("cardType", args.cardType))
      .collect();
    return cards.map((card) => ({
      ...card,
      _id: card._id as string,
    }));
  },
});

export const update = mutation({
  args: {
    id: v.id("cardDefinitions"),
    fields: v.object({
      name: v.optional(v.string()),
      cardType: v.optional(v.string()),
      attack: v.optional(v.number()),
      defense: v.optional(v.number()),
      level: v.optional(v.number()),
      rarity: v.optional(v.string()),
      stereotype: v.optional(v.string()),
      abilities: v.optional(v.any()),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Card definition not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, args.fields);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("cardDefinitions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Card definition not found: ${args.id}`);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
