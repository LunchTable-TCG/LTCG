import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cardDefinitions: defineTable({
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
  })
    .index("by_name", ["name"])
    .index("by_type", ["cardType"])
    .index("by_rarity", ["rarity"])
    .index("by_stereotype", ["stereotype"]),

  decks: defineTable({
    ownerId: v.string(),
    name: v.string(),
    cards: v.array(v.string()),
    isActive: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_owner", ["ownerId"]),

  gameStates: defineTable({
    players: v.array(
      v.object({
        id: v.string(),
        deckId: v.string(),
        lifePoints: v.number(),
        hand: v.array(v.any()),
        field: v.array(v.any()),
        backrow: v.array(v.any()),
        graveyard: v.array(v.any()),
        deck: v.array(v.any()),
        normalSummonUsed: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
      })
    ),
    currentPhase: v.string(),
    currentPlayerIndex: v.number(),
    turnNumber: v.number(),
    status: v.string(),
    winner: v.optional(v.string()),
    config: v.object({
      startingLP: v.number(),
      maxHandSize: v.number(),
      phases: v.array(v.string()),
      drawPerTurn: v.number(),
      maxFieldSlots: v.optional(v.number()),
      maxBackrowSlots: v.optional(v.number()),
      turnTimeLimit: v.optional(v.number()),
      metadata: v.optional(v.any()),
    }),
    metadata: v.optional(v.any()),
  }),

  gameEvents: defineTable({
    gameId: v.id("gameStates"),
    type: v.string(),
    playerId: v.optional(v.string()),
    data: v.any(),
    timestamp: v.number(),
  }).index("by_game", ["gameId", "timestamp"]),

  matchmakingQueue: defineTable({
    playerId: v.string(),
    deckId: v.string(),
    rating: v.number(),
    joinedAt: v.number(),
    mode: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_mode", ["mode", "joinedAt"])
    .index("by_player", ["playerId"]),

  hooks: defineTable({
    event: v.string(),
    callbackHandle: v.string(),
    filter: v.optional(v.any()),
  }).index("by_event", ["event"]),
});
