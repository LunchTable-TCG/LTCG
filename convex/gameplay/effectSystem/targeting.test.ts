/**
 * Targeting Integration Tests
 *
 * Tests targeting mechanics and restrictions:
 * - Valid targeting
 * - Invalid targeting (protection)
 * - Target count validation
 * - Zone restrictions
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import type { JsonAbility } from "./types";
import { modules } from "../../test.setup";

describe("Targeting System", () => {
  describe("Valid Targeting", () => {
    it("should successfully target valid monster on board", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const destroySpellId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Destroy Spell",
          rarity: "common",
          cardType: "spell",
          archetype: "neutral",
          cost: 2,
          ability: {
            effects: [
              {
                type: "destroy",
                trigger: "manual",
                targetLocation: "board",
                targetCount: 1,
              },
            ],
            spellSpeed: 1,
          } as JsonAbility,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const targetMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Target Monster",
          rarity: "common",
          cardType: "creature",
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
          deckArchetype: "neutral",
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
          gameId: "valid-target-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main1",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostMana: 5,
          opponentMana: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [destroySpellId],
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
              cannotBeTargeted: false,
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
        const { executeEffect } = await import("./executor");
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          {
            type: "destroy",
            trigger: "manual",
            targetLocation: "board",
            targetCount: 1,
          },
          userId,
          destroySpellId,
          [targetMonsterId]
        );
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Invalid Targeting - Protection", () => {
    it("should reject targeting card with cannot be targeted protection", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const destroySpellId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Destroy Spell",
          rarity: "common",
          cardType: "spell",
          archetype: "neutral",
          cost: 2,
          ability: {
            effects: [
              {
                type: "destroy",
                trigger: "manual",
                targetLocation: "board",
                targetCount: 1,
              },
            ],
            spellSpeed: 1,
          } as JsonAbility,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const protectedMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Protected Monster",
          rarity: "rare",
          cardType: "creature",
          archetype: "neutral",
          cost: 5,
          attack: 2000,
          defense: 1800,
          ability: {
            effects: [
              {
                type: "modifyATK",
                trigger: "manual",
                value: 0,
                isContinuous: true,
                protection: { cannotBeTargeted: true },
              },
            ],
            spellSpeed: 1,
          } as JsonAbility,
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
          deckArchetype: "neutral",
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
          gameId: "protected-target-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main1",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostMana: 5,
          opponentMana: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [destroySpellId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [
            {
              cardId: protectedMonsterId,
              position: 1,
              attack: 2000,
              defense: 1800,
              hasAttacked: false,
              isFaceDown: false,
              cannotBeTargeted: true, // Protected
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
        const { executeEffect } = await import("./executor");
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          {
            type: "destroy",
            trigger: "manual",
            targetLocation: "board",
            targetCount: 1,
          },
          userId,
          destroySpellId,
          [protectedMonsterId]
        );
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("cannot be targeted");
    });
  });

  describe("Target Count Validation", () => {
    it("should accept exact target count", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const dualDestroyId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Dual Destroy",
          rarity: "rare",
          cardType: "spell",
          archetype: "neutral",
          cost: 3,
          ability: {
            effects: [
              {
                type: "destroy",
                trigger: "manual",
                targetLocation: "board",
                targetCount: 2, // Requires exactly 2 targets
              },
            ],
            spellSpeed: 1,
          } as JsonAbility,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const monster1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Monster 1",
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const monster2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Monster 2",
          rarity: "common",
          cardType: "creature",
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
          deckArchetype: "neutral",
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
          gameId: "dual-target-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main1",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostMana: 5,
          opponentMana: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [dualDestroyId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [
            {
              cardId: monster1Id,
              position: 1,
              attack: 1500,
              defense: 1200,
              hasAttacked: false,
              isFaceDown: false,
            },
            {
              cardId: monster2Id,
              position: 1,
              attack: 1600,
              defense: 1100,
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

      // Test with 2 targets (correct)
      const resultCorrect = await t.run(async (ctx) => {
        const { executeEffect } = await import("./executor");
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          {
            type: "destroy",
            trigger: "manual",
            targetLocation: "board",
            targetCount: 2,
          },
          userId,
          dualDestroyId,
          [monster1Id, monster2Id]
        );
      });

      expect(resultCorrect.success).toBe(true);
    });

    it("should reject wrong target count (too few)", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      const dualDestroyId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Dual Destroy",
          rarity: "rare",
          cardType: "spell",
          archetype: "neutral",
          cost: 3,
          ability: {
            effects: [
              {
                type: "destroy",
                trigger: "manual",
                targetLocation: "board",
                targetCount: 2,
              },
            ],
            spellSpeed: 1,
          } as JsonAbility,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const monster1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Monster 1",
          rarity: "common",
          cardType: "creature",
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
          deckArchetype: "neutral",
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
          gameId: "wrong-count-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main1",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostMana: 5,
          opponentMana: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [dualDestroyId],
          opponentHand: [],
          hostBoard: [],
          opponentBoard: [
            {
              cardId: monster1Id,
              position: 1,
              attack: 1500,
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

      // Test with only 1 target (incorrect - needs 2)
      const resultWrong = await t.run(async (ctx) => {
        const { executeEffect } = await import("./executor");
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          {
            type: "destroy",
            trigger: "manual",
            targetLocation: "board",
            targetCount: 2,
          },
          userId,
          dualDestroyId,
          [monster1Id] // Only 1 target
        );
      });

      expect(resultWrong.success).toBe(false);
    });
  });

  describe("Zone Restrictions", () => {
    it("should reject targeting card in wrong zone", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          username: "player1",
          email: "player1@test.com",
          createdAt: Date.now(),
        });
      });

      // Effect that targets graveyard
      const reanimateId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Reanimate",
          rarity: "rare",
          cardType: "spell",
          archetype: "neutral",
          cost: 3,
          ability: {
            effects: [
              {
                type: "summon",
                trigger: "manual",
                targetLocation: "graveyard", // Graveyard only
              },
            ],
            spellSpeed: 1,
          } as JsonAbility,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const boardMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Board Monster",
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 4,
          attack: 1800,
          defense: 1200,
          isActive: true,
          createdAt: Date.now(),
        });
      });

      const graveyardMonsterId = await t.run(async (ctx) => {
        return await ctx.db.insert("cardDefinitions", {
          name: "Graveyard Monster",
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1500,
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
          deckArchetype: "neutral",
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
          gameId: "zone-restriction-test",
          hostId: userId,
          opponentId: userId,
          currentTurnPlayerId: userId,
          currentPhase: "main1",
          turnNumber: 1,
          hostLifePoints: 8000,
          opponentLifePoints: 8000,
          hostMana: 5,
          opponentMana: 0,
          hostDeck: [],
          opponentDeck: [],
          hostHand: [reanimateId],
          opponentHand: [],
          hostBoard: [
            {
              cardId: boardMonsterId,
              position: 1,
              attack: 1800,
              defense: 1200,
              hasAttacked: false,
              isFaceDown: false,
            },
          ],
          opponentBoard: [],
          hostSpellTrapZone: [],
          opponentSpellTrapZone: [],
          hostGraveyard: [graveyardMonsterId],
          opponentGraveyard: [],
          hostBanished: [],
          opponentBanished: [],
          lastMoveAt: Date.now(),
          createdAt: Date.now(),
        });
      });

      // Try to target board monster (wrong zone)
      const resultWrongZone = await t.run(async (ctx) => {
        const { executeEffect } = await import("./executor");
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          {
            type: "summon",
            trigger: "manual",
            targetLocation: "graveyard",
          },
          userId,
          reanimateId,
          [boardMonsterId] // Wrong zone
        );
      });

      expect(resultWrongZone.success).toBe(false);

      // Try with correct zone (graveyard)
      const resultCorrectZone = await t.run(async (ctx) => {
        const { executeEffect } = await import("./executor");
        const gameState = await ctx.db.get(gameStateId);
        if (!gameState) throw new Error("Game state not found");

        return await executeEffect(
          ctx,
          gameState,
          lobbyId,
          {
            type: "summon",
            trigger: "manual",
            targetLocation: "graveyard",
          },
          userId,
          reanimateId,
          [graveyardMonsterId] // Correct zone
        );
      });

      expect(resultCorrectZone.success).toBe(true);
    });
  });
});
