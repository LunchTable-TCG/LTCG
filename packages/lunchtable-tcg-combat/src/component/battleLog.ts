import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Get battle logs for a game
 *
 * Returns all battle log entries for a game, ordered by timestamp via by_game index.
 */
export const getForGame = query({
  args: {
    gameId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("battleLog")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    return logs.map((log) => ({
      ...log,
      _id: log._id as string,
    }));
  },
});

/**
 * Get battle logs for a specific turn
 *
 * Returns battle logs for a specific game + turn number.
 */
export const getForTurn = query({
  args: {
    gameId: v.string(),
    turn: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("battleLog")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("turn"), args.turn))
      .collect();

    return logs.map((log) => ({
      ...log,
      _id: log._id as string,
    }));
  },
});

/**
 * Get battle summary
 *
 * Returns aggregated stats: total battles, wins per player, total damage dealt.
 */
export const getSummary = query({
  args: {
    gameId: v.string(),
  },
  returns: v.object({
    totalBattles: v.number(),
    winsByPlayer: v.any(),
    totalDamage: v.number(),
  }),
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("battleLog")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const totalBattles = logs.length;

    // Count wins per player
    const winsByPlayer: Record<string, number> = {};
    for (const log of logs) {
      if (log.result === "attacker_wins" || log.result === "direct") {
        winsByPlayer[log.attackerPlayerId] = (winsByPlayer[log.attackerPlayerId] || 0) + 1;
      } else if (log.result === "defender_wins") {
        // Defender is not explicitly stored, would need to derive from damageTo or game state
        // For now, skip counting defender wins
      }
    }

    // Total damage dealt
    const totalDamage = logs.reduce((sum, log) => sum + log.damageDealt, 0);

    return {
      totalBattles,
      winsByPlayer,
      totalDamage,
    };
  },
});
