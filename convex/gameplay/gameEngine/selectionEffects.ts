/**
 * Selection-Based Effects
 *
 * Mutations and queries for effects that require player selection:
 * - Special summon from graveyard/banished
 * - Destroy multiple targets
 * - Revival effects
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { executeSpecialSummon } from "../effectSystem/executors/summon/summon";

/**
 * Get available targets for special summon from graveyard
 *
 * Query to fetch monsters in graveyard that can be special summoned.
 * Used by frontend to display selection modal.
 */
export const getGraveyardSummonTargets = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthQuery(ctx);

    // 2. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return { success: false, targets: [] };
    }

    const isHost = user.userId === gameState.hostId;
    const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

    // 3. Filter for monsters only - batch fetch all cards
    const cards = await Promise.all(graveyard.map((id) => ctx.db.get(id)));
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    const targets = [];
    for (const cardId of graveyard) {
      const card = cardMap.get(cardId);
      if (!card || card.cardType !== "creature") continue;

      targets.push({
        cardId,
        name: card.name,
        cardType: card.cardType,
        imageUrl: card.imageUrl,
        monsterStats: {
          attack: card.attack || 0,
          defense: card.defense || 0,
        },
      });
    }

    return {
      success: true,
      targets,
      zone: "graveyard" as const,
    };
  },
});

/**
 * Get available targets for special summon from banished zone
 */
export const getBanishedSummonTargets = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthQuery(ctx);

    // 2. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return { success: false, targets: [] };
    }

    const isHost = user.userId === gameState.hostId;
    const banished = isHost ? gameState.hostBanished : gameState.opponentBanished;

    // 3. Filter for monsters only - batch fetch all cards
    const cards = await Promise.all(banished.map((id) => ctx.db.get(id)));
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    const targets = [];
    for (const cardId of banished) {
      const card = cardMap.get(cardId);
      if (!card || card.cardType !== "creature") continue;

      targets.push({
        cardId,
        name: card.name,
        cardType: card.cardType,
        imageUrl: card.imageUrl,
        monsterStats: {
          attack: card.attack || 0,
          defense: card.defense || 0,
        },
      });
    }

    return {
      success: true,
      targets,
      zone: "banished" as const,
    };
  },
});

/**
 * Complete special summon with player's selection
 *
 * Second step: Player selected a monster, now summon it.
 */
export const completeSpecialSummon = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    selectedCardId: v.id("cardDefinitions"),
    fromZone: v.union(v.literal("graveyard"), v.literal("hand")),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    // 3. Execute special summon
    const result = await executeSpecialSummon(
      ctx,
      gameState,
      args.selectedCardId,
      user.userId,
      args.fromZone
    );

    return {
      success: result.success,
      message: result.message,
    };
  },
});

/**
 * Get available targets for destruction effects
 *
 * Used for effects like "Destroy up to 2 spell/trap cards"
 */
export const getDestructionTargets = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    targetType: v.optional(
      v.union(v.literal("monster"), v.literal("spell"), v.literal("trap"), v.literal("any"))
    ),
    targetPlayer: v.optional(v.union(v.literal("self"), v.literal("opponent"))),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthQuery(ctx);

    // 2. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return { success: false, targets: [] };
    }

    const isHost = user.userId === gameState.hostId;
    const targetType = args.targetType || "any";
    const targetPlayer = args.targetPlayer || "opponent";

    // Choose which player's board to check
    const board =
      targetPlayer === "self"
        ? isHost
          ? gameState.hostBoard
          : gameState.opponentBoard
        : isHost
          ? gameState.opponentBoard
          : gameState.hostBoard;

    const spellTrapZone =
      targetPlayer === "self"
        ? isHost
          ? gameState.hostSpellTrapZone
          : gameState.opponentSpellTrapZone
        : isHost
          ? gameState.opponentSpellTrapZone
          : gameState.hostSpellTrapZone;

    const targets = [];

    // Batch fetch all card IDs we'll need
    const allCardIds = [
      ...board.map((bc) => bc.cardId),
      ...spellTrapZone.filter((st) => !st.isFaceDown).map((st) => st.cardId),
    ];
    const cards = await Promise.all(allCardIds.map((id) => ctx.db.get(id)));
    const cardMap = new Map(
      cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
    );

    // 3. Check monster board
    if (targetType === "monster" || targetType === "any") {
      for (const boardCard of board) {
        const card = cardMap.get(boardCard.cardId);
        if (!card) continue;

        targets.push({
          cardId: boardCard.cardId,
          name: card.name,
          cardType: card.cardType,
          imageUrl: card.imageUrl,
          monsterStats: {
            attack: card.attack || 0,
            defense: card.defense || 0,
          },
        });
      }
    }

    // 4. Check spell/trap zone
    if (targetType === "spell" || targetType === "trap" || targetType === "any") {
      for (const stCard of spellTrapZone) {
        if (stCard.isFaceDown) continue; // Skip face-down cards

        const card = cardMap.get(stCard.cardId);
        if (!card) continue;

        // Filter by type if specified
        if (targetType === "spell" && card.cardType !== "spell") continue;
        if (targetType === "trap" && card.cardType !== "trap") continue;

        targets.push({
          cardId: stCard.cardId,
          name: card.name,
          cardType: card.cardType,
          imageUrl: card.imageUrl,
        });
      }
    }

    return {
      success: true,
      targets,
      zone: "board" as const,
    };
  },
});
