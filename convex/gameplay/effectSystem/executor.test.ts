/**
 * Effect System Executor Tests
 *
 * Tests all effect executors and the main executeEffect dispatcher.
 * Covers happy paths, error cases, and edge conditions.
 */

import { describe, expect, it } from "vitest";
import { createTestInstance } from "../../../convex_test_utils/setup";
import type { Id } from "../../_generated/dataModel";

describe("executeEffect - Main Dispatcher", () => {
  it("should execute draw effect", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "effecttest",
        email: "effect@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId, // Self-play for testing
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
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
        { type: "draw", value: 2 },
        userId,
        "card123" as Id<"cardDefinitions">,
        []
      );
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Drew 2 card");
  });

  it("should handle OPT restriction", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "opttest",
        email: "opt@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "OPT Card",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        ability: "Draw 1 card",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        OPTUsed: [cardId], // Card already used
        isActive: true,
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
        { type: "draw", value: 1, isOPT: true },
        userId,
        cardId,
        []
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("once per turn");
  });

  it("should check targeting protection", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "targettest",
        email: "target@test.com",
        createdAt: Date.now(),
      });
    });

    const protectedCardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Protected Monster",
        rarity: "rare",
        cardType: "creature",
        archetype: "neutral",
        cost: 5,
        attack: 2000,
        defense: 1500,
        ability: "Cannot be targeted",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const attackerCardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Attacker",
        rarity: "common",
        cardType: "creature",
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
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "battle",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [
          {
            cardId: attackerCardId,
            position: "attack",
            isFaceUp: true,
            hasAttackedThisTurn: false,
            cannotBeTargeted: false,
          },
        ],
        opponentBoard: [
          {
            cardId: protectedCardId,
            position: "attack",
            isFaceUp: true,
            hasAttackedThisTurn: false,
            cannotBeTargeted: true, // Protected
          },
        ],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
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
        { type: "destroy", targetCount: 1 },
        userId,
        attackerCardId,
        [protectedCardId] // Try to target protected card
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("cannot be targeted");
  });

  it("should reject effect with no targets when targets required", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "notargettest",
        email: "notarget@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Destroy Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 2,
        ability: "Destroy 1 target monster",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
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
        { type: "destroy", targetCount: 1 },
        userId,
        cardId,
        [] // No targets provided
      );
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("No targets selected");
  });

  it("should handle unknown effect type", async () => {
    const t = createTestInstance();

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
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
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
        { type: "unknownEffect" as any },
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
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "multitest",
        email: "multi@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Multi-Effect Card",
        rarity: "rare",
        cardType: "spell",
        archetype: "neutral",
        cost: 3,
        ability: "Draw 2 cards. Deal 500 damage.",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
      });
    });

    const result = await t.run(async (ctx) => {
      const { executeMultiPartAbility } = await import("./executor");
      const gameState = await ctx.db.get(gameStateId);
      if (!gameState) throw new Error("Game state not found");

      const parsedAbility = {
        hasMultiPart: true,
        effects: [
          { type: "draw" as const, value: 2 },
          { type: "damage" as const, value: 500 },
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
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "protectiontest",
        email: "protection@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Protected Card",
        rarity: "rare",
        cardType: "creature",
        archetype: "neutral",
        cost: 5,
        attack: 2500,
        defense: 2000,
        ability: "Cannot be destroyed by battle.",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
      });
    });

    const result = await t.run(async (ctx) => {
      const { executeMultiPartAbility } = await import("./executor");
      const gameState = await ctx.db.get(gameStateId);
      if (!gameState) throw new Error("Game state not found");

      const parsedAbility = {
        hasMultiPart: false,
        effects: [
          {
            type: "modifyATK" as const,
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
    const t = createTestInstance();

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
        cardType: "creature",
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
        opponentId: userId,
        gameMode: "ranked",
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        hostId: userId,
        opponentId: userId,
        currentTurnPlayer: userId,
        phase: "main1",
        turnNumber: 1,
        hostLP: 8000,
        opponentLP: 8000,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        isActive: true,
      });
    });

    const result = await t.run(async (ctx) => {
      const { executeMultiPartAbility } = await import("./executor");
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
    expect(result.messages).toHaveLength(0);
  });
});
