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
import { ErrorCode, createError } from "../lib/errorCodes";
import { type JsonAbility, executeEffect, parseJsonAbility } from "./effectSystem/index";
import { jsonAbilityValidator } from "./effectSystem/jsonEffectValidators";
import { checkStateBasedActions } from "./gameEngine/stateBasedActions";
import { recordEventHelper } from "./gameEvents";
import { checkReplayCondition } from "./replaySystem";
import { resetPriorityAfterChainLink } from "./responseWindow";
import { scanFieldForTriggers } from "./triggerSystem";

/**
 * Type for chain effect - JSON ability only (text parsing has been removed)
 */
export type ChainEffect = JsonAbility;

/**
 * Maximum chain length (12 links, like Yu-Gi-Oh official rules)
 */
const MAX_CHAIN_LENGTH = 12;

// Type definitions for chain links
interface ChainLink {
  cardId: Id<"cardDefinitions">;
  playerId: Id<"users">;
  spellSpeed: number;
  effect: ChainEffect;
  targets?: Id<"cardDefinitions">[];
  negated?: boolean;
  isNegated?: boolean; // If true, this activation was negated (alias for negated)
}

/**
 * Helper to parse chain effect (JSON format only)
 */
function parseChainEffect(effect: ChainEffect) {
  return parseJsonAbility(effect);
}

/**
 * Helper to serialize effect for logging/display
 */
function serializeEffectForDisplay(effect: ChainEffect): string {
  if (effect.effects.length > 0) {
    const firstEffect = effect.effects[0];
    const effectType = firstEffect?.type || "unknown";
    return `[Effect: ${effectType}]`;
  }
  return "[Effect]";
}

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
 * @param params.effect - Effect to execute when chain resolves (JsonAbility)
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
    effect: ChainEffect;
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
  const currentChain: ChainLink[] = gameState.currentChain || [];

  // 4. Chain link limit check (12 max like Yu-Gi-Oh)
  if (currentChain.length >= MAX_CHAIN_LENGTH) {
    throw createError(ErrorCode.GAME_CHAIN_LIMIT_EXCEEDED, {
      reason: "Chain cannot exceed 12 links",
      currentLength: currentChain.length,
      maxLength: MAX_CHAIN_LENGTH,
    });
  }

  // 5. Recursion detection - prevent same card from being added multiple times
  // unless it has a different effect type (for cards with multiple effects)
  const cardAlreadyInChain = currentChain.some(
    (link) =>
      link.cardId === args.cardId && link.effect.effects[0]?.type === args.effect.effects[0]?.type
  );

  if (cardAlreadyInChain) {
    // Check if card has OPT (once per turn) - for now, we block duplicate cards
    // In a full implementation, we'd check the card's OPT status
    throw createError(ErrorCode.GAME_CARD_ALREADY_IN_CHAIN, {
      reason: "This card is already in the chain",
      cardId: args.cardId,
    });
  }

  // 6. Validate spell speed (with Speed 3 exclusive window rules)
  if (currentChain.length > 0) {
    const lastChainLink = currentChain[currentChain.length - 1];
    if (!lastChainLink) throw createError(ErrorCode.GAME_INVALID_CHAIN_STATE, {});

    // Speed 3 exclusive rule: Only Speed 3 can respond to Speed 3
    if (lastChainLink.spellSpeed === 3) {
      if (args.spellSpeed !== 3) {
        throw createError(ErrorCode.GAME_INVALID_SPELL_SPEED, {
          reason: "Only Counter Traps (Speed 3) can respond to Counter Traps",
          attemptedSpeed: args.spellSpeed,
          requiredSpeed: 3,
        });
      }
    }

    // Check if any Speed 3 exists in chain - locks out non-Speed 3
    const hasSpeed3InChain = currentChain.some((link) => link.spellSpeed === 3);
    if (hasSpeed3InChain && args.spellSpeed < 3) {
      throw createError(ErrorCode.GAME_INVALID_SPELL_SPEED, {
        reason: "Cannot chain Speed < 3 after a Counter Trap has been activated",
        attemptedSpeed: args.spellSpeed,
        chainContainsSpeed3: true,
      });
    }

    // Normal rule: Can't chain lower speed to higher
    if (args.spellSpeed < lastChainLink.spellSpeed) {
      throw createError(ErrorCode.GAME_INVALID_SPELL_SPEED, {
        reason: `Cannot chain Speed ${args.spellSpeed} to Speed ${lastChainLink.spellSpeed}`,
        currentSpellSpeed: args.spellSpeed,
        requiredSpellSpeed: lastChainLink.spellSpeed,
      });
    }
  }

  // 5. Create new chain link
  const newChainLink: ChainLink = {
    cardId: args.cardId,
    playerId: args.playerId,
    spellSpeed: args.spellSpeed,
    effect: args.effect,
    targets: args.targets,
  };

  const updatedChain = [...currentChain, newChainLink];

  // 6. Update game state with chain, priority, and track the activation
  const opponentId = args.playerId === gameState.hostId ? gameState.opponentId : gameState.hostId;

  // Track priority history for the activation
  const history = gameState.priorityHistory || [];
  const priorityHistoryEntry = {
    playerId: args.playerId,
    action: "activated",
    timestamp: Date.now(),
    chainLength: updatedChain.length,
  };

  await ctx.db.patch(gameState._id, {
    currentChain: updatedChain,
    currentPriorityPlayer: opponentId, // Give opponent priority to respond
    priorityHistory: [...history.slice(-49), priorityHistoryEntry], // Keep last 50 entries
  });

  // 7. Get card details
  const card = await ctx.db.get(args.cardId);

  // 8. Record chain_link_added event
  // Note: lobby is only used for gameId; turn state comes from gameState
  if (!lobby.gameId || gameState.turnNumber === undefined) {
    throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
      reason: "Game not properly initialized",
      lobbyId: args.lobbyId,
    });
  }

  await recordEventHelper(ctx, {
    lobbyId: args.lobbyId,
    gameId: lobby.gameId,
    turnNumber: gameState.turnNumber,
    eventType: "chain_link_added",
    playerId: args.playerId,
    playerUsername: args.playerUsername,
    description: `${args.playerUsername} added ${card?.name || "a card"} to the chain (Chain Link ${updatedChain.length})`,
    metadata: {
      cardId: args.cardId,
      cardName: card?.name,
      chainLinkNumber: updatedChain.length,
      spellSpeed: args.spellSpeed,
      effect: serializeEffectForDisplay(args.effect),
    },
  });

  // 9. Execute chain triggers
  // Fire on_chain_start if this is the first link
  if (currentChain.length === 0) {
    // First chain link - fire on_chain_start triggers on all field cards
    await scanFieldForTriggers(
      ctx,
      args.lobbyId,
      gameState,
      "on_chain_start",
      gameState.turnNumber || 1
    );
  }

  // Fire on_chain_link triggers - card was added to chain
  await scanFieldForTriggers(
    ctx,
    args.lobbyId,
    gameState,
    "on_chain_link",
    gameState.turnNumber || 1
  );

  // 10. Return chain state
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
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Card being activated
 * @param spellSpeed - 1 (Normal), 2 (Quick), or 3 (Counter)
 * @param effect - Effect to execute (JsonAbility)
 * @param targets - Optional target card IDs
 */
export const addToChain = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    spellSpeed: v.number(), // 1, 2, or 3
    effect: jsonAbilityValidator, // JSON format only
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
): Promise<{
  success: boolean;
  resolvedChainLinks: number;
  gameEnded?: boolean;
  winnerId?: Id<"users">;
  replayTriggered?: boolean;
}> {
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
  const currentChain: ChainLink[] = gameState.currentChain || [];

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
  // Note: lobby is only used for gameId; turn state comes from gameState
  if (!lobby.gameId || gameState.turnNumber === undefined) {
    throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
      reason: "Game not properly initialized",
      lobbyId: args.lobbyId,
    });
  }

  await recordEventHelper(ctx, {
    lobbyId: args.lobbyId,
    gameId: lobby.gameId,
    turnNumber: gameState.turnNumber,
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
  // Track visited effect IDs to prevent infinite loops during resolution
  const visitedEffectIds = new Set<string>();

  for (let i = currentChain.length - 1; i >= 0; i--) {
    const chainLink = currentChain[i];
    if (!chainLink) continue;

    // Loop prevention: Check if this exact effect has already been executed
    const effectType = chainLink.effect.effects[0]?.type || "unknown";
    const effectKey = `${chainLink.cardId}-${effectType}-${i}`;
    if (visitedEffectIds.has(effectKey)) {
      // Log warning and skip to prevent infinite loop
      console.warn(`Skipping duplicate effect execution: ${effectKey}`);
      continue;
    }
    visitedEffectIds.add(effectKey);

    const card = await ctx.db.get(chainLink.cardId);

    // Skip negated effects (check both negated and isNegated flags)
    if (chainLink.negated || chainLink.isNegated) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
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
      // Exception: Remove continuous spells/traps from field if negated
      if (card?.cardType === "spell" || card?.cardType === "trap") {
        const currentState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
          .first();

        if (currentState) {
          const isHost = chainLink.playerId === currentState.hostId;
          const graveyard = isHost ? currentState.hostGraveyard : currentState.opponentGraveyard;

          // Check if this is a continuous spell/trap
          const isContinuous =
            (card.cardType === "spell" && card.spellType === "continuous") ||
            (card.cardType === "trap" && card.trapType === "continuous");

          if (isContinuous) {
            // Remove from spell/trap zone if it was placed there
            const spellTrapZone = isHost
              ? currentState.hostSpellTrapZone
              : currentState.opponentSpellTrapZone;
            const newSpellTrapZone = spellTrapZone.filter((st) => st.cardId !== chainLink.cardId);
            await ctx.db.patch(currentState._id, {
              [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
            });
          }

          // All negated spells/traps go to graveyard
          await ctx.db.patch(currentState._id, {
            [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...graveyard, chainLink.cardId],
          });
        }
      }
      continue;
    }

    // Parse and execute effect (supports both text and JSON formats)
    const parsedAbility = parseChainEffect(chainLink.effect);
    const parsedEffect = parsedAbility?.effects[0] ?? null;

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
          gameId: lobby.gameId,
          turnNumber: gameState.turnNumber,
          eventType: "effect_activated",
          playerId: chainLink.playerId,
          playerUsername: "System",
          description: `Chain Link ${i + 1}: ${card?.name || "Unknown"} - ${effectResult.message}`,
          metadata: {
            cardId: chainLink.cardId,
            cardName: card?.name,
            chainLink: i + 1,
            effect: serializeEffectForDisplay(chainLink.effect),
            success: effectResult.success,
          },
        });
      }
    } else {
      // Couldn't parse effect - log warning
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "effect_activated",
        playerId: chainLink.playerId,
        playerUsername: "System",
        description: `Chain Link ${i + 1}: ${card?.name || "Unknown"} effect (unparsed)`,
        metadata: {
          cardId: chainLink.cardId,
          cardName: card?.name,
          chainLink: i + 1,
          effect: serializeEffectForDisplay(chainLink.effect),
        },
      });
    }

    // Move spell/trap card to graveyard after effect resolves
    // Exception: Continuous/Field/Equip spells remain on field
    if (card?.cardType === "spell" || card?.cardType === "trap") {
      // Check if spell/trap should remain on field
      const remainsOnField =
        (card.cardType === "spell" &&
          (card.spellType === "continuous" ||
            card.spellType === "field" ||
            card.spellType === "equip")) ||
        (card.cardType === "trap" && card.trapType === "continuous");

      if (remainsOnField) {
        // For equip spells, place them on the field with equippedTo relationship
        if (card.cardType === "spell" && card.spellType === "equip") {
          const currentState = await ctx.db
            .query("gameStates")
            .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
            .first();

          if (currentState && chainLink.targets && chainLink.targets.length > 0) {
            const equipTarget = chainLink.targets[0];
            const isHost = chainLink.playerId === currentState.hostId;
            const spellTrapZone = isHost
              ? currentState.hostSpellTrapZone
              : currentState.opponentSpellTrapZone;

            // Add equip spell to spell/trap zone
            const newSpellTrapZone = [
              ...spellTrapZone,
              {
                cardId: chainLink.cardId,
                isFaceDown: false,
                isActivated: true,
                turnSet: currentState.turnNumber || 1,
                equippedTo: equipTarget,
              },
            ];

            await ctx.db.patch(currentState._id, {
              [isHost ? "hostSpellTrapZone" : "opponentSpellTrapZone"]: newSpellTrapZone,
            });

            // Update target monster's equippedCards array
            const hostBoard = currentState.hostBoard;
            const opponentBoard = currentState.opponentBoard;

            const hostMonsterIdx = hostBoard.findIndex((m) => m.cardId === equipTarget);
            const opponentMonsterIdx = opponentBoard.findIndex((m) => m.cardId === equipTarget);

            if (hostMonsterIdx !== -1 && hostBoard[hostMonsterIdx]) {
              const monster = hostBoard[hostMonsterIdx];
              const updatedMonster = {
                ...monster,
                equippedCards: [...(monster.equippedCards || []), chainLink.cardId],
              };
              const updatedBoard = [...hostBoard];
              updatedBoard[hostMonsterIdx] = updatedMonster;
              await ctx.db.patch(currentState._id, {
                hostBoard: updatedBoard,
              });
            } else if (opponentMonsterIdx !== -1 && opponentBoard[opponentMonsterIdx]) {
              const monster = opponentBoard[opponentMonsterIdx];
              const updatedMonster = {
                ...monster,
                equippedCards: [...(monster.equippedCards || []), chainLink.cardId],
              };
              const updatedBoard = [...opponentBoard];
              updatedBoard[opponentMonsterIdx] = updatedMonster;
              await ctx.db.patch(currentState._id, {
                opponentBoard: updatedBoard,
              });
            }
          }
        }
        // Continuous spells/field spells/continuous traps are already on field, nothing to do
      } else {
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
      // If continuous, it's already on the field from activateSpell/activateTrap
    }
  }

  // 6. Clear chain and reset priority to turn player
  // After chain resolution, turn player gets priority first for next action
  // Note: Turn state comes from gameState, not lobby
  const turnPlayerId = gameState.currentTurnPlayerId;

  await ctx.db.patch(gameState._id, {
    currentChain: [],
    currentPriorityPlayer: turnPlayerId,
  });

  // 6b. Reset priority in response window if it exists
  const refreshedStateAfterChain = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
    .first();

  if (refreshedStateAfterChain && turnPlayerId) {
    await resetPriorityAfterChainLink(ctx, refreshedStateAfterChain, turnPlayerId);
  }

  // 7. Record chain_resolved event
  await recordEventHelper(ctx, {
    lobbyId: args.lobbyId,
    gameId: lobby.gameId,
    turnNumber: gameState.turnNumber,
    eventType: "chain_resolved",
    playerId: firstChainLink.playerId,
    playerUsername: "System",
    description: "Chain fully resolved",
    metadata: {
      chainLength: currentChain.length,
    },
  });

  // 7b. Execute on_chain_resolve triggers
  await scanFieldForTriggers(
    ctx,
    args.lobbyId,
    gameState,
    "on_chain_resolve",
    gameState.turnNumber || 1
  );

  // 8. Run state-based action checks after chain resolution
  const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
    skipHandLimit: true,
    turnNumber: gameState.turnNumber,
  });

  // 9. Check for battle replay condition
  // After chain resolution, check if replay should be triggered
  // (opponent's monster count may have changed during chain resolution)
  let replayTriggered = false;
  if (!sbaResult.gameEnded) {
    const latestState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (latestState) {
      replayTriggered = await checkReplayCondition(ctx, args.lobbyId, latestState);
    }
  }

  // 10. Return success
  return {
    success: true,
    resolvedChainLinks: currentChain.length,
    gameEnded: sbaResult.gameEnded,
    winnerId: sbaResult.winnerId,
    replayTriggered,
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
    const currentChain: ChainLink[] = gameState.currentChain || [];

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
    }
    // Both players passed - resolve chain
    await resolveChainHelper(ctx, {
      lobbyId: args.lobbyId,
    });

    return {
      success: true,
      priorityPassedTo: "none",
      chainResolved: true,
    };
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

    const currentChain: ChainLink[] = gameState.currentChain || [];

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
          effect: serializeEffectForDisplay(link.effect as ChainEffect),
        };
      })
    );

    return {
      chain: enrichedChain,
      priorityPlayer: gameState.currentPriorityPlayer || null,
    };
  },
});
