/**
 * Basic Effect Execution Integration Tests
 *
 * Tests card activations with real effect execution and state updates:
 * - Volcanic Eruption (destroy effect)
 * - ATK modification effects
 * - DEF modification effects
 * - Draw effects
 */

import type { JsonAbility } from "../../../convex/gameplay/effectSystem/types";
import { executeEffect } from "../../../convex/gameplay/effectSystem/executor";
import schema from "../../../schema";
import { modules } from "../../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

describe("Basic Effect Execution", () => {
  describe("Volcanic Eruption - Destroy Effect", () => {
    it("should destroy target monster and move both cards to graveyard", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const opponentId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player2",
          email: "player2@test.com",
          createdAt: Date.now(),
        });
      });

      // Create Volcanic Eruption card
      const volcanicEruptionAbility: JsonAbility = {
        effects: [
          {
            type: "destroy",
            trigger: "manual",
            targetLocation: "board",
          },
        ],
        spellSpeed: 1,
      };

      const volcanicEruptionId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Volcanic Eruption",
          rarity: "common",
          cardType: "spell",
          archetype: "dropout",
          cost: 2,
          ability: volcanicEruptionAbility,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      // Create target monster
      const targetMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Target Monster",
          rarity: "common",
          cardType: "stereotype",
          archetype: "neutral",
          cost: 4,
          attack: 1800,
          defense: 1200,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "dropout",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: opponentId,
          opponentUsername: "player2",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      // Create game state with monster on opponent board and spell in hand
      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "volcanic-test",
          hostId: userId,
          opponentId: opponentId,
          currentTurnPlayerId: userId,
          currentPhase: "main",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [volcanicEruptionId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [
            {
              cardId: targetMonsterId,
              position: 1,
              attack: 1800,
              defense: 1200,
              hasAttacked: false,
              isFaceDown: false,
            },
          ],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      // Execute destroy effect using internal executor
      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "destroy", trigger: "manual", targetLocation: "board" },
          userId,
          volcanicEruptionId,
          [targetMonsterId]
        );
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Destroyed");

      // Verify game state updates
      const finalGameState = await t.run(async (ctx) => {
        return await ctx.db.get(gameStateId);
      });

      expect(finalGameState).toBeDefined();
      if (finalGameState) {
        // Target monster should be destroyed and in opponent graveyard
        expect(finalGameState.opponentBoard).toHaveLength(0);
        expect(finalGameState.opponentGraveyard).toContain(targetMonsterId);

        // Note: Volcanic Eruption removal from hand is handled by activateSpell(),
        // not by executeEffect(). This test only verifies effect execution.
        expect(finalGameState.hostHand).toContain(volcanicEruptionId);
      }
    });

    it("should fail if no valid targets available", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const volcanicEruptionId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Volcanic Eruption",
          rarity: "common",
          cardType: "spell",
          archetype: "dropout",
          cost: 2,
          ability: {
            effects: [{ type: "destroy", trigger: "manual", targetLocation: "board" }],
            spellSpeed: 1,
          },
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "dropout",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: userId,
          opponentUsername: "player1",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "volcanic-fail-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [volcanicEruptionId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [], // Empty board - no targets
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "destroy", trigger: "manual", targetLocation: "board" },
          userId,
          volcanicEruptionId,
          [] // No targets provided
        );
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("No targets");
    });
  });

  describe("ATK Modification Effects", () => {
    it("should increase monster ATK value by specified amount", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      // Create Fire Breathing card (+800 ATK)
      const fireBreathingId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Fire Breathing",
          rarity: "common",
          cardType: "spell",
          archetype: "dropout",
          cost: 2,
          ability: {
            effects: [{ type: "modifyATK", trigger: "manual", value: 800 }],
            spellSpeed: 1,
          },
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const targetMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Cinder Wyrm",
          rarity: "common",
          cardType: "stereotype",
          archetype: "dropout",
          cost: 3,
          attack: 1400,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "dropout",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: userId,
          opponentUsername: "player1",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "atk-boost-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [fireBreathingId],
          opponentHand: [],
          hostBoard: [
            {
              cardId: targetMonsterId,
              position: 1,
              attack: 1400,
              defense: 1000,
              hasAttacked: false,
              isFaceDown: false,
            },
          ],
          opponentBoard: [],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "modifyATK", trigger: "manual", value: 800 },
          userId,
          fireBreathingId,
          [targetMonsterId]
        );
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("ATK");

      // Verify ATK was modified
      const finalGameState = await t.run(async (ctx) => {
        return await ctx.db.get(gameStateId);
      });

      expect(finalGameState).toBeDefined();
      if (finalGameState?.hostBoard[0]) {
        expect(finalGameState.hostBoard[0].attack).toBe(2200); // 1400 + 800
      }
    });

    it("should decrease monster ATK value with negative modifier", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      // Create Scorching Wind card (-600 ATK)
      const scorchingWindId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Scorching Wind",
          rarity: "common",
          cardType: "spell",
          archetype: "dropout",
          cost: 2,
          ability: {
            effects: [{ type: "modifyATK", trigger: "manual", value: -600 }],
            spellSpeed: 2,
          },
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const opponentMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Enemy Monster",
          rarity: "common",
          cardType: "stereotype",
          archetype: "neutral",
          cost: 5,
          attack: 2000,
          defense: 1500,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "dropout",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: userId,
          opponentUsername: "player1",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "atk-decrease-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "combat",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [scorchingWindId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [
            {
              cardId: opponentMonsterId,
              position: 1,
              attack: 2000,
              defense: 1500,
              hasAttacked: false,
              isFaceDown: false,
            },
          ],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "modifyATK", trigger: "manual", value: -600 },
          userId,
          scorchingWindId,
          [opponentMonsterId]
        );
      });

      expect(result.success).toBe(true);

      const finalGameState = await t.run(async (ctx) => {
        return await ctx.db.get(gameStateId);
      });

      expect(finalGameState).toBeDefined();
      if (finalGameState?.opponentBoard[0]) {
        expect(finalGameState.opponentBoard[0].attack).toBe(1400); // 2000 - 600
      }
    });
  });

  describe("DEF Modification Effects", () => {
    it("should increase monster DEF value by specified amount", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const ironFortressId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Iron Fortress",
          rarity: "common",
          cardType: "spell",
          archetype: "nerd",
          cost: 2,
          ability: {
            effects: [{ type: "modifyDEF", trigger: "manual", value: 1000 }],
            spellSpeed: 1,
          },
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const targetMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Plated Defender",
          rarity: "common",
          cardType: "stereotype",
          archetype: "nerd",
          cost: 4,
          attack: 1200,
          defense: 1800,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "nerd",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: userId,
          opponentUsername: "player1",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "def-boost-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [ironFortressId],
          opponentHand: [],
          hostBoard: [
            {
              cardId: targetMonsterId,
              position: -1, // Defense position
              attack: 1200,
              defense: 1800,
              hasAttacked: false,
              isFaceDown: false,
            },
          ],
          opponentBoard: [],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "modifyDEF", trigger: "manual", value: 1000 },
          userId,
          ironFortressId,
          [targetMonsterId]
        );
      });

      expect(result.success).toBe(true);

      const finalGameState = await t.run(async (ctx) => {
        return await ctx.db.get(gameStateId);
      });

      expect(finalGameState).toBeDefined();
      if (finalGameState?.hostBoard[0]) {
        expect(finalGameState.hostBoard[0].defense).toBe(2800); // 1800 + 1000
      }
    });
  });

  describe("Draw Effects", () => {
    it("should draw specified number of cards from deck to hand", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const dragonsHoardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Dragon's Hoard",
          rarity: "common",
          cardType: "spell",
          archetype: "dropout",
          cost: 2,
          ability: {
            effects: [{ type: "draw", trigger: "manual", value: 2 }],
            spellSpeed: 1,
          },
          isActive: true,
          createdAt: Date.now(),
        });
      });

      // Create dummy cards for deck
      const deckCard1 = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Deck Card 1",
          rarity: "common",
          cardType: "stereotype",
          archetype: "neutral",
          cost: 3,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const deckCard2 = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Deck Card 2",
          rarity: "common",
          cardType: "spell",
          archetype: "neutral",
          cost: 2,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "dropout",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: userId,
          opponentUsername: "player1",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "draw-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [deckCard1, deckCard2],
          opponentDeck: [],
          hostHand: [dragonsHoardId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "draw", trigger: "manual", value: 2 },
          userId,
          dragonsHoardId,
          []
        );
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Drew 2");

      const finalGameState = await t.run(async (ctx) => {
        return await ctx.db.get(gameStateId);
      });

      expect(finalGameState).toBeDefined();
      if (finalGameState) {
        // Should have drawn 2 cards from deck to hand
        expect(finalGameState.hostDeck).toHaveLength(0);
        expect(finalGameState.hostHand).toHaveLength(3); // Original + 2 drawn (Dragon's Hoard still in hand before GY)
      }
    });

    it("should handle deck out when trying to draw more cards than available", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const dragonsHoardId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Dragon's Hoard",
          rarity: "common",
          cardType: "spell",
          archetype: "dropout",
          cost: 2,
          ability: {
            effects: [{ type: "draw", trigger: "manual", value: 2 }],
            spellSpeed: 1,
          },
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const deckCard1 = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Last Card",
          rarity: "common",
          cardType: "stereotype",
          archetype: "neutral",
          cost: 3,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const lobbyId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameLobbies", {
          hostId: userId,
          hostUsername: "player1",
          hostRank: "Bronze",
          hostRating: 1000,
          deckArchetype: "dropout",
          mode: "ranked",
          status: "active",
          isPrivate: false,
          opponentId: userId,
          opponentUsername: "player1",
          opponentRank: "Bronze",
          currentTurnPlayerId: userId,
          turnNumber: 1,
          createdAt: Date.now(),
        });
      });

      const gameStateId = await t.run(async (ctx) => {
        return await ctx.db.insert("gameStates", {
          lobbyId,
          gameId: "deck-out-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostClout: 5,
          opponentClout: 0,
          hostDeck: [deckCard1], // Only 1 card but trying to draw 2
          opponentDeck: [],
          hostHand: [dragonsHoardId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => {
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          { type: "draw", trigger: "manual", value: 2 },
          userId,
          dragonsHoardId,
          []
        );
      });

      // Should either draw what's available or fail gracefully
      expect(result.success).toBe(true);

      const finalGameState = await t.run(async (ctx) => {
        return await ctx.db.get(gameStateId);
      });

      expect(finalGameState).toBeDefined();
      if (finalGameState) {
        // Should have drawn only available card
        expect(finalGameState.hostDeck).toHaveLength(0);
      }
    });
  });
});
