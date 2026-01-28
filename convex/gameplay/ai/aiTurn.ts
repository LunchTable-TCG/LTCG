/**
 * AI Turn Automation
 *
 * Executes a full AI turn automatically by directly updating game state.
 * Simplified to avoid mutation-calling-mutation issues.
 */

import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { createError, ErrorCode } from "../../lib/errorCodes";
import { drawCards } from "../../lib/gameHelpers";
import { makeAIDecision } from "./aiEngine";

/**
 * Execute a complete AI turn
 *
 * This is a simplified version that directly updates game state
 * instead of calling other mutations.
 */
export const executeAITurn = mutation({
  args: {
    gameId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch game state
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

    // Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY, {
        reason: "Lobby not found",
        lobbyId: gameState.lobbyId,
      });
    }

    // Determine AI player
    const aiPlayerId = gameState.opponentId; // AI is always the opponent in story mode

    // Verify it's AI's turn
    if (lobby.currentTurnPlayerId !== aiPlayerId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
        reason: "Not AI's turn",
        currentTurnPlayerId: lobby.currentTurnPlayerId,
        aiPlayerId,
      });
    }

    // Load all card data for decision making
    const allCards = await ctx.db.query("cardDefinitions").collect();
    const cardDataMap = new Map(allCards.map((c) => [c._id, c]));

    // Simple AI turn execution:
    // 1. Skip draw/standby phases (auto-advance)
    // 2. Main Phase 1: Try to summon one monster
    // 3. Battle Phase: Attack with all available monsters
    // 4. Main Phase 2: Set any remaining cards
    // 5. End turn

    let actionsTaken = 0;

    try {
      // MAIN PHASE 1: Try to summon strongest monster
      const aiHand = gameState.opponentHand;
      const aiBoard = gameState.opponentBoard;

      if (aiBoard.length < 5 && aiHand.length > 0) {
        // Find summonable monsters (cost <= 4)
        const summonableMonsters = aiHand.filter((cardId) => {
          const card = cardDataMap.get(cardId);
          return card && card.cardType === "creature" && (card.cost || 0) <= 4;
        });

        if (summonableMonsters.length > 0) {
          // Pick strongest
          let strongest: Id<"cardDefinitions"> | undefined = summonableMonsters[0];
          let maxPower = 0;

          for (const cardId of summonableMonsters) {
            const card = cardDataMap.get(cardId);
            if (card) {
              const power = (card.attack || 0) + (card.defense || 0);
              if (power > maxPower) {
                maxPower = power;
                strongest = cardId;
              }
            }
          }

          if (strongest) {
            const cardToSummon = cardDataMap.get(strongest);
            if (cardToSummon) {
              // Add to board
              await ctx.db.patch(gameState._id, {
                opponentBoard: [
                  ...aiBoard,
                  {
                    cardId: strongest,
                    position: 1, // Attack position
                    attack: cardToSummon.attack || 0,
                    defense: cardToSummon.defense || 0,
                    isFaceDown: false,
                    hasAttacked: false,
                  },
                ],
                opponentHand: aiHand.filter((id) => id !== strongest),
                opponentNormalSummonedThisTurn: true,
              });
              actionsTaken++;
            }
          }
        }
      }

      // BATTLE PHASE: Attack with all monsters
      const updatedState = await ctx.db.get(gameState._id);
      if (updatedState) {
        const aiMonstersOnBoard = updatedState.opponentBoard;
        const playerBoard = updatedState.hostBoard;
        let currentPlayerLP = updatedState.hostLifePoints;

        for (const monster of aiMonstersOnBoard) {
          if (monster.hasAttacked || monster.position !== 1) continue;

          // Direct attack if no opponent monsters
          if (playerBoard.length === 0) {
            currentPlayerLP -= monster.attack;
            monster.hasAttacked = true;
            actionsTaken++;
          } else {
            // Attack first opponent monster
            const target = playerBoard[0];
            if (!target) continue;

            if (monster.attack > target.attack) {
              // Destroy opponent monster
              const newPlayerBoard = playerBoard.filter((m) => m.cardId !== target.cardId);
              const damage = monster.attack - target.attack;
              currentPlayerLP -= damage;
              monster.hasAttacked = true;

              await ctx.db.patch(updatedState._id, {
                hostBoard: newPlayerBoard,
                hostLifePoints: currentPlayerLP,
                opponentBoard: updatedState.opponentBoard.map((m) =>
                  m.cardId === monster.cardId ? { ...m, hasAttacked: true } : m
                ),
              });
              actionsTaken++;
            }
          }
        }

        // Update LP if direct attacks occurred
        if (currentPlayerLP !== updatedState.hostLifePoints) {
          await ctx.db.patch(updatedState._id, {
            hostLifePoints: Math.max(0, currentPlayerLP),
          });
        }
      }

      // END TURN: Reset for next turn
      const finalState = await ctx.db.get(gameState._id);
      if (finalState) {
        // Reset attacked flags and switch turns
        const resetBoard = finalState.opponentBoard.map((m) => ({
          ...m,
          hasAttacked: false,
        }));

        await ctx.db.patch(finalState._id, {
          opponentBoard: resetBoard,
          opponentNormalSummonedThisTurn: false,
        });

        // Switch turn back to player
        const newTurnNumber = (lobby.turnNumber || 1) + 1;
        await ctx.db.patch(lobby._id, {
          currentTurnPlayerId: finalState.hostId,
          turnNumber: newTurnNumber,
          lastMoveAt: Date.now(),
        });

        // Refresh game state after turn switch
        const refreshedState = await ctx.db.get(finalState._id);
        if (refreshedState) {
          // Auto-draw for player's new turn (skip on turn 1)
          const shouldSkipDraw = newTurnNumber === 1 && finalState.hostId === lobby.hostId;
          if (!shouldSkipDraw) {
            console.log(
              `AI ended turn ${newTurnNumber - 1}, drawing card for player's turn ${newTurnNumber}`
            );
            await drawCards(ctx, refreshedState, finalState.hostId, 1);
          }

          // Set phase to Main Phase 1 (not draw phase)
          await ctx.db.patch(refreshedState._id, {
            currentPhase: "main1",
          });
        }
      }

      return {
        success: true,
        message: "AI turn executed successfully",
        actionsTaken,
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
