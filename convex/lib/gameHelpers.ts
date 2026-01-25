/**
 * Game Helper Functions
 *
 * Core gameplay utilities for card manipulation, damage, and zone transitions.
 * All functions record appropriate game events for spectators and ElizaOS agents.
 */

import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

export type CardZone =
  | "hand"
  | "deck"
  | "board"
  | "graveyard"
  | "banished"
  | "extraDeck";

/**
 * Draw cards from deck to hand
 *
 * Records card_drawn event for each card drawn.
 * Handles deck-out condition (no cards left to draw).
 *
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
    drawnCards.push(cardId);

    // Record card_drawn event
    await ctx.runMutation(api.gameEvents.recordEvent, {
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
 * Uses Fisher-Yates shuffle algorithm.
 * Records deck_shuffled event.
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
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Get player username for events
  const user = await ctx.db.get(playerId);
  const username = user?.username || "Unknown";

  // Record deck_shuffled event
  await ctx.runMutation(api.gameEvents.recordEvent, {
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
 * Records appropriate zone transition event based on destination:
 * - card_to_hand: Moving to hand (search, retrieval)
 * - card_to_graveyard: Sent to graveyard
 * - card_banished: Banished/removed from play
 * - card_to_deck: Returned to deck
 */
export async function moveCard(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  fromZone: CardZone,
  toZone: CardZone,
  playerId: Id<"users">,
  turnNumber: number = 0
): Promise<void> {
  const isHost = playerId === gameState.hostId;

  // Get player username for events
  const user = await ctx.db.get(playerId);
  const username = user?.username || "Unknown";

  // Determine event type based on destination
  let eventType:
    | "card_to_hand"
    | "card_to_graveyard"
    | "card_banished"
    | "card_to_deck" = "card_to_hand";
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
  await ctx.runMutation(api.gameEvents.recordEvent, {
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
 * Records lp_changed and damage events.
 * Checks for game end condition (LP <= 0).
 *
 * @param source - "battle" or "effect" (for metadata tracking)
 * @returns true if game ended (LP reached 0), false otherwise
 */
export async function applyDamage(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  targetPlayerId: Id<"users">,
  amount: number,
  source: "battle" | "effect",
  turnNumber: number = 0
): Promise<boolean> {
  const isHost = targetPlayerId === gameState.hostId;
  const currentLP = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
  const newLP = Math.max(0, currentLP - amount);

  // Get player username for events
  const user = await ctx.db.get(targetPlayerId);
  const username = user?.username || "Unknown";

  // Record damage event
  await ctx.runMutation(api.gameEvents.recordEvent, {
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
  await ctx.runMutation(api.gameEvents.recordEvent, {
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

    await ctx.runMutation(api.gameEvents.recordGameEnd, {
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
 * Called during End Phase.
 * If player has more than 6 cards, they must discard down to 6.
 * Records hand_limit_enforced event if cards were discarded.
 *
 * Note: This is a simplified version - full implementation would need
 * player input to choose which cards to discard. For now, discards
 * from the end of the hand array.
 */
export async function enforceHandLimit(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  turnNumber: number = 0
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
  await ctx.runMutation(api.gameEvents.recordEvent, {
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
    await moveCard(
      ctx,
      gameState,
      cardId,
      "hand",
      "graveyard",
      playerId,
      turnNumber
    );
  }

  // Update hand
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostHand" : "opponentHand"]: newHand,
  });
}

/**
 * Apply temporary modifier to a card
 *
 * Adds ATK/DEF bonus that expires at the end of turn or specified phase.
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
 * Removes modifiers that have expired based on turn number and phase.
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
 * Returns the card's base stats plus any active modifiers.
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
 * Checks all cards with continuous effects and applies matching bonuses
 * to the target card based on archetype/type conditions.
 *
 * @param ctx - Mutation context (for DB access)
 * @param gameState - Current game state
 * @param cardId - Card to calculate stats for
 * @param cardDef - Card definition (for archetype checking)
 * @param isHost - Whether the card belongs to the host player
 * @returns ATK/DEF bonuses from continuous effects
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

  // Import parseAbility here to avoid circular dependency
  const { parseAbility } = await import("../effectSystem");

  // Check all cards on both boards for continuous effects
  const allBoards = [...gameState.hostBoard, ...gameState.opponentBoard];

  for (const boardCard of allBoards) {
    // Get card definition
    const cardDefinition = await ctx.db.get(boardCard.cardId);
    if (!cardDefinition?.ability) continue;

    // Parse ability
    const parsedEffect = parseAbility(cardDefinition.ability);
    if (!parsedEffect || !parsedEffect.continuous) continue;

    // Check if effect applies to this card
    const effectOwnerIsHost = gameState.hostBoard.some((c) => c.cardId === boardCard.cardId);
    const targetIsOppMonster = parsedEffect.condition === "opponent_monsters" && effectOwnerIsHost !== isHost;
    const targetIsOwnMonster = parsedEffect.condition !== "opponent_monsters" && effectOwnerIsHost === isHost;

    // Check archetype match for archetype-specific effects
    const archetypeMatch = parsedEffect.condition?.includes("_monsters") &&
                          parsedEffect.condition.replace("_monsters", "").replace("-type", "") === cardDef.archetype?.replace("_", "-");

    if (targetIsOppMonster || (targetIsOwnMonster && (archetypeMatch || !parsedEffect.condition?.includes("_monsters")))) {
      if (parsedEffect.type === "modifyATK") {
        atkBonus += parsedEffect.value || 0;
      }
    }
  }

  return { atkBonus, defBonus };
}

/**
 * Check if a card has used its Once Per Turn (OPT) effect
 *
 * @returns true if the card has already used its OPT effect this turn
 */
export function hasUsedOPT(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">
): boolean {
  const optUsed = gameState.optUsedThisTurn || [];
  return optUsed.includes(cardId);
}

/**
 * Mark a card as having used its Once Per Turn (OPT) effect
 *
 * Prevents the card from using its OPT effect again this turn.
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
 * Resets all cards so they can use their OPT effects next turn.
 */
export async function clearOPTTracking(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
): Promise<void> {
  await ctx.db.patch(gameState._id, {
    optUsedThisTurn: [],
  });
}
