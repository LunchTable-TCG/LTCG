/**
 * Effect System Executor Tests
 *
 * Tests all effect executors and the main executeEffect dispatcher.
 * Covers happy paths, error cases, and edge conditions.
 */

import type { Id } from "../../../convex/_generated/dataModel";
import type { JsonAbility } from "../../../convex/gameplay/effectSystem/types";
import { executeEffect, executeMultiPartAbility } from "../../../convex/gameplay/effectSystem/executor";
import schema from "../../../schema";
import { modules } from "../../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

describe("executeEffect - Main Dispatcher", () => {
  it("should execute draw effect", async () => {
    const t = convexTest(schema, modules);

    // Create test user first
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "effecttest",
        email: "effect@test.com",
        createdAt: Date.now(),
      });
    });

    // Create some dummy cards for the deck
    const card1 = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card 1",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const card2 = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card 2",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Create game lobby
    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "effecttest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId, // Self-play for testing
        opponentUsername: "effecttest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    // Create game state with cards in deck
    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-1",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [card1, card2], // Add cards to deck for draw test
        opponentDeck: [],
        hostHand: [],
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

    // Execute effect using internal function
    const result = await t.run(async (ctx) => {
      const gameState = await ctx.db.get(gameStateId);
      if (!gameState) throw new Error("Game state not found");

      return await executeEffect(
        ctx,
        gameState,
        lobbyId,
        { type: "draw", trigger: "manual", value: 2 },
        userId,
        "card123" as Id<"cardDefinitions">,
        []
      );
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Drew 2 card");
  });

  it("should handle OPT restriction", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "opttest",
        email: "opt@test.com",
        createdAt: Date.now(),
      });
    });

    const optAbility: JsonAbility = {
      effects: [{ type: "draw", trigger: "manual", value: 1, isOPT: true }],
    };

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "OPT Card",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        ability: optAbility,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "opttest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "opttest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-2",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostSpellTrapZone: [],
        opponentSpellTrapZone: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        optUsedThisTurn: [
          {
            cardId: cardId,
            effectIndex: 0,
            playerId: userId,
            turnUsed: 1,
          },
        ], // Card already used
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
        { type: "draw", trigger: "manual", value: 1, isOPT: true },
        userId,
        cardId,
        []
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("once per turn");
  });

  it("should check targeting protection", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "targettest",
        email: "target@test.com",
        createdAt: Date.now(),
      });
    });

    const protectedAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: { cannotBeTargeted: true },
        },
      ],
    };

    const protectedCardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Protected Monster",
        rarity: "rare",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 5,
        attack: 2000,
        defense: 1500,
        ability: protectedAbility,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const attackerCardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Attacker",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 4,
        attack: 1800,
        defense: 1000,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "targettest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "targettest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-3",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "combat",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [
          {
            cardId: attackerCardId,
            position: 1,
            attack: 1800,
            defense: 1000,
            hasAttacked: false,
            isFaceDown: false,
            cannotBeTargeted: false,
          },
        ],
        opponentBoard: [
          {
            cardId: protectedCardId,
            position: 1,
            attack: 2000,
            defense: 1500,
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
      const gameState = await ctx.db.get(gameStateId);
      if (!gameState) throw new Error("Game state not found");

      return await executeEffect(
        ctx,
        gameState,
        lobbyId,
        { type: "destroy", trigger: "manual", targetCount: 1 },
        userId,
        attackerCardId,
        [protectedCardId] // Try to target protected card
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("cannot be targeted");
  });

  it("should reject effect with no targets when targets required", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "notargettest",
        email: "notarget@test.com",
        createdAt: Date.now(),
      });
    });

    const destroyAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: {
            count: 1,
            location: "board",
            owner: "opponent",
            condition: { cardType: "monster" },
          },
        },
      ],
    };

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Destroy Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 2,
        ability: destroyAbility,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "notargettest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "notargettest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-4",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
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
        { type: "destroy", trigger: "manual", targetCount: 1 },
        userId,
        cardId,
        [] // No targets provided
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("No targets selected");
  });

  it("should handle unknown effect type", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "unknowntest",
        email: "unknown@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Unknown Card",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "unknowntest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "unknowntest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-5",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
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
        // biome-ignore lint/suspicious/noExplicitAny: Testing unknown effect type handling
        { type: "unknownEffect" as any, trigger: "manual" },
        userId,
        cardId,
        []
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown effect type");
  });
});

describe("executeMultiPartAbility", () => {
  it("should execute multiple effects in sequence", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "multitest",
        email: "multi@test.com",
        createdAt: Date.now(),
      });
    });

    const multiEffectAbility: JsonAbility = {
      effects: [
        { type: "draw", trigger: "manual", value: 2 },
        { type: "damage", trigger: "manual", value: 500 },
      ],
    };

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Multi-Effect Card",
        rarity: "rare",
        cardType: "spell",
        archetype: "neutral",
        cost: 3,
        ability: multiEffectAbility,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Create dummy cards for the deck
    const dummyCard1 = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Dummy Card 1",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const dummyCard2 = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Dummy Card 2",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "multitest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "multitest",
        opponentRank: "Bronze",
        gameId: "test-game-6",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-6",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [dummyCard1, dummyCard2], // Add cards for draw effect
        opponentDeck: [],
        hostHand: [],
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

      const parsedAbility = {
        hasMultiPart: true,
        effects: [
          { type: "draw" as const, trigger: "manual" as const, value: 2 },
          { type: "damage" as const, trigger: "manual" as const, value: 500 },
        ],
      };

      return await executeMultiPartAbility(
        ctx,
        gameState,
        lobbyId,
        parsedAbility,
        userId,
        cardId,
        []
      );
    });

    expect(result.success).toBe(true);
    expect(result.effectsExecuted).toBe(2);
    expect(result.messages).toHaveLength(2);
  });

  it("should skip protection-only effects", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "protectiontest",
        email: "protection@test.com",
        createdAt: Date.now(),
      });
    });

    const protectedAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: { cannotBeDestroyedByBattle: true },
        },
      ],
    };

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Protected Card",
        rarity: "rare",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 5,
        attack: 2500,
        defense: 2000,
        ability: protectedAbility,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "protectiontest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "protectiontest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-7",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
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

      const parsedAbility = {
        hasMultiPart: false,
        effects: [
          {
            type: "modifyATK" as const,
            trigger: "manual" as const,
            value: 0,
            protection: { cannotBeDestroyedByBattle: true },
          },
        ],
      };

      return await executeMultiPartAbility(
        ctx,
        gameState,
        lobbyId,
        parsedAbility,
        userId,
        cardId,
        []
      );
    });

    // Protection effects are passive, so no effects should be executed
    expect(result.effectsExecuted).toBe(0);
    expect(result.success).toBe(false); // No effects succeeded
  });

  it("should handle empty ability", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "emptytest",
        email: "empty@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Vanilla Card",
        rarity: "common",
        cardType: "stereotype",
        archetype: "neutral",
        cost: 3,
        attack: 1500,
        defense: 1200,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "emptytest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "emptytest",
        opponentRank: "Bronze",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-8",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostClout: 0,
        opponentClout: 0,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
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

      const parsedAbility = {
        hasMultiPart: false,
        effects: [],
      };

      return await executeMultiPartAbility(
        ctx,
        gameState,
        lobbyId,
        parsedAbility,
        userId,
        cardId,
        []
      );
    });

    expect(result.effectsExecuted).toBe(0);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBe("No effects to execute");
  });
});
