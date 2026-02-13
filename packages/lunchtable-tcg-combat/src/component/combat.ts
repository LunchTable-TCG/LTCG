import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Declare an attack
 *
 * Creates a new battle state in "declare" phase.
 * Records the attacker, target (or "direct" for direct attacks), and initial stats.
 */
export const declareAttack = mutation({
  args: {
    gameId: v.string(),
    attackerId: v.string(),
    targetId: v.string(), // Card ID or "direct"
    attackerPlayerId: v.string(),
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
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const battleId = await ctx.db.insert("battleStates", {
      gameId: args.gameId,
      attackerId: args.attackerId,
      targetId: args.targetId,
      attackerPlayerId: args.attackerPlayerId,
      phase: "declare",
      modifiers: [],
      attackerStats: args.attackerStats,
      targetStats: args.targetStats,
      resolved: false,
    });

    return battleId as string;
  },
});

/**
 * Advance battle phase
 *
 * Transitions a battle through its phases:
 * declare → damage_step → damage_calc → resolve → end
 */
export const advanceBattlePhase = mutation({
  args: {
    battleId: v.id("battleStates"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      throw new Error(`Battle not found: ${args.battleId}`);
    }

    const phaseOrder = ["declare", "damage_step", "damage_calc", "resolve", "end"];
    const currentIndex = phaseOrder.indexOf(battle.phase);

    if (currentIndex === -1) {
      throw new Error(`Invalid battle phase: ${battle.phase}`);
    }

    const nextPhase = phaseOrder[currentIndex + 1] || "end";

    await ctx.db.patch(args.battleId, {
      phase: nextPhase,
    });

    return nextPhase;
  },
});

/**
 * Add modifier
 *
 * Adds an ATK/DEF modifier to an active battle.
 * Used by effects/traps during damage step.
 */
export const addModifier = mutation({
  args: {
    battleId: v.id("battleStates"),
    source: v.string(),
    stat: v.string(), // "attack" | "defense"
    delta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      throw new Error(`Battle not found: ${args.battleId}`);
    }

    const newModifier = {
      source: args.source,
      stat: args.stat,
      delta: args.delta,
    };

    await ctx.db.patch(args.battleId, {
      modifiers: [...battle.modifiers, newModifier],
    });

    return null;
  },
});

/**
 * Resolve battle
 *
 * Calculates final damage using base stats + modifiers.
 * Compares ATK vs ATK (both attack position) or ATK vs DEF (defender in defense).
 * Creates a battleLog entry and marks battleState as resolved.
 *
 * Result logic:
 * - If target is "direct": result="direct", damage = attacker ATK
 * - ATK vs ATK position: higher ATK wins, loser takes difference as damage. Tie = both destroyed, 0 damage
 * - ATK vs DEF position: if ATK > DEF, defender destroyed but no LP damage.
 *                        If ATK < DEF, attacker takes difference.
 *                        If equal, no damage no destroy.
 */
export const resolveBattle = mutation({
  args: {
    battleId: v.id("battleStates"),
    turn: v.number(),
  },
  returns: v.object({
    result: v.string(),
    damageDealt: v.number(),
    damageTo: v.string(),
  }),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      throw new Error(`Battle not found: ${args.battleId}`);
    }

    if (battle.resolved) {
      throw new Error(`Battle already resolved: ${args.battleId}`);
    }

    // Calculate final attacker ATK with modifiers
    let attackerATK = battle.attackerStats.attack;
    for (const mod of battle.modifiers) {
      if (mod.stat === "attack") {
        attackerATK += mod.delta;
      }
    }
    attackerATK = Math.max(0, attackerATK);

    let result = "";
    let damageDealt = 0;
    let damageTo = "";

    // Scenario 1: Direct attack
    if (battle.targetId === "direct") {
      result = "direct";
      damageDealt = attackerATK;
      // damageTo would be the opponent player ID (not stored in battle state)
      // For now, we'll leave it as empty string or "opponent"
      damageTo = "opponent";
    }
    // Scenario 2: Monster battle
    else if (battle.targetStats) {
      // Calculate final defender stats with modifiers
      let defenderATK = battle.targetStats.attack;
      let defenderDEF = battle.targetStats.defense;

      for (const mod of battle.modifiers) {
        if (mod.stat === "attack") {
          defenderATK += mod.delta;
        } else if (mod.stat === "defense") {
          defenderDEF += mod.delta;
        }
      }
      defenderATK = Math.max(0, defenderATK);
      defenderDEF = Math.max(0, defenderDEF);

      const defenderPosition = battle.targetStats.position || "attack";

      if (defenderPosition === "attack") {
        // ATK vs ATK
        if (attackerATK > defenderATK) {
          result = "attacker_wins";
          damageDealt = attackerATK - defenderATK;
          damageTo = "opponent"; // Defender's controller
        } else if (attackerATK < defenderATK) {
          result = "defender_wins";
          damageDealt = defenderATK - attackerATK;
          damageTo = battle.attackerPlayerId; // Attacker's controller
        } else {
          result = "tie";
          damageDealt = 0;
          damageTo = "";
        }
      } else {
        // ATK vs DEF
        if (attackerATK > defenderDEF) {
          result = "attacker_wins";
          damageDealt = 0; // No LP damage when attacking DEF position
          damageTo = "";
        } else if (attackerATK < defenderDEF) {
          result = "defender_wins";
          damageDealt = defenderDEF - attackerATK;
          damageTo = battle.attackerPlayerId; // Attacker takes reflection damage
        } else {
          result = "tie";
          damageDealt = 0;
          damageTo = "";
        }
      }
    } else {
      throw new Error(`Invalid battle state: targetId is not "direct" and targetStats is missing`);
    }

    // Create battle log entry
    await ctx.db.insert("battleLog", {
      gameId: battle.gameId,
      turn: args.turn,
      attackerId: battle.attackerId,
      targetId: battle.targetId,
      attackerPlayerId: battle.attackerPlayerId,
      result,
      damageDealt,
      damageTo,
      timestamp: Date.now(),
    });

    // Mark battle as resolved
    await ctx.db.patch(args.battleId, {
      resolved: true,
      phase: "end",
    });

    return {
      result,
      damageDealt,
      damageTo,
    };
  },
});

/**
 * Get active battles
 *
 * Returns all unresolved battles for a gameId.
 */
export const getActiveBattles = query({
  args: {
    gameId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const battles = await ctx.db
      .query("battleStates")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .filter((q) => q.eq(q.field("resolved"), false))
      .collect();

    return battles.map((battle) => ({
      ...battle,
      _id: battle._id as string,
    }));
  },
});

/**
 * Get battle by ID
 *
 * Returns a single battle state by ID.
 */
export const getBattleById = query({
  args: {
    battleId: v.id("battleStates"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle) {
      return null;
    }

    return {
      ...battle,
      _id: battle._id as string,
    };
  },
});
