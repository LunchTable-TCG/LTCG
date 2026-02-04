/**
 * AI Turn Automation
 *
 * Executes a full AI turn using atomic state changes and the sophisticated
 * AI decision engine from aiEngine.ts. Supports all difficulty levels.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../functions";
import { getCardAbility } from "../../lib/abilityHelpers";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { drawCards } from "../../lib/gameHelpers";
import { type AIAction, makeAIDecision } from "./aiEngine";

// Types for atomic state changes
interface BoardCard {
  cardId: Id<"cardDefinitions">;
  position: number;
  attack: number;
  defense: number;
  isFaceDown: boolean;
  hasAttacked: boolean;
}

interface StateChanges {
  opponentBoard: BoardCard[];
  opponentHand: Id<"cardDefinitions">[];
  opponentGraveyard: Id<"cardDefinitions">[];
  opponentDeck: Id<"cardDefinitions">[];
  opponentLifePoints: number;
  hostBoard: BoardCard[];
  hostHand: Id<"cardDefinitions">[];
  hostLifePoints: number;
  hostGraveyard: Id<"cardDefinitions">[];
  hostDeck: Id<"cardDefinitions">[];
  opponentNormalSummonedThisTurn: boolean;
}

/**
 * Execute a single AI action and return updated state changes
 */
function executeAction(
  action: AIAction,
  stateChanges: StateChanges,
  cardDataMap: Map<string, Doc<"cardDefinitions">>
): { success: boolean; description: string } {
  switch (action.type) {
    case "summon": {
      if (!action.cardId) return { success: false, description: "No card specified for summon" };

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };

      // Handle tribute summons
      if (action.tributeIds && action.tributeIds.length > 0) {
        // Remove tributed monsters from board
        for (const tributeId of action.tributeIds) {
          const tributeIndex = stateChanges.opponentBoard.findIndex((m) => m.cardId === tributeId);
          if (tributeIndex !== -1) {
            const removed = stateChanges.opponentBoard.splice(tributeIndex, 1);
            // Add tributed card to graveyard
            if (removed[0]) {
              stateChanges.opponentGraveyard.push(removed[0].cardId);
            }
          }
        }
      }

      // Remove from hand
      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      // Add to board
      stateChanges.opponentBoard.push({
        cardId: action.cardId,
        position: action.position === "defense" ? -1 : 1,
        attack: card.attack || 0,
        defense: card.defense || 0,
        isFaceDown: false,
        hasAttacked: false,
      });

      stateChanges.opponentNormalSummonedThisTurn = true;

      const tributeCount = action.tributeIds?.length || 0;
      const tributeDesc = tributeCount > 0 ? ` (tributed ${tributeCount})` : "";
      return { success: true, description: `Summoned ${card.name}${tributeDesc}` };
    }

    case "set": {
      if (!action.cardId) return { success: false, description: "No card specified for set" };

      const card = cardDataMap.get(action.cardId);
      if (!card) return { success: false, description: "Card not found" };

      // Remove from hand
      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      if (card.cardType === "creature") {
        // Set monster face-down in defense
        stateChanges.opponentBoard.push({
          cardId: action.cardId,
          position: -1, // Defense
          attack: card.attack || 0,
          defense: card.defense || 0,
          isFaceDown: true,
          hasAttacked: false,
        });
        stateChanges.opponentNormalSummonedThisTurn = true;
      }
      // Note: Spell/Trap set would go to spellTrapZone, not implemented yet

      return { success: true, description: `Set ${card.name}` };
    }

    case "attack": {
      if (!action.cardId) return { success: false, description: "No attacker specified" };

      // Find attacker on board
      const attackerIndex = stateChanges.opponentBoard.findIndex((m) => m.cardId === action.cardId);
      if (attackerIndex === -1) return { success: false, description: "Attacker not on board" };

      const attacker = stateChanges.opponentBoard[attackerIndex];
      if (!attacker) return { success: false, description: "Attacker not found" };
      if (attacker.hasAttacked) return { success: false, description: "Already attacked" };
      if (attacker.position !== 1) return { success: false, description: "Not in attack position" };

      const attackerCard = cardDataMap.get(action.cardId);

      // Direct attack if no defenders
      if (stateChanges.hostBoard.length === 0) {
        stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - attacker.attack);
        stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
        return {
          success: true,
          description: `${attackerCard?.name || "Monster"} attacked directly for ${attacker.attack} damage`,
        };
      }

      // Find target (attack first monster for simplicity)
      const targetIndex = 0;
      const target = stateChanges.hostBoard[targetIndex];
      if (!target) return { success: false, description: "No valid target" };

      const targetCard = cardDataMap.get(target.cardId);
      const targetDEF = target.position === -1 ? target.defense : target.attack;

      if (attacker.attack > targetDEF) {
        // Destroy target
        stateChanges.hostBoard.splice(targetIndex, 1);
        stateChanges.hostGraveyard.push(target.cardId);

        // Calculate and apply damage (only if target was in attack position)
        if (target.position === 1) {
          const damage = attacker.attack - target.attack;
          stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - damage);
        }

        stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
        return {
          success: true,
          description: `${attackerCard?.name || "Monster"} destroyed ${targetCard?.name || "monster"}`,
        };
      }
      if (attacker.attack === targetDEF && target.position === 1) {
        // Both destroyed
        stateChanges.hostBoard.splice(targetIndex, 1);
        stateChanges.hostGraveyard.push(target.cardId);
        stateChanges.opponentBoard.splice(attackerIndex, 1);
        stateChanges.opponentGraveyard.push(attacker.cardId);
        return {
          success: true,
          description: `${attackerCard?.name || "Monster"} and ${targetCard?.name || "monster"} destroyed each other`,
        };
      }
      // Attacker loses or can't destroy target - mark as attacked but no destruction
      stateChanges.opponentBoard[attackerIndex] = { ...attacker, hasAttacked: true };
      return { success: false, description: `${attackerCard?.name || "Monster"} attack failed` };
    }

    case "activate_spell": {
      if (!action.cardId) return { success: false, description: "No spell specified" };

      const card = cardDataMap.get(action.cardId);
      if (!card || card.cardType !== "spell") {
        return { success: false, description: "Not a spell card" };
      }

      // Remove from hand
      stateChanges.opponentHand = stateChanges.opponentHand.filter((id) => id !== action.cardId);

      // Move to graveyard (spells go to GY after activation, except continuous/field)
      stateChanges.opponentGraveyard.push(action.cardId);

      // Execute spell effects based on card ability
      const ability = getCardAbility(card);
      if (!ability || ability.effects.length === 0) {
        return { success: true, description: `Activated spell: ${card.name} (no effect defined)` };
      }

      const effectResults: string[] = [];

      for (const effect of ability.effects) {
        // Only execute manual-trigger effects (spell activations)
        if (effect.trigger !== "manual") continue;

        switch (effect.type) {
          case "draw": {
            // AI draws cards
            const drawCount = effect.value || 1;
            for (let i = 0; i < drawCount && stateChanges.opponentDeck.length > 0; i++) {
              const drawnCard = stateChanges.opponentDeck.shift();
              if (drawnCard) {
                stateChanges.opponentHand.push(drawnCard);
              }
            }
            effectResults.push(`Drew ${drawCount} card(s)`);
            break;
          }

          case "destroy": {
            // Destroy target cards - AI targets opponent's (host's) monsters
            const targetCount = effect.targetCount || 1;
            const targetOwner = effect.targetLocation === "board" ? "opponent" : "self";

            if (targetOwner === "opponent" || effect.condition?.includes("opponent")) {
              // Destroy opponent's (host's) monsters
              let destroyed = 0;
              while (destroyed < targetCount && stateChanges.hostBoard.length > 0) {
                const target = stateChanges.hostBoard.shift();
                if (target) {
                  stateChanges.hostGraveyard.push(target.cardId);
                  destroyed++;
                }
              }
              if (destroyed > 0) {
                effectResults.push(`Destroyed ${destroyed} opponent monster(s)`);
              }
            } else {
              // Destroy all monsters (both sides) - for effects like "Dark Hole"
              const hostDestroyed = stateChanges.hostBoard.length;
              const oppDestroyed = stateChanges.opponentBoard.length;
              for (const m of stateChanges.hostBoard) {
                stateChanges.hostGraveyard.push(m.cardId);
              }
              for (const m of stateChanges.opponentBoard) {
                stateChanges.opponentGraveyard.push(m.cardId);
              }
              stateChanges.hostBoard = [];
              stateChanges.opponentBoard = [];
              effectResults.push(`Destroyed ${hostDestroyed + oppDestroyed} monster(s)`);
            }
            break;
          }

          case "damage": {
            // Deal damage to opponent (host)
            const damageAmount = effect.value || 0;
            stateChanges.hostLifePoints = Math.max(0, stateChanges.hostLifePoints - damageAmount);
            effectResults.push(`Dealt ${damageAmount} damage`);
            break;
          }

          case "gainLP": {
            // AI gains LP
            const healAmount = effect.value || 0;
            stateChanges.opponentLifePoints = stateChanges.opponentLifePoints + healAmount;
            effectResults.push(`Gained ${healAmount} LP`);
            break;
          }

          case "modifyATK": {
            // Modify ATK of monsters - typically targets AI's own monsters
            const atkMod = effect.value || 0;
            for (const monster of stateChanges.opponentBoard) {
              monster.attack = Math.max(0, monster.attack + atkMod);
            }
            effectResults.push(`Modified ATK by ${atkMod}`);
            break;
          }

          case "modifyDEF": {
            // Modify DEF of monsters
            const defMod = effect.value || 0;
            for (const monster of stateChanges.opponentBoard) {
              monster.defense = Math.max(0, monster.defense + defMod);
            }
            effectResults.push(`Modified DEF by ${defMod}`);
            break;
          }

          case "toHand": {
            // Return cards to hand - AI returns opponent's monsters
            if (stateChanges.hostBoard.length > 0) {
              const target = stateChanges.hostBoard.shift();
              if (target) {
                stateChanges.hostHand.push(target.cardId);
                effectResults.push(`Returned a monster to opponent's hand`);
              }
            }
            break;
          }

          case "toGraveyard": {
            // Send cards to graveyard (mill effect)
            const millCount = effect.value || 1;
            for (let i = 0; i < millCount && stateChanges.hostDeck.length > 0; i++) {
              const milled = stateChanges.hostDeck.shift();
              if (milled) {
                stateChanges.hostGraveyard.push(milled);
              }
            }
            effectResults.push(`Sent ${millCount} card(s) to opponent's graveyard`);
            break;
          }

          case "banish": {
            // Banish cards - target opponent's graveyard or board
            if (stateChanges.hostGraveyard.length > 0) {
              stateChanges.hostGraveyard.shift(); // Remove from GY (banished zone not tracked in state changes)
              effectResults.push(`Banished a card from opponent's graveyard`);
            }
            break;
          }

          default:
            // Effect type not implemented for AI yet
            effectResults.push(`Effect ${effect.type} activated`);
            break;
        }
      }

      const effectDesc = effectResults.length > 0 ? `: ${effectResults.join(", ")}` : "";
      return { success: true, description: `Activated ${card.name}${effectDesc}` };
    }

    case "end_phase":
    case "pass":
      return {
        success: true,
        description: action.type === "end_phase" ? "Ending phase" : "Passing",
      };

    default:
      return { success: false, description: "Unknown action type" };
  }
}

/**
 * Execute a complete AI turn
 *
 * Uses atomic state changes to avoid race conditions and integrates
 * the sophisticated AI decision engine.
 */
export const executeAITurn = mutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game not found",
        gameId: args.gameId,
      });
    }

    // Get lobby (for gameId/status only - turn state is in gameStates)
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: gameState.lobbyId,
      });
    }

    // Determine AI player
    const aiPlayerId = gameState.opponentId; // AI is always the opponent in story mode

    // Verify it's AI's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== aiPlayerId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not AI's turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        aiPlayerId,
      });
    }

    // Load all card data for decision making
    const allCards = await ctx.db.query("cardDefinitions").collect();
    const cardDataMap = new Map(allCards.map((c) => [c._id, c]));

    // Get AI difficulty from game state (defaults to medium)
    const difficulty = (gameState.aiDifficulty as "easy" | "medium" | "hard" | "boss") || "medium";

    // Initialize atomic state changes from current game state
    const stateChanges: StateChanges = {
      opponentBoard: [...gameState.opponentBoard],
      opponentHand: [...gameState.opponentHand],
      opponentGraveyard: [...gameState.opponentGraveyard],
      opponentDeck: [...gameState.opponentDeck],
      opponentLifePoints: gameState.opponentLifePoints,
      hostBoard: [...gameState.hostBoard],
      hostHand: [...gameState.hostHand],
      hostLifePoints: gameState.hostLifePoints,
      hostGraveyard: [...gameState.hostGraveyard],
      hostDeck: [...gameState.hostDeck],
      opponentNormalSummonedThisTurn: gameState.opponentNormalSummonedThisTurn || false,
    };

    const actionsLog: string[] = [];

    try {
      // MAIN PHASE 1: Make decisions until AI passes or has nothing to do
      let mainPhaseActions = 0;
      const maxMainPhaseActions = 5; // Prevent infinite loops

      while (mainPhaseActions < maxMainPhaseActions) {
        // Create a temporary game state view for AI decision making
        const tempState = {
          ...gameState,
          opponentBoard: stateChanges.opponentBoard,
          opponentHand: stateChanges.opponentHand,
          opponentGraveyard: stateChanges.opponentGraveyard,
          hostBoard: stateChanges.hostBoard,
          hostLifePoints: stateChanges.hostLifePoints,
          hostGraveyard: stateChanges.hostGraveyard,
          opponentNormalSummonedThisTurn: stateChanges.opponentNormalSummonedThisTurn,
        };

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "main1",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") {
          break;
        }

        const result = executeAction(decision, stateChanges, cardDataMap);
        if (result.success) {
          actionsLog.push(`[Main1] ${result.description}`);
          mainPhaseActions++;
        } else {
          break; // Failed action, move on
        }
      }

      // BATTLE PHASE: Attack decisions
      let battlePhaseActions = 0;
      const maxBattleActions = 5; // Max 5 monsters can attack

      while (battlePhaseActions < maxBattleActions) {
        const tempState = {
          ...gameState,
          opponentBoard: stateChanges.opponentBoard,
          opponentHand: stateChanges.opponentHand,
          hostBoard: stateChanges.hostBoard,
          hostLifePoints: stateChanges.hostLifePoints,
        };

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "battle",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") {
          break;
        }

        if (decision.type === "attack") {
          const result = executeAction(decision, stateChanges, cardDataMap);
          if (result.success) {
            actionsLog.push(`[Battle] ${result.description}`);
            battlePhaseActions++;
          } else {
            break;
          }
        } else {
          break; // Non-attack action in battle phase
        }
      }

      // MAIN PHASE 2: Set remaining cards if needed
      const tempState2 = {
        ...gameState,
        opponentBoard: stateChanges.opponentBoard,
        opponentHand: stateChanges.opponentHand,
        opponentNormalSummonedThisTurn: stateChanges.opponentNormalSummonedThisTurn,
      };

      const main2Decision = await makeAIDecision(
        tempState2 as Doc<"gameStates">,
        aiPlayerId,
        "main2",
        cardDataMap,
        difficulty
      );

      if (main2Decision.type === "set") {
        const result = executeAction(main2Decision, stateChanges, cardDataMap);
        if (result.success) {
          actionsLog.push(`[Main2] ${result.description}`);
        }
      }

      // ATOMIC UPDATE: Apply all state changes at once
      // Reset hasAttacked flags for next turn
      const resetBoard = stateChanges.opponentBoard.map((m) => ({
        ...m,
        hasAttacked: false,
      }));

      const newTurnNumber = (gameState.turnNumber || 1) + 1;

      await ctx.db.patch(gameState._id, {
        // Board changes
        opponentBoard: resetBoard,
        opponentHand: stateChanges.opponentHand,
        opponentGraveyard: stateChanges.opponentGraveyard,
        opponentDeck: stateChanges.opponentDeck,
        opponentLifePoints: stateChanges.opponentLifePoints,
        hostBoard: stateChanges.hostBoard,
        hostHand: stateChanges.hostHand,
        hostLifePoints: stateChanges.hostLifePoints,
        hostGraveyard: stateChanges.hostGraveyard,
        hostDeck: stateChanges.hostDeck,
        // Turn state
        opponentNormalSummonedThisTurn: false,
        hostNormalSummonedThisTurn: false,
        currentTurnPlayerId: gameState.hostId,
        turnNumber: newTurnNumber,
        currentPhase: "main1",
      });

      // Update lobby with lastMoveAt only (for timeout tracking)
      await ctx.db.patch(lobby._id, {
        lastMoveAt: Date.now(),
      });

      // Auto-draw for player's new turn (skip on turn 1)
      const shouldSkipDraw = newTurnNumber === 1;
      if (!shouldSkipDraw) {
        const refreshedState = await ctx.db.get(gameState._id);
        if (refreshedState) {
          console.log(
            `AI ended turn ${newTurnNumber - 1}, drawing card for player's turn ${newTurnNumber}`
          );
          await drawCards(ctx, refreshedState, gameState.hostId, 1);
        }
      }

      return {
        success: true,
        message: "AI turn executed successfully",
        actionsTaken: actionsLog.length,
        actions: actionsLog,
        difficulty,
      };
    } catch (error) {
      console.error("AI turn execution error:", error);
      throw createError(ErrorCode.GAME_AI_TURN_ERROR, {
        reason: "AI turn execution failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

/**
 * Execute AI turn (internal mutation for API key auth)
 *
 * Same as executeAITurn but as an internal mutation for HTTP actions.
 * Uses atomic state changes and integrates the AI decision engine.
 */
export const executeAITurnInternal = internalMutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game not found",
        gameId: args.gameId,
      });
    }

    // Get lobby (for gameId/status only - turn state is in gameStates)
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: gameState.lobbyId,
      });
    }

    // Determine AI player
    const aiPlayerId = gameState.opponentId; // AI is always the opponent in story mode

    // Verify it's AI's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== aiPlayerId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not AI's turn",
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        aiPlayerId,
      });
    }

    // Load all card data for decision making
    const allCards = await ctx.db.query("cardDefinitions").collect();
    const cardDataMap = new Map(allCards.map((c) => [c._id, c]));

    // Get AI difficulty from game state (defaults to medium)
    const difficulty = (gameState.aiDifficulty as "easy" | "medium" | "hard" | "boss") || "medium";

    // Initialize atomic state changes from current game state
    const stateChanges: StateChanges = {
      opponentBoard: [...gameState.opponentBoard],
      opponentHand: [...gameState.opponentHand],
      opponentGraveyard: [...gameState.opponentGraveyard],
      opponentDeck: [...gameState.opponentDeck],
      opponentLifePoints: gameState.opponentLifePoints,
      hostBoard: [...gameState.hostBoard],
      hostHand: [...gameState.hostHand],
      hostLifePoints: gameState.hostLifePoints,
      hostGraveyard: [...gameState.hostGraveyard],
      hostDeck: [...gameState.hostDeck],
      opponentNormalSummonedThisTurn: gameState.opponentNormalSummonedThisTurn || false,
    };

    const actionsLog: string[] = [];

    try {
      // MAIN PHASE 1: Make decisions until AI passes
      let mainPhaseActions = 0;
      const maxMainPhaseActions = 5;

      while (mainPhaseActions < maxMainPhaseActions) {
        const tempState = {
          ...gameState,
          opponentBoard: stateChanges.opponentBoard,
          opponentHand: stateChanges.opponentHand,
          opponentGraveyard: stateChanges.opponentGraveyard,
          hostBoard: stateChanges.hostBoard,
          hostLifePoints: stateChanges.hostLifePoints,
          hostGraveyard: stateChanges.hostGraveyard,
          opponentNormalSummonedThisTurn: stateChanges.opponentNormalSummonedThisTurn,
        };

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "main1",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") break;

        const result = executeAction(decision, stateChanges, cardDataMap);
        if (result.success) {
          actionsLog.push(`[Main1] ${result.description}`);
          mainPhaseActions++;
        } else {
          break;
        }
      }

      // BATTLE PHASE: Attack decisions
      let battlePhaseActions = 0;
      const maxBattleActions = 5;

      while (battlePhaseActions < maxBattleActions) {
        const tempState = {
          ...gameState,
          opponentBoard: stateChanges.opponentBoard,
          opponentHand: stateChanges.opponentHand,
          hostBoard: stateChanges.hostBoard,
          hostLifePoints: stateChanges.hostLifePoints,
        };

        const decision = await makeAIDecision(
          tempState as Doc<"gameStates">,
          aiPlayerId,
          "battle",
          cardDataMap,
          difficulty
        );

        if (decision.type === "pass" || decision.type === "end_phase") break;

        if (decision.type === "attack") {
          const result = executeAction(decision, stateChanges, cardDataMap);
          if (result.success) {
            actionsLog.push(`[Battle] ${result.description}`);
            battlePhaseActions++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // MAIN PHASE 2
      const tempState2 = {
        ...gameState,
        opponentBoard: stateChanges.opponentBoard,
        opponentHand: stateChanges.opponentHand,
        opponentNormalSummonedThisTurn: stateChanges.opponentNormalSummonedThisTurn,
      };

      const main2Decision = await makeAIDecision(
        tempState2 as Doc<"gameStates">,
        aiPlayerId,
        "main2",
        cardDataMap,
        difficulty
      );

      if (main2Decision.type === "set") {
        const result = executeAction(main2Decision, stateChanges, cardDataMap);
        if (result.success) {
          actionsLog.push(`[Main2] ${result.description}`);
        }
      }

      // ATOMIC UPDATE: Apply all state changes at once
      const resetBoard = stateChanges.opponentBoard.map((m) => ({
        ...m,
        hasAttacked: false,
      }));

      const newTurnNumber = (gameState.turnNumber || 1) + 1;

      await ctx.db.patch(gameState._id, {
        opponentBoard: resetBoard,
        opponentHand: stateChanges.opponentHand,
        opponentGraveyard: stateChanges.opponentGraveyard,
        opponentDeck: stateChanges.opponentDeck,
        opponentLifePoints: stateChanges.opponentLifePoints,
        hostBoard: stateChanges.hostBoard,
        hostHand: stateChanges.hostHand,
        hostLifePoints: stateChanges.hostLifePoints,
        hostGraveyard: stateChanges.hostGraveyard,
        hostDeck: stateChanges.hostDeck,
        opponentNormalSummonedThisTurn: false,
        hostNormalSummonedThisTurn: false,
        currentTurnPlayerId: gameState.hostId,
        turnNumber: newTurnNumber,
        currentPhase: "main1",
      });

      await ctx.db.patch(lobby._id, {
        lastMoveAt: Date.now(),
      });

      // Auto-draw for player's new turn
      const shouldSkipDraw = newTurnNumber === 1;
      if (!shouldSkipDraw) {
        const refreshedState = await ctx.db.get(gameState._id);
        if (refreshedState) {
          await drawCards(ctx, refreshedState, gameState.hostId, 1);
        }
      }

      return {
        success: true,
        message: "AI turn executed successfully",
        actionsTaken: actionsLog.length,
        actions: actionsLog,
        difficulty,
      };
    } catch (error) {
      console.error("AI turn execution error:", error);
      throw createError(ErrorCode.GAME_AI_TURN_ERROR, {
        reason: "AI turn execution failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
