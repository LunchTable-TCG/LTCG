/**
 * Game Helper Functions
 *
 * Core gameplay utilities for card manipulation, damage, and zone transitions.
 * All functions record appropriate game events for spectators and ElizaOS agents.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { parseAbility } from "../effectSystem";
import { recordEventHelper, recordGameEndHelper } from "../gameplay/gameEvents";
import { ErrorCode, createError } from "./errorCodes";

export type CardZone = "hand" | "deck" | "board" | "graveyard" | "banished" | "extraDeck";

/**
 * Draw cards from deck to hand
 *
 * Core game utility for drawing cards during draw phase or from card effects.
 * Records card_drawn event for each card drawn. Handles deck-out condition
 * (returns empty array if deck is empty, triggering game loss).
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param playerId - User ID of the player drawing cards
 * @param count - Number of cards to draw
 * @returns Array of card IDs drawn, or empty array if deck is empty
 */
export async function drawCards(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  count: number
): Promise<Id<"cardDefinitions">[]> {
  const isHost = playerId === gameState.hostId;
  const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;

  // Get player username for events
  const user = await ctx.db.get(playerId);
  const username = user?.username || "Unknown";

  // Determine how many cards can actually be drawn
  const cardsAvailable = deck.length;
  const cardsToDraw = Math.min(count, cardsAvailable);

  if (cardsToDraw === 0) {
    // Deck is empty - this triggers a game loss condition
    return [];
  }

  // Draw cards from top of deck
  const drawnCards: Id<"cardDefinitions">[] = [];
  for (let i = 0; i < cardsToDraw; i++) {
    const cardId = deck[i];
    if (!cardId) {
      throw createError(ErrorCode.LIBRARY_EMPTY_DECK, { index: i });
    }
    drawnCards.push(cardId);

    // Record card_drawn event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: gameState.gameId,
      turnNumber: 0, // Will be set by caller if needed
      eventType: "card_drawn",
      playerId,
      playerUsername: username,
      description: `${username} drew a card`,
      metadata: { cardId },
    });
  }

  // Update game state
  const newDeck = deck.slice(cardsToDraw);
  const newHand = [...hand, ...drawnCards];

  await ctx.db.patch(gameState._id, {
    [isHost ? "hostDeck" : "opponentDeck"]: newDeck,
    [isHost ? "hostHand" : "opponentHand"]: newHand,
  });

  return drawnCards;
}

/**
 * Shuffle deck
 *
 * Uses Fisher-Yates shuffle algorithm for in-place randomization.
 * Called when card effects require deck shuffling (e.g., after searching).
 * Records deck_shuffled event for game log.
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param playerId - User ID of the player whose deck to shuffle
 * @returns Promise that resolves when deck is shuffled
 */
export async function shuffleDeck(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">
): Promise<void> {
  const isHost = playerId === gameState.hostId;
  const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;

  // Fisher-Yates shuffle
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }

  // Get player username for events
  const user = await ctx.db.get(playerId);
  const username = user?.username || "Unknown";

  // Record deck_shuffled event
  await recordEventHelper(ctx, {
    lobbyId: gameState.lobbyId,
    gameId: gameState.gameId,
    turnNumber: 0, // Will be set by caller if needed
    eventType: "deck_shuffled",
    playerId,
    playerUsername: username,
    description: `${username}'s deck was shuffled`,
    metadata: { deckSize: shuffled.length },
  });

  // Update game state
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostDeck" : "opponentDeck"]: shuffled,
  });
}

/**
 * Move card between zones
 *
 * Core game utility for card zone transitions (hand, deck, board, graveyard, banished).
 * Handles removal from source zone and insertion into destination zone.
 * Records appropriate event based on destination zone for game log and spectators.
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param cardId - Card definition ID to move
 * @param fromZone - Source zone ("hand", "deck", "board", "graveyard", "banished")
 * @param toZone - Destination zone ("hand", "deck", "board", "graveyard", "banished")
 * @param playerId - User ID of the player who owns the card
 * @param turnNumber - Current turn number for event recording (defaults to 0)
 * @returns Promise that resolves when card is moved
 */
export async function moveCard(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  fromZone: CardZone,
  toZone: CardZone,
  playerId: Id<"users">,
  turnNumber = 0
): Promise<void> {
  const isHost = playerId === gameState.hostId;

  // Get player username for events
  const user = await ctx.db.get(playerId);
  const username = user?.username || "Unknown";

  // Determine event type based on destination
  let eventType: "card_to_hand" | "card_to_graveyard" | "card_banished" | "card_to_deck" =
    "card_to_hand";
  let description = "";

  switch (toZone) {
    case "hand":
      eventType = "card_to_hand";
      description = `${username} added a card to hand`;
      break;
    case "graveyard":
      eventType = "card_to_graveyard";
      description = `${username}'s card was sent to the graveyard`;
      break;
    case "banished":
      eventType = "card_banished";
      description = `${username}'s card was banished`;
      break;
    case "deck":
      eventType = "card_to_deck";
      description = `${username}'s card was returned to the deck`;
      break;
  }

  // Record zone transition event
  await recordEventHelper(ctx, {
    lobbyId: gameState.lobbyId,
    gameId: gameState.gameId,
    turnNumber,
    eventType,
    playerId,
    playerUsername: username,
    description,
    metadata: { cardId, fromZone, toZone },
  });

  // Update game state zones
  // Remove from source zone
  if (fromZone === "board") {
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const newBoard = board.filter((bc) => bc.cardId !== cardId);
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
    });
  } else if (fromZone === "hand") {
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    const newHand = hand.filter((c) => c !== cardId);
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostHand" : "opponentHand"]: newHand,
    });
  }

  // Add to destination zone
  if (toZone === "graveyard") {
    const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostGraveyard" : "opponentGraveyard"]: [...graveyard, cardId],
    });
  } else if (toZone === "hand") {
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostHand" : "opponentHand"]: [...hand, cardId],
    });
  } else if (toZone === "deck") {
    const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostDeck" : "opponentDeck"]: [...deck, cardId],
    });
  }
  // Note: banished zone not yet implemented in schema
}

/**
 * Apply damage to player
 *
 * Core game utility for applying damage from battle or card effects.
 * Reduces player's life points, records damage and LP change events,
 * and checks for game end condition (LP <= 0). Records game_end event if LP reaches 0.
 *
 * @internal
 * @param ctx - Mutation context
 * @param lobbyId - Lobby ID for event recording
 * @param gameState - Current game state document
 * @param targetPlayerId - User ID of the player taking damage
 * @param amount - Amount of damage to apply
 * @param source - Damage source ("battle" or "effect") for metadata tracking
 * @param turnNumber - Current turn number for event recording (defaults to 0)
 * @returns True if game ended (LP reached 0), false if game continues
 */
export async function applyDamage(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  targetPlayerId: Id<"users">,
  amount: number,
  source: "battle" | "effect",
  turnNumber = 0
): Promise<boolean> {
  const isHost = targetPlayerId === gameState.hostId;
  const currentLP = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
  const newLP = Math.max(0, currentLP - amount);

  // Get player username for events
  const user = await ctx.db.get(targetPlayerId);
  const username = user?.username || "Unknown";

  // Record damage event
  await recordEventHelper(ctx, {
    lobbyId,
    gameId: gameState.gameId,
    turnNumber,
    eventType: "damage",
    playerId: targetPlayerId,
    playerUsername: username,
    description: `${username} took ${amount} damage`,
    metadata: { amount, source, previousLP: currentLP, newLP },
  });

  // Record lp_changed event
  await recordEventHelper(ctx, {
    lobbyId,
    gameId: gameState.gameId,
    turnNumber,
    eventType: "lp_changed",
    playerId: targetPlayerId,
    playerUsername: username,
    description: `${username}'s LP: ${currentLP} → ${newLP}`,
    metadata: { previousLP: currentLP, newLP, change: -amount },
  });

  // Update game state
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostLifePoints" : "opponentLifePoints"]: newLP,
  });

  // Check for game end condition
  if (newLP <= 0) {
    // Game ends - winner is the other player
    const winnerId = isHost ? gameState.opponentId : gameState.hostId;
    const winner = await ctx.db.get(winnerId);
    const winnerUsername = winner?.username || "Unknown";

    await recordGameEndHelper(ctx, {
      lobbyId,
      gameId: gameState.gameId,
      turnNumber,
      winnerId,
      winnerUsername,
      loserId: targetPlayerId,
      loserUsername: username,
    });

    return true; // Game ended
  }

  return false; // Game continues
}

/**
 * Enforce hand size limit (6 cards maximum)
 *
 * Called during End Phase to enforce Yu-Gi-Oh hand limit rules.
 * If player has more than 6 cards, excess cards are discarded to graveyard.
 * Records hand_limit_enforced event if cards were discarded.
 *
 * Note: Simplified implementation discards from end of hand array.
 * Full implementation would require player input to choose which cards to discard.
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param playerId - User ID of the player to check hand limit for
 * @param turnNumber - Current turn number for event recording (defaults to 0)
 * @returns Promise that resolves when hand limit is enforced
 */
export async function enforceHandLimit(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  turnNumber = 0
): Promise<void> {
  const isHost = playerId === gameState.hostId;
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;

  const HAND_LIMIT = 6;

  if (hand.length <= HAND_LIMIT) {
    // No discarding needed
    return;
  }

  const excessCards = hand.length - HAND_LIMIT;
  const cardsToDiscard = hand.slice(HAND_LIMIT); // Discard excess cards
  const newHand = hand.slice(0, HAND_LIMIT);

  // Get player username for events
  const user = await ctx.db.get(playerId);
  const username = user?.username || "Unknown";

  // Record hand_limit_enforced event
  await recordEventHelper(ctx, {
    lobbyId: gameState.lobbyId,
    gameId: gameState.gameId,
    turnNumber,
    eventType: "hand_limit_enforced",
    playerId,
    playerUsername: username,
    description: `${username} discarded ${excessCards} card(s) due to hand limit`,
    metadata: {
      cardsDiscarded: cardsToDiscard,
      previousHandSize: hand.length,
      newHandSize: HAND_LIMIT,
    },
  });

  // Move discarded cards to graveyard
  for (const cardId of cardsToDiscard) {
    await moveCard(ctx, gameState, cardId, "hand", "graveyard", playerId, turnNumber);
  }

  // Update hand
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostHand" : "opponentHand"]: newHand,
  });
}

/**
 * Apply temporary modifier to a card
 *
 * Used by card effects to grant temporary ATK/DEF bonuses that expire
 * at the end of turn or specified phase (e.g., "until end of Battle Phase").
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param cardId - Card definition ID to apply modifier to
 * @param atkBonus - ATK bonus to apply (positive or negative)
 * @param defBonus - DEF bonus to apply (positive or negative)
 * @param expiresAtPhase - Optional phase when modifier expires ("end" or "battle_end")
 * @returns Promise that resolves when modifier is applied
 */
export async function applyTemporaryModifier(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  atkBonus: number,
  defBonus: number,
  expiresAtPhase?: "end" | "battle_end"
): Promise<void> {
  const modifiers = gameState.temporaryModifiers || [];

  modifiers.push({
    cardId,
    atkBonus,
    defBonus,
    expiresAtTurn: gameState.turnNumber,
    expiresAtPhase,
  });

  await ctx.db.patch(gameState._id, {
    temporaryModifiers: modifiers,
  });
}

/**
 * Clear temporary modifiers
 *
 * Helper to remove expired temporary modifiers based on turn number and phase.
 * Called at phase transitions and turn end to clean up expired stat bonuses.
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param currentPhase - Optional current phase to check for phase-based expiration
 * @returns Promise that resolves when expired modifiers are cleared
 */
export async function clearTemporaryModifiers(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  currentPhase?: string
): Promise<void> {
  const modifiers = gameState.temporaryModifiers || [];

  // Filter out expired modifiers
  const activeModifiers = modifiers.filter((mod) => {
    // If no phase specified, clear all modifiers from previous turns
    if (!currentPhase) {
      return mod.expiresAtTurn > gameState.turnNumber;
    }

    // If phase specified, clear modifiers that expire at this phase
    if (mod.expiresAtPhase === currentPhase) {
      return false;
    }

    // Keep modifiers from future turns
    return mod.expiresAtTurn > gameState.turnNumber;
  });

  await ctx.db.patch(gameState._id, {
    temporaryModifiers: activeModifiers,
  });
}

/**
 * Get card's current ATK/DEF including temporary modifiers
 *
 * Pure function that calculates a card's effective stats by summing base stats
 * with all active temporary modifiers targeting that card. Used for battle calculations
 * and stat display.
 *
 * @internal
 * @param gameState - Current game state document
 * @param cardId - Card definition ID to get stats for
 * @param baseAtk - Base ATK from card definition
 * @param baseDef - Base DEF from card definition
 * @returns Modified stats with ATK and DEF including all active bonuses
 */
export function getModifiedStats(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  baseAtk: number,
  baseDef: number
): { attack: number; defense: number } {
  const modifiers = gameState.temporaryModifiers || [];

  let atkBonus = 0;
  let defBonus = 0;

  for (const mod of modifiers) {
    if (mod.cardId === cardId) {
      atkBonus += mod.atkBonus;
      defBonus += mod.defBonus;
    }
  }

  return {
    attack: baseAtk + atkBonus,
    defense: baseDef + defBonus,
  };
}

/**
 * Apply continuous effects from all cards on the field
 *
 * Scans all field spells, continuous traps, and monster effects on the field
 * and applies matching stat bonuses to the target card based on conditions
 * (archetype, level, ATK/DEF thresholds). Used for accurate stat calculations
 * during battle and card activation.
 *
 * @internal
 * @param ctx - Context with database access (query or mutation)
 * @param gameState - Current game state document
 * @param cardId - Card definition ID to calculate bonuses for
 * @param cardDef - Full card definition with archetype data
 * @param isHost - Whether the card belongs to the host player
 * @returns Total ATK/DEF bonuses from all continuous effects
 */
export async function applyContinuousEffects(
  ctx: { db: any },
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  cardDef: any, // Full card definition with archetype
  isHost: boolean
): Promise<{ atkBonus: number; defBonus: number }> {
  let atkBonus = 0;
  let defBonus = 0;

  // Get the card being modified
  const card = await ctx.db.get(cardId);
  if (!card || card.cardType !== "creature") {
    return { atkBonus: 0, defBonus: 0 };
  }

  // Helper function to check if card matches a condition
  const matchesCondition = (condition?: string): boolean => {
    if (!condition) return true;
    if (condition === "all_monsters") return true;

    // Level conditions (e.g., "level_4_or_lower", "level_7_or_higher")
    const levelMatch = condition.match(/level_(\d+)_or_(lower|higher)/i);
    if (levelMatch && levelMatch[1] && levelMatch[2]) {
      const threshold = Number.parseInt(levelMatch[1]);
      const comparison = levelMatch[2].toLowerCase();
      const cardLevel = card.cost || 0; // Level is derived from cost

      if (comparison === "lower") {
        return cardLevel <= threshold;
      } else if (comparison === "higher") {
        return cardLevel >= threshold;
      }
    }

    // ATK threshold conditions (e.g., "atk_1500_or_less", "atk_2000_or_more")
    const atkMatch = condition.match(/atk_(\d+)_or_(less|more)/i);
    if (atkMatch && atkMatch[1] && atkMatch[2]) {
      const threshold = Number.parseInt(atkMatch[1]);
      const comparison = atkMatch[2].toLowerCase();
      const cardAtk = card.attack || 0;

      if (comparison === "less") {
        return cardAtk <= threshold;
      } else if (comparison === "more") {
        return cardAtk >= threshold;
      }
    }

    // DEF threshold conditions (e.g., "def_1500_or_less", "def_2000_or_more")
    const defMatch = condition.match(/def_(\d+)_or_(less|more)/i);
    if (defMatch && defMatch[1] && defMatch[2]) {
      const threshold = Number.parseInt(defMatch[1]);
      const comparison = defMatch[2].toLowerCase();
      const cardDef = card.defense || 0;

      if (comparison === "less") {
        return cardDef <= threshold;
      } else if (comparison === "more") {
        return cardDef >= threshold;
      }
    }

    // Extract archetype from condition (e.g., "Warrior_monsters" → "warrior")
    const archetypeMatch = condition.match(/^(.+)_monsters$/i);
    if (archetypeMatch && archetypeMatch[1]) {
      const requiredArchetype = archetypeMatch[1].toLowerCase();

      if (card.archetype?.toLowerCase().includes(requiredArchetype)) return true;
      if (card.name.toLowerCase().includes(requiredArchetype)) return true;
    }

    return false;
  };

  // Check field spells (affects both players unless specified)
  const playerFieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
  if (playerFieldSpell && playerFieldSpell.isActive) {
    const fieldCard = await ctx.db.get(playerFieldSpell.cardId);
    if (fieldCard?.ability) {
      const parsedAbility = parseAbility(fieldCard.ability);
      if (parsedAbility?.continuous) {
        if (matchesCondition(parsedAbility.condition)) {
          if (parsedAbility.type === "modifyATK") {
            atkBonus += parsedAbility.value || 0;
          } else if (parsedAbility.type === "modifyDEF") {
            defBonus += parsedAbility.value || 0;
          }
        }
      }
    }
  }

  // Check opponent's field spell (some affect opponent's monsters)
  const opponentFieldSpell = isHost ? gameState.opponentFieldSpell : gameState.hostFieldSpell;
  if (opponentFieldSpell && opponentFieldSpell.isActive) {
    const fieldCard = await ctx.db.get(opponentFieldSpell.cardId);
    if (fieldCard?.ability) {
      const parsedAbility = parseAbility(fieldCard.ability);
      if (parsedAbility?.continuous) {
        if (parsedAbility.condition?.includes("opponent_monsters")) {
          if (parsedAbility.type === "modifyATK") {
            atkBonus += parsedAbility.value || 0;
          } else if (parsedAbility.type === "modifyDEF") {
            defBonus += parsedAbility.value || 0;
          }
        }
      }
    }
  }

  // Check continuous traps in player's spell/trap zone
  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;
  for (const backrowCard of backrow) {
    if (!backrowCard || backrowCard.isFaceDown) continue;

    const backrowCardDef = await ctx.db.get(backrowCard.cardId);
    if (backrowCardDef?.cardType === "trap" && backrowCardDef.ability) {
      const parsedAbility = parseAbility(backrowCardDef.ability);
      if (parsedAbility?.continuous) {
        if (matchesCondition(parsedAbility.condition)) {
          if (parsedAbility.type === "modifyATK") {
            atkBonus += parsedAbility.value || 0;
          } else if (parsedAbility.type === "modifyDEF") {
            defBonus += parsedAbility.value || 0;
          }
        }
      }
    }
  }

  // Check continuous effects from monsters on the field
  const allBoards = [...gameState.hostBoard, ...gameState.opponentBoard];
  for (const boardCard of allBoards) {
    const cardDefinition = await ctx.db.get(boardCard.cardId);
    if (!cardDefinition?.ability) continue;

    const parsedEffect = parseAbility(cardDefinition.ability);
    if (!parsedEffect || !parsedEffect.continuous) continue;

    const effectOwnerIsHost = gameState.hostBoard.some((c) => c.cardId === boardCard.cardId);
    const targetIsOppMonster =
      parsedEffect.condition === "opponent_monsters" && effectOwnerIsHost !== isHost;
    const targetIsOwnMonster =
      parsedEffect.condition !== "opponent_monsters" && effectOwnerIsHost === isHost;

    if (targetIsOppMonster || (targetIsOwnMonster && matchesCondition(parsedEffect.condition))) {
      if (parsedEffect.type === "modifyATK") {
        atkBonus += parsedEffect.value || 0;
      } else if (parsedEffect.type === "modifyDEF") {
        defBonus += parsedEffect.value || 0;
      }
    }
  }

  return { atkBonus, defBonus };
}

/**
 * Check if a card has used its Once Per Turn (OPT) effect
 *
 * Pure function that checks OPT tracking array to prevent cards from using
 * their OPT effects multiple times in the same turn. OPT tracking is cleared
 * at the end of each turn.
 *
 * @internal
 * @param gameState - Current game state document
 * @param cardId - Card definition ID to check
 * @returns True if the card has already used its OPT effect this turn
 */
export function hasUsedOPT(gameState: Doc<"gameStates">, cardId: Id<"cardDefinitions">): boolean {
  const optUsed = gameState.optUsedThisTurn || [];
  return optUsed.includes(cardId);
}

/**
 * Mark a card as having used its Once Per Turn (OPT) effect
 *
 * Adds card to OPT tracking array to prevent multiple uses of OPT effects
 * in the same turn. Called after successfully activating an OPT effect.
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @param cardId - Card definition ID to mark as used
 * @returns Promise that resolves when OPT is marked
 */
export async function markOPTUsed(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">
): Promise<void> {
  const optUsed = gameState.optUsedThisTurn || [];

  if (!optUsed.includes(cardId)) {
    optUsed.push(cardId);
    await ctx.db.patch(gameState._id, {
      optUsedThisTurn: optUsed,
    });
  }
}

/**
 * Clear OPT tracking at end of turn
 *
 * Helper to reset OPT tracking array at turn end, allowing cards to use
 * their OPT effects again next turn. Called by turn management system.
 *
 * @internal
 * @param ctx - Mutation context
 * @param gameState - Current game state document
 * @returns Promise that resolves when OPT tracking is cleared
 */
export async function clearOPTTracking(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
): Promise<void> {
  await ctx.db.patch(gameState._id, {
    optUsedThisTurn: [],
  });
}
