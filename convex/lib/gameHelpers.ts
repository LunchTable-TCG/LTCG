/**
 * Game Helper Functions
 *
 * Core gameplay utilities for card manipulation, damage, and zone transitions.
 * All functions record appropriate game events for spectators and elizaOS agents.
 */

import { getAll } from "convex-helpers/server/relationships";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { JsonCondition, NumericRange } from "../gameplay/effectSystem/types";
import { recordEventHelper, recordGameEndHelper } from "../gameplay/gameEvents";
import { getCardAbility } from "./abilityHelpers";
import { ErrorCode, createError } from "./errorCodes";

export type CardZone = "hand" | "deck" | "board" | "graveyard" | "banished" | "extraDeck";

/**
 * Resolve a gameId string to a lobbyId.
 *
 * Story mode games use string-based gameIds (e.g. "story_<agentId>_<ts>")
 * while lobby games use the lobbyId directly as gameId. This helper looks up
 * the gameStates table by the `by_game_id` index and returns the canonical
 * lobbyId so callers can pass it to handler functions that expect
 * `Id<"gameLobbies">`.
 */
export async function resolveGameIdToLobbyId(
  ctx: MutationCtx | QueryCtx,
  gameId: string
): Promise<Id<"gameLobbies">> {
  const gameState = await ctx.db
    .query("gameStates")
    .withIndex("by_game_id", (q) => q.eq("gameId", gameId))
    .first();

  if (!gameState) {
    throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
      reason: "Game not found",
      gameId,
    });
  }

  return gameState.lobbyId;
}

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

  // Apply temporary modifiers
  for (const mod of modifiers) {
    if (mod.cardId === cardId) {
      atkBonus += mod.atkBonus;
      defBonus += mod.defBonus;
    }
  }

  // Apply lingering effects
  const lingeringEffects = gameState.lingeringEffects || [];
  for (const effect of lingeringEffects) {
    // Check if effect applies to this card
    const appliesToCard = shouldLingeringEffectApplyToCard(effect, cardId);

    if (appliesToCard) {
      if (effect.effectType === "modifyATK" && typeof effect.value === "number") {
        atkBonus += effect.value;
      } else if (effect.effectType === "modifyDEF" && typeof effect.value === "number") {
        defBonus += effect.value;
      }
    }
  }

  // Note: Equip spell stat bonuses are applied through the temporaryModifiers system
  // When an equip spell resolves, it creates a temporary modifier for the equipped monster
  // The equippedTo/equippedCards fields track the relationship for SBA and destruction rules

  return {
    attack: baseAtk + atkBonus,
    defense: baseDef + defBonus,
  };
}

/**
 * Conditions that control how a lingering effect targets cards
 */
interface LingeringEffectConditions {
  targetCardId?: Id<"cardDefinitions">;
  targetAll?: boolean;
  targetSelf?: boolean;
}

/**
 * Simplified lingering effect for condition checking
 */
interface LingeringEffectForConditionCheck {
  effectType: string;
  value: number | string | boolean | Record<string, unknown>;
  conditions?: LingeringEffectConditions;
}

/**
 * Check if a lingering effect should apply to a specific card
 */
function shouldLingeringEffectApplyToCard(
  effect: LingeringEffectForConditionCheck,
  cardId: Id<"cardDefinitions">
): boolean {
  if (!effect.conditions) return true;

  const conditions = effect.conditions;

  // Specific card target
  if (conditions.targetCardId) {
    return conditions.targetCardId === cardId;
  }

  // All matching cards (additional filtering could be added)
  if (conditions.targetAll) {
    return true;
  }

  // Default: apply to all
  return true;
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
 * @param _cardDef - Full card definition with archetype data (unused)
 * @param isHost - Whether the card belongs to the host player
 * @returns Total ATK/DEF bonuses from all continuous effects
 */
export async function applyContinuousEffects(
  // biome-ignore lint/suspicious/noExplicitAny: Convex context type varies
  ctx: { db: any },
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  // biome-ignore lint/suspicious/noExplicitAny: Card definition structure varies
  _cardDef: any,
  isHost: boolean
): Promise<{ atkBonus: number; defBonus: number }> {
  let atkBonus = 0;
  let defBonus = 0;

  // Get the card being modified
  const card = await ctx.db.get(cardId);
  if (!card || card.cardType !== "stereotype") {
    return { atkBonus: 0, defBonus: 0 };
  }

  // OPTIMIZATION: Batch fetch all card definitions to eliminate N+1 pattern
  // Step 1: Collect all card IDs we need to fetch
  const cardIdsToFetch: Id<"cardDefinitions">[] = [];

  const playerFieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
  if (playerFieldSpell?.isActive) {
    cardIdsToFetch.push(playerFieldSpell.cardId);
  }

  const opponentFieldSpell = isHost ? gameState.opponentFieldSpell : gameState.hostFieldSpell;
  if (opponentFieldSpell?.isActive) {
    cardIdsToFetch.push(opponentFieldSpell.cardId);
  }

  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;
  for (const backrowCard of backrow) {
    if (backrowCard && !backrowCard.isFaceDown) {
      cardIdsToFetch.push(backrowCard.cardId);
    }
  }

  const allBoards = [...gameState.hostBoard, ...gameState.opponentBoard];
  for (const boardCard of allBoards) {
    cardIdsToFetch.push(boardCard.cardId);
  }

  // Step 2: Batch fetch all cards (1 query instead of N)
  const fetchedCards = await getAll(ctx.db, "cardDefinitions", cardIdsToFetch);

  // Step 3: Build a lookup map for O(1) access
  const cardMap = new Map<string, Doc<"cardDefinitions">>();
  for (let i = 0; i < cardIdsToFetch.length; i++) {
    const cardId = cardIdsToFetch[i];
    const fetchedCard = fetchedCards[i];
    if (cardId && fetchedCard) {
      cardMap.set(cardId, fetchedCard as Doc<"cardDefinitions">);
    }
  }

  // Helper function to check if card matches a condition
  const matchesCondition = (condition?: string): boolean => {
    if (!condition) return true;
    if (condition === "all_monsters") return true;

    // Level conditions (e.g., "level_4_or_lower", "level_7_or_higher")
    const levelMatch = condition.match(/level_(\d+)_or_(lower|higher)/i);
    if (levelMatch?.[1] && levelMatch[2]) {
      const threshold = Number.parseInt(levelMatch[1]);
      const comparison = levelMatch[2].toLowerCase();
      const cardLevel = card.cost || 0; // Level is derived from cost

      if (comparison === "lower") {
        return cardLevel <= threshold;
      }
      if (comparison === "higher") {
        return cardLevel >= threshold;
      }
    }

    // ATK threshold conditions (e.g., "atk_1500_or_less", "atk_2000_or_more")
    const atkMatch = condition.match(/atk_(\d+)_or_(less|more)/i);
    if (atkMatch?.[1] && atkMatch[2]) {
      const threshold = Number.parseInt(atkMatch[1]);
      const comparison = atkMatch[2].toLowerCase();
      const cardAtk = card.attack || 0;

      if (comparison === "less") {
        return cardAtk <= threshold;
      }
      if (comparison === "more") {
        return cardAtk >= threshold;
      }
    }

    // DEF threshold conditions (e.g., "def_1500_or_less", "def_2000_or_more")
    const defMatch = condition.match(/def_(\d+)_or_(less|more)/i);
    if (defMatch?.[1] && defMatch[2]) {
      const threshold = Number.parseInt(defMatch[1]);
      const comparison = defMatch[2].toLowerCase();
      const cardDef = card.defense || 0;

      if (comparison === "less") {
        return cardDef <= threshold;
      }
      if (comparison === "more") {
        return cardDef >= threshold;
      }
    }

    // Extract archetype from condition (e.g., "Warrior_monsters" → "warrior")
    const archetypeMatch = condition.match(/^(.+)_monsters$/i);
    if (archetypeMatch?.[1]) {
      const requiredArchetype = archetypeMatch[1].toLowerCase();

      if (card.archetype?.toLowerCase().includes(requiredArchetype)) return true;
      if (card.name.toLowerCase().includes(requiredArchetype)) return true;
    }

    return false;
  };

  // Check field spells (affects both players unless specified)
  if (playerFieldSpell?.isActive) {
    const fieldCard = cardMap.get(playerFieldSpell.cardId);
    const parsedAbility = getCardAbility(fieldCard);
    if (parsedAbility) {
      for (const effect of parsedAbility.effects) {
        if (effect.continuous && matchesCondition(effect.condition)) {
          if (effect.type === "modifyATK") {
            atkBonus += effect.value || 0;
          } else if (effect.type === "modifyDEF") {
            defBonus += effect.value || 0;
          }
        }
      }
    }
  }

  // Check opponent's field spell (some affect opponent's monsters)
  if (opponentFieldSpell?.isActive) {
    const fieldCard = cardMap.get(opponentFieldSpell.cardId);
    const parsedAbility = getCardAbility(fieldCard);
    if (parsedAbility) {
      for (const effect of parsedAbility.effects) {
        if (effect.continuous && effect.condition?.includes("opponent_monsters")) {
          if (effect.type === "modifyATK") {
            atkBonus += effect.value || 0;
          } else if (effect.type === "modifyDEF") {
            defBonus += effect.value || 0;
          }
        }
      }
    }
  }

  // Check continuous traps in player's spell/trap zone
  for (const backrowCard of backrow) {
    if (!backrowCard || backrowCard.isFaceDown) continue;

    const backrowCardDef = cardMap.get(backrowCard.cardId);
    if (backrowCardDef?.cardType === "trap") {
      const parsedAbility = getCardAbility(backrowCardDef);
      if (parsedAbility) {
        for (const effect of parsedAbility.effects) {
          if (effect.continuous && matchesCondition(effect.condition)) {
            if (effect.type === "modifyATK") {
              atkBonus += effect.value || 0;
            } else if (effect.type === "modifyDEF") {
              defBonus += effect.value || 0;
            }
          }
        }
      }
    }
  }

  // Check continuous effects from monsters on the field
  for (const boardCard of allBoards) {
    const cardDefinition = cardMap.get(boardCard.cardId);
    const parsedAbility = getCardAbility(cardDefinition);
    if (!parsedAbility) continue;

    for (const effect of parsedAbility.effects) {
      if (!effect.continuous) continue;

      const effectOwnerIsHost = gameState.hostBoard.some((c) => c.cardId === boardCard.cardId);
      const targetIsOppMonster =
        effect.condition === "opponent_monsters" && effectOwnerIsHost !== isHost;
      const targetIsOwnMonster =
        effect.condition !== "opponent_monsters" && effectOwnerIsHost === isHost;

      if (targetIsOppMonster || (targetIsOwnMonster && matchesCondition(effect.condition))) {
        if (effect.type === "modifyATK") {
          atkBonus += effect.value || 0;
        } else if (effect.type === "modifyDEF") {
          defBonus += effect.value || 0;
        }
      }
    }
  }

  return { atkBonus, defBonus };
}

// ============================================================================
// TRIGGER CONDITION EVALUATION
// ============================================================================

/**
 * Helper to check if a value satisfies a numeric range condition
 */
function checkNumericRange(value: number, range: NumericRange | undefined): boolean {
  if (!range) return true;
  if (range.exact !== undefined && value !== range.exact) return false;
  if (range.min !== undefined && value < range.min) return false;
  if (range.max !== undefined && value > range.max) return false;
  return true;
}

/**
 * Evaluate game-state conditions for trigger activation
 *
 * Checks various game-state conditions before allowing a triggered effect
 * to execute. Supports LP thresholds, board counts, hand size, graveyard
 * counts, deck size, and opponent board conditions.
 *
 * @internal
 * @param _ctx - Mutation context (reserved for future archetype lookups)
 * @param gameState - Current game state document
 * @param condition - The activation condition to evaluate (JsonCondition)
 * @param playerId - User ID of the player whose perspective to evaluate from
 * @returns True if all conditions are met, false otherwise
 */
export async function evaluateTriggerCondition(
  _ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  condition: JsonCondition | undefined,
  playerId: Id<"users">
): Promise<boolean> {
  // No condition means always activates
  if (!condition) return true;

  const isHost = playerId === gameState.hostId;

  // Get player-relative data
  const playerLP = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
  const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
  const playerGraveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
  const playerHand = isHost ? gameState.hostHand : gameState.opponentHand;
  const playerDeck = isHost ? gameState.hostDeck : gameState.opponentDeck;

  // LP conditions
  if (condition.lpBelow !== undefined && playerLP >= condition.lpBelow) {
    return false;
  }
  if (condition.lpAbove !== undefined && playerLP <= condition.lpAbove) {
    return false;
  }

  // Board count conditions (player's monsters)
  if (condition.boardCount !== undefined) {
    if (!checkNumericRange(playerBoard.length, condition.boardCount)) {
      return false;
    }
  }

  // Opponent board count - check if opponent controls monsters
  // This uses the opponentHasNoMonsters flag or we can check opponentBoardCount from JsonCondition
  if (condition.opponentHasNoMonsters && opponentBoard.length > 0) {
    return false;
  }

  // Player controls no monsters
  if (condition.controlsNoMonsters && playerBoard.length > 0) {
    return false;
  }

  // Hand size conditions
  if (condition.handSize !== undefined) {
    if (!checkNumericRange(playerHand.length, condition.handSize)) {
      return false;
    }
  }

  // Graveyard conditions
  if (condition.graveyardContains !== undefined) {
    const gyCondition = condition.graveyardContains;

    // Check graveyard count
    if (gyCondition.count !== undefined) {
      if (!checkNumericRange(playerGraveyard.length, gyCondition.count)) {
        return false;
      }
    }

    // Note: cardType and archetype filtering would require fetching card definitions
    // For now, we only support count-based conditions
    // Future enhancement: filter graveyard by cardType/archetype
  }

  // Deck size conditions
  if (condition.deckSize !== undefined) {
    if (!checkNumericRange(playerDeck.length, condition.deckSize)) {
      return false;
    }
  }

  // Turn conditions
  if (condition.isFirstTurn !== undefined) {
    const isFirstTurn = gameState.turnNumber === 1;
    if (condition.isFirstTurn !== isFirstTurn) {
      return false;
    }
  }

  if (condition.isMyTurn !== undefined) {
    const isMyTurn = gameState.currentTurnPlayerId === playerId;
    if (condition.isMyTurn !== isMyTurn) {
      return false;
    }
  }

  if (condition.turnCount !== undefined) {
    if (!checkNumericRange(gameState.turnNumber, condition.turnCount)) {
      return false;
    }
  }

  // Handle logical operators (and/or)
  if (condition.type === "and" && condition.conditions) {
    for (const subCondition of condition.conditions) {
      const result = await evaluateTriggerCondition(_ctx, gameState, subCondition, playerId);
      if (!result) return false;
    }
  }

  if (condition.type === "or" && condition.conditions) {
    let anyPassed = false;
    for (const subCondition of condition.conditions) {
      const result = await evaluateTriggerCondition(_ctx, gameState, subCondition, playerId);
      if (result) {
        anyPassed = true;
        break;
      }
    }
    if (condition.conditions.length > 0 && !anyPassed) {
      return false;
    }
  }

  // All conditions passed
  return true;
}
