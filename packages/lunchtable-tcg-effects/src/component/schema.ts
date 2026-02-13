import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  activeEffects: defineTable({
    gameId: v.string(),
    sourceCardId: v.string(),
    effectType: v.string(),
    targets: v.array(v.string()),
    duration: v.string(), // "permanent" | "until_end_of_turn" | "turns:N" etc.
    data: v.any(), // effect-specific data (stat modifiers, etc.)
    appliedTurn: v.optional(v.number()),
    appliedPhase: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index("by_game", ["gameId"]),

  chainState: defineTable({
    gameId: v.string(),
    links: v.array(
      v.object({
        cardId: v.string(),
        playerId: v.string(),
        effectId: v.string(),
        spellSpeed: v.number(), // 1=Normal, 2=Quick, 3=Counter
        targets: v.array(v.string()),
        negated: v.optional(v.boolean()),
      })
    ),
    resolving: v.boolean(),
    priorityPlayerId: v.optional(v.string()),
  }).index("by_game", ["gameId"]),

  optTracking: defineTable({
    gameId: v.string(),
    cardId: v.string(),
    effectId: v.string(),
    turnNumber: v.number(),
    usedThisTurn: v.boolean(),
  }).index("by_game_card", ["gameId", "cardId"]),
});
