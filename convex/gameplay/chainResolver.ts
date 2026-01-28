/**
 * Chain Resolver
 *
 * Handles Yu-Gi-Oh chain mechanics:
 * - Chain Link stacking (CL1, CL2, CL3, etc.)
 * - Spell Speed validation
 * - Reverse resolution order (CL3 → CL2 → CL1)
 * - Priority passing
 *
 * Note: This is a simplified MVP implementation.
 * Full implementation would require comprehensive effect resolution system.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { createError, ErrorCode } from "../lib/errorCodes";
import { executeEffect, parseAbility } from "./effectSystem/index";
import { recordEventHelper } from "./gameEvents";

/**
 * Helper function to add effect to chain without mutation overhead
 *
 * Used by game engine to build chains efficiently without ctx.runMutation latency.
 * Validates spell speed compatibility (e.g., can't chain Speed 1 to Speed 2),
 * adds the effect to the chain stack, passes priority to opponent, and records the event.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Chain addition parameters
 * @param params.lobbyId - Lobby ID for the game
 * @param params.cardId - Card definition ID being activated
 * @param params.playerId - User ID of the player activating the effect
 * @param params.playerUsername - Username for event recording
 * @param params.spellSpeed - Spell speed (1 = Normal, 2 = Quick, 3 = Counter)
 * @param params.effect - Effect text to execute when chain resolves
 * @param params.targets - Optional array of target card IDs
 * @returns Chain state with success flag, chain link number, and total chain length
 * @throws {ErrorCode.GAME_INVALID_SPELL_SPEED} If spell speed is incompatible with current chain
 */
export async function addToChainHelper(
  ctx: MutationCtx,
  params: {
    lobbyId: Id<"gameLobbies">;
    cardId: Id<"cardDefinitions">;
    playerId: Id<"users">;
    playerUsername: string;
    spellSpeed: 1 | 2 | 3;
    effect: string;
    targets?: Id<"cardDefinitions">[];
  }
): Promise<{ success: boolean; chainLinkNumber: number; currentChainLength: number }> {
  const args = params;

  // 1. Get lobby
  const lobby = await ctx.db.get(args.lobbyId);
  if (!lobby) {
    throw createError(ErrorCode.NOT_FOUND_LOBBY, {
      reason: "Lobby not found",
      lobbyId: args.lobbyId,
    });
  }

  // 2. Get game state
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
    .first();

  if (!gameState) {
    throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
      reason: "Game state not found",
      lobbyId: args.lobbyId,
    });
  }

  // 3. Get current chain (or initialize empty)
  const currentChain = gameState.currentChain || [];

  // 4. Validate spell speed
  if (currentChain.length > 0) {
    const lastChainLink = currentChain[currentChain.length - 1];
    if (lastChainLink && args.spellSpeed < lastChainLink.spellSpeed) {
      throw createError(ErrorCode.GAME_INVALID_SPELL_SPEED, {
        reason: `Cannot chain Spell Speed ${args.spellSpeed} to Spell Speed ${lastChainLink.spellSpeed}`,
        currentSpellSpeed: args.spellSpeed,
        requiredSpellSpeed: lastChainLink.spellSpeed,
      });
    }
  }

  // 5. Create new chain link
  const newChainLink = {
    cardId: args.cardId,
    playerId: args.playerId,
    spellSpeed: args.spellSpeed,
    effect: args.effect,
    targets: args.targets,
  };

  const updatedChain = [...currentChain, newChainLink];

  // 6. Update game state with chain and priority
  const opponentId = args.playerId === gameState.hostId ? gameState.opponentId : gameState.hostId;
  await ctx.db.patch(gameState._id, {
    currentChain: updatedChain,
    currentPriorityPlayer: opponentId, // Give opponent priority to respond
  });

  // 7. Get card details
  const card = await ctx.db.get(args.cardId);

  // 8. Record chain_link_added event
  await recordEventHelper(ctx, {
    lobbyId: args.lobbyId,
    gameId: lobby.gameId!,
    turnNumber: lobby.turnNumber!,
    eventType: "chain_link_added",
    playerId: args.playerId,
    playerUsername: args.playerUsername,
    description: `${args.playerUsername} added ${card?.name || "a card"} to the chain (Chain Link ${updatedChain.length})`,
    metadata: {
      cardId: args.cardId,
      cardName: card?.name,
      chainLinkNumber: updatedChain.length,
      spellSpeed: args.spellSpeed,
      effect: args.effect,
    },
  });

  // 9. Return chain state
  return {
    success: true,
    chainLinkNumber: updatedChain.length,
    currentChainLength: updatedChain.length,
  };
}

/**
 * Add effect to chain
 *
 * Validates spell speed compatibility and adds to current chain.
 * Records: chain_link_added
 */
export const addToChain = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    spellSpeed: v.number(), // 1, 2, or 3
    effect: v.string(),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Call helper with validated user info
    return await addToChainHelper(ctx, {
      lobbyId: args.lobbyId,
      cardId: args.cardId,
      playerId: user.userId,
      playerUsername: user.username,
      spellSpeed: args.spellSpeed as 1 | 2 | 3,
      effect: args.effect,
      targets: args.targets,
    });
  },
});

/**
 * Helper function to resolve chain without mutation overhead
 *
 * Used by game engine to resolve chains efficiently in reverse order (CL3 → CL2 → CL1).
 * Executes each effect in the chain, handles negated effects, moves spell/trap cards to graveyard,
 * clears chain state, and records all resolution events for spectators.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Chain resolution parameters
 * @param params.lobbyId - Lobby ID for the game
 * @returns Resolution result with success flag and number of chain links resolved
 * @throws {ErrorCode.GAME_NO_CHAIN} If no chain exists to resolve
 * @throws {ErrorCode.GAME_INVALID_CHAIN} If chain structure is invalid
 */
export async function resolveChainHelper(
  ctx: MutationCtx,
  params: {
    lobbyId: Id<"gameLobbies">;
  }
): Promise<{ success: boolean; resolvedChainLinks: number }> {
  const args = params;
  // 1. Get lobby
  const lobby = await ctx.db.get(args.lobbyId);
  if (!lobby) {
    throw createError(ErrorCode.NOT_FOUND_LOBBY, {
      reason: "Lobby not found",
      lobbyId: args.lobbyId,
    });
  }

  // 2. Get game state
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
    .first();

  if (!gameState) {
    throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
      reason: "Game state not found",
      lobbyId: args.lobbyId,
    });
  }

  // 3. Get current chain
  const currentChain = gameState.currentChain || [];

  if (currentChain.length === 0) {
    throw createError(ErrorCode.GAME_NO_CHAIN, {
      reason: "No chain to resolve",
      lobbyId: args.lobbyId,
    });
  }

  const firstChainLink = currentChain[0];
  if (!firstChainLink) {
    throw createError(ErrorCode.GAME_INVALID_CHAIN, {
      reason: "Invalid chain structure",
      lobbyId: args.lobbyId,
    });
  }

  // 4. Record chain_resolving event
  await recordEventHelper(ctx, {
    lobbyId: args.lobbyId,
    gameId: lobby.gameId!,
    turnNumber: lobby.turnNumber!,
    eventType: "chain_resolving",
    playerId: firstChainLink.playerId,
    playerUsername: "System",
    description: `Chain of ${currentChain.length} effect(s) is resolving`,
    metadata: {
      chainLength: currentChain.length,
      chainLinks: currentChain.map((link, idx) => ({
        chainLink: idx + 1,
        cardId: link.cardId,
        playerId: link.playerId,
      })),
    },
  });

  // 5. Resolve chain in reverse order (CL3 → CL2 → CL1)
  for (let i = currentChain.length - 1; i >= 0; i--) {
    const chainLink = currentChain[i];
    if (!chainLink) continue;

    const card = await ctx.db.get(chainLink.cardId);

    // Skip negated effects
    if (chainLink.negated) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId!,
        turnNumber: lobby.turnNumber!,
        eventType: "activation_negated",
        playerId: chainLink.playerId,
        playerUsername: "System",
        description: `Chain Link ${i + 1}: ${card?.name || "Unknown"} effect was negated`,
        metadata: {
          cardId: chainLink.cardId,
          cardName: card?.name,
          chainLink: i + 1,
        },
      });

      // Move negated spell/trap to graveyard
      if (card?.cardType === "spell" || card?.cardType === "trap") {
        const currentState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
          .first();

        if (currentState) {
          const isHost = chainLink.playerId === currentState.hostId;
          const graveyard = isHost ? currentState.hostGraveyard : currentState.opponentGraveyard;
          await ctx.db.patch(currentState._id, {
            [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...graveyard, chainLink.cardId],
          });
        }
      }
      continue;
    }

    // Parse and execute effect
    const parsedEffect = parseAbility(chainLink.effect);

    if (parsedEffect) {
      // Refresh game state before each effect resolution
      const refreshedState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
        .first();

      if (refreshedState) {
        const effectResult = await executeEffect(
          ctx,
          refreshedState,
          args.lobbyId,
          parsedEffect,
          chainLink.playerId,
          chainLink.cardId,
          chainLink.targets || []
        );

        // Record effect resolution
        await recordEventHelper(ctx, {
          lobbyId: args.lobbyId,
          gameId: lobby.gameId!,
          turnNumber: lobby.turnNumber!,
          eventType: "effect_activated",
          playerId: chainLink.playerId,
          playerUsername: "System",
          description: `Chain Link ${i + 1}: ${card?.name || "Unknown"} - ${effectResult.message}`,
          metadata: {
            cardId: chainLink.cardId,
            cardName: card?.name,
            chainLink: i + 1,
            effect: chainLink.effect,
            success: effectResult.success,
          },
        });
      }
    } else {
      // Couldn't parse effect - log warning
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId!,
        turnNumber: lobby.turnNumber!,
        eventType: "effect_activated",
        playerId: chainLink.playerId,
        playerUsername: "System",
        description: `Chain Link ${i + 1}: ${card?.name || "Unknown"} effect (unparsed)`,
        metadata: {
          cardId: chainLink.cardId,
          cardName: card?.name,
          chainLink: i + 1,
          effect: chainLink.effect,
        },
      });
    }

    // Move spell/trap card to graveyard after effect resolves
    if (card?.cardType === "spell" || card?.cardType === "trap") {
      const currentState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
        .first();

      if (currentState) {
        const isHost = chainLink.playerId === currentState.hostId;
        const graveyard = isHost ? currentState.hostGraveyard : currentState.opponentGraveyard;
        await ctx.db.patch(currentState._id, {
          [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...graveyard, chainLink.cardId],
        });
      }
    }
  }

  // 6. Clear chain
  await ctx.db.patch(gameState._id, {
    currentChain: [],
    currentPriorityPlayer: undefined,
  });

  // 7. Record chain_resolved event
  await recordEventHelper(ctx, {
    lobbyId: args.lobbyId,
    gameId: lobby.gameId!,
    turnNumber: lobby.turnNumber!,
    eventType: "chain_resolved",
    playerId: firstChainLink.playerId,
    playerUsername: "System",
    description: `Chain fully resolved`,
    metadata: {
      chainLength: currentChain.length,
    },
  });

  // 8. Return success
  return {
    success: true,
    resolvedChainLinks: currentChain.length,
  };
}

/**
 * Resolve chain
 *
 * Resolves the current chain in reverse order (CL3 → CL2 → CL1).
 * Records: chain_resolving, chain_resolved, and effect results
 */
export const resolveChain = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    return await resolveChainHelper(ctx, args);
  },
});

/**
 * Pass priority
 *
 * Player declines to respond to the current chain.
 * If both players pass, resolves the chain.
 */
export const passPriority = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: args.lobbyId,
      });
    }

    // 3. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
        lobbyId: args.lobbyId,
      });
    }

    // 4. Check if there's a chain to respond to
    const currentChain = gameState.currentChain || [];

    if (currentChain.length === 0) {
      throw createError(ErrorCode.GAME_NO_CHAIN, {
        reason: "No chain to respond to",
        lobbyId: args.lobbyId,
      });
    }

    // 5. Pass priority to opponent
    const opponentId = user.userId === gameState.hostId ? gameState.opponentId : gameState.hostId;

    // Simplified priority system:
    // If current priority player passes, give priority to opponent
    // If opponent also passes, resolve chain

    if (gameState.currentPriorityPlayer === user.userId) {
      // This player passed, give priority to opponent
      await ctx.db.patch(gameState._id, {
        currentPriorityPlayer: opponentId,
      });

      return {
        success: true,
        priorityPassedTo: "opponent",
      };
    } else {
      // Both players passed - resolve chain
      await resolveChainHelper(ctx, {
        lobbyId: args.lobbyId,
      });

      return {
        success: true,
        priorityPassedTo: "none",
        chainResolved: true,
      };
    }
  },
});

/**
 * Get current chain state
 *
 * Returns the current chain for display purposes.
 */
export const getCurrentChain = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return {
        chain: [],
        priorityPlayer: null,
      };
    }

    const currentChain = gameState.currentChain || [];

    // Enrich with card names
    const enrichedChain = await Promise.all(
      currentChain.map(async (link, idx) => {
        const card = await ctx.db.get(link.cardId);
        const player = await ctx.db.get(link.playerId);

        return {
          chainLink: idx + 1,
          cardId: link.cardId,
          cardName: card?.name || "Unknown",
          playerId: link.playerId,
          playerName: player?.username || "Unknown",
          spellSpeed: link.spellSpeed,
          effect: link.effect,
        };
      })
    );

    return {
      chain: enrichedChain,
      priorityPlayer: gameState.currentPriorityPlayer,
    };
  },
});
