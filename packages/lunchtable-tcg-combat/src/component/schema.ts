import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  battleStates: defineTable({
    gameId: v.string(),
    attackerId: v.string(),
    targetId: v.string(), // card ID or "direct"
    attackerPlayerId: v.string(),
    phase: v.string(), // "declare" | "damage_step" | "damage_calc" | "resolve" | "end"
    modifiers: v.array(
      v.object({
        source: v.string(),
        stat: v.string(), // "attack" | "defense"
        delta: v.number(),
      })
    ),
    attackerStats: v.object({
      attack: v.number(),
      defense: v.number(),
    }),
    targetStats: v.optional(
      v.object({
        attack: v.number(),
        defense: v.number(),
        position: v.optional(v.string()),
      })
    ),
    resolved: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_game", ["gameId"]),

  battleLog: defineTable({
    gameId: v.string(),
    turn: v.number(),
    attackerId: v.string(),
    targetId: v.string(),
    attackerPlayerId: v.string(),
    result: v.string(), // "attacker_wins" | "defender_wins" | "tie" | "direct"
    damageDealt: v.number(),
    damageTo: v.string(), // player who received damage
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  }).index("by_game", ["gameId"]),
});
