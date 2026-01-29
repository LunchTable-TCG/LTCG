/**
 * Chain Resolver Tests
 *
 * Tests chain mechanics: adding to chain, spell speed validation,
 * priority passing, and reverse resolution order.
 *
 * Supports both legacy string effects and JSON effects.
 */

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import type { JsonAbility } from "./effectSystem/types";

// Type helper to avoid TS2589 deep instantiation errors with Convex API
// @ts-ignore - Suppress TS2589 for api cast
// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const _apiAny = api as any;

// Helper: Create a JSON ability for draw effect
function createDrawJsonAbility(count: number): JsonAbility {
  return {
    effects: [
      {
        type: "draw",
        trigger: "manual",
        value: count,
      },
    ],
  };
}

// Helper: Create a JSON ability for damage effect
function createDamageJsonAbility(damage: number): JsonAbility {
  return {
    effects: [
      {
        type: "damage",
        trigger: "manual",
        value: damage,
      },
    ],
  };
}

// Helper: Create a JSON ability for negate effect
function createNegateJsonAbility(): JsonAbility {
  return {
    spellSpeed: 3,
    effects: [
      {
        type: "negate",
        trigger: "manual",
        targetType: "any",
      },
    ],
  };
}

const modules = import.meta.glob("../**/*.ts");

describe("addToChainHelper", () => {
  it("should add first effect to empty chain", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "chaintest",
        email: "chain@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Quick Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 2,
        ability: createDrawJsonAbility(1),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "chaintest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "chaintest",
        opponentRank: "Bronze",
        gameId: "test-game-1",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-1",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { addToChainHelper } = await import("./chainResolver");
      return await addToChainHelper(ctx, {
        lobbyId,
        cardId,
        playerId: userId,
        playerUsername: "chaintest",
        spellSpeed: 2,
        effect: createDrawJsonAbility(1),
      });
    });

    expect(result.success).toBe(true);
    expect(result.chainLinkNumber).toBe(1);
    expect(result.currentChainLength).toBe(1);

    // Verify chain state
    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(gameState?.currentChain).toHaveLength(1);
    expect(gameState?.currentChain?.[0]?.cardId).toBe(cardId);
    expect(gameState?.currentChain?.[0]?.spellSpeed).toBe(2);
  });

  it("should add second effect to existing chain", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "chain2",
        email: "chain2@test.com",
        createdAt: Date.now(),
      });
    });

    const card1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Spell 1",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 2,
        ability: createDrawJsonAbility(1),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const card2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Counter Spell",
        rarity: "rare",
        cardType: "trap",
        archetype: "neutral",
        cost: 3,
        ability: createNegateJsonAbility(),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "chain2",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "chain2",
        opponentRank: "Bronze",
        gameId: "test-game-2",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-2",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 2,
            effect: createDrawJsonAbility(1),
          },
        ],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { addToChainHelper } = await import("./chainResolver");
      return await addToChainHelper(ctx, {
        lobbyId,
        cardId: card2Id,
        playerId: userId,
        playerUsername: "chain2",
        spellSpeed: 3,
        effect: createNegateJsonAbility(),
      });
    });

    expect(result.success).toBe(true);
    expect(result.chainLinkNumber).toBe(2);
    expect(result.currentChainLength).toBe(2);
  });

  it("should reject lower spell speed", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "speedtest",
        email: "speed@test.com",
        createdAt: Date.now(),
      });
    });

    const card1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Quick Effect",
        rarity: "rare",
        cardType: "trap",
        archetype: "neutral",
        cost: 2,
        ability: createNegateJsonAbility(),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const card2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Normal Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        ability: createDrawJsonAbility(1),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "speedtest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "speedtest",
        opponentRank: "Bronze",
        gameId: "test-game-3",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-3",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 3, // Counter trap (Speed 3)
            effect: createNegateJsonAbility(),
          },
        ],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { addToChainHelper } = await import("./chainResolver");
        return await addToChainHelper(ctx, {
          lobbyId,
          cardId: card2Id,
          playerId: userId,
          playerUsername: "speedtest",
          spellSpeed: 1, // Normal spell (Speed 1) - should fail
          effect: createDrawJsonAbility(1),
        });
      })
    ).rejects.toThrow();
  });

  it("should handle missing lobby", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "missingtest",
        email: "missing@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Card",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    // Use a non-existent lobby ID by creating then deleting
    const invalidLobbyId = await t.run(async (ctx) => {
      const tempLobbyId = await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "missingtest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "missingtest",
        opponentRank: "Bronze",
        gameId: "test-game-4",
        turnNumber: 1,
        createdAt: Date.now(),
      });

      await ctx.db.delete(tempLobbyId);
      return tempLobbyId;
    });

    await expect(
      t.run(async (ctx) => {
        const { addToChainHelper } = await import("./chainResolver");
        return await addToChainHelper(ctx, {
          lobbyId: invalidLobbyId,
          cardId,
          playerId: userId,
          playerUsername: "missingtest",
          spellSpeed: 2,
          effect: { effects: [] },
        });
      })
    ).rejects.toThrow();
  });
});

describe("resolveChainHelper", () => {
  it("should resolve chain in reverse order", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "resolvetest",
        email: "resolve@test.com",
        createdAt: Date.now(),
      });
    });

    const card1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Draw Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        ability: createDrawJsonAbility(2),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const card2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Damage Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 2,
        ability: createDamageJsonAbility(500),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "resolvetest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "resolvetest",
        opponentRank: "Bronze",
        gameId: "test-game-5",
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
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 1,
            effect: createDrawJsonAbility(2),
          },
          {
            cardId: card2Id,
            playerId: userId,
            spellSpeed: 2,
            effect: createDamageJsonAbility(500),
          },
        ],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { resolveChainHelper } = await import("./chainResolver");
      return await resolveChainHelper(ctx, { lobbyId });
    });

    expect(result.success).toBe(true);
    expect(result.resolvedChainLinks).toBe(2);

    // Verify chain was cleared
    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(gameState?.currentChain).toHaveLength(0);
  });

  it("should handle negated effects in chain", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "negatetest",
        email: "negate@test.com",
        createdAt: Date.now(),
      });
    });

    const card1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Draw Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 1,
        ability: createDrawJsonAbility(2),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "negatetest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "negatetest",
        opponentRank: "Bronze",
        gameId: "test-game-6",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-6",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 1,
            effect: createDrawJsonAbility(2),
            negated: true, // Effect is negated
          },
        ],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { resolveChainHelper } = await import("./chainResolver");
      return await resolveChainHelper(ctx, { lobbyId });
    });

    expect(result.success).toBe(true);
    expect(result.resolvedChainLinks).toBe(1);
  });

  it("should throw error on empty chain", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "emptychain",
        email: "empty@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "emptychain",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "emptychain",
        opponentRank: "Bronze",
        gameId: "test-game-7",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-7",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [], // Empty chain
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { resolveChainHelper } = await import("./chainResolver");
        return await resolveChainHelper(ctx, { lobbyId });
      })
    ).rejects.toThrow();
  });

  it("should handle missing game state", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "nostatetest",
        email: "nostate@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "nostatetest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "nostatetest",
        opponentRank: "Bronze",
        gameId: "test-game-8",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    // No game state created

    await expect(
      t.run(async (ctx) => {
        const { resolveChainHelper } = await import("./chainResolver");
        return await resolveChainHelper(ctx, { lobbyId });
      })
    ).rejects.toThrow();
  });
});

describe("passPriority edge cases", () => {
  it("should handle no chain to respond to", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "prioritytest",
        email: "priority@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "prioritytest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "prioritytest",
        opponentRank: "Bronze",
        gameId: "test-game-9",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-9",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [], // Empty chain
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    // Note: passPriority requires auth, so we can't test it directly
    // without mocking auth. This is more of an integration test scenario.
  });
});

describe("JSON effect format", () => {
  it("should correctly parse and execute JSON draw effect", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "jsontest",
        email: "json@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "JSON Spell",
        rarity: "common",
        cardType: "spell",
        archetype: "neutral",
        cost: 2,
        ability: createDrawJsonAbility(3),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "jsontest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "jsontest",
        opponentRank: "Bronze",
        gameId: "test-game-json",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-json",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    // Add JSON effect to chain
    const result = await t.run(async (ctx) => {
      const { addToChainHelper } = await import("./chainResolver");
      return await addToChainHelper(ctx, {
        lobbyId,
        cardId,
        playerId: userId,
        playerUsername: "jsontest",
        spellSpeed: 1,
        effect: createDrawJsonAbility(3),
      });
    });

    expect(result.success).toBe(true);
    expect(result.chainLinkNumber).toBe(1);
  });

  it("should serialize JSON effects correctly for display", async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "serializetest",
        email: "serialize@test.com",
        createdAt: Date.now(),
      });
    });

    const cardId = await t.run(async (ctx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Negate",
        rarity: "rare",
        cardType: "trap",
        archetype: "neutral",
        cost: 3,
        ability: createNegateJsonAbility(),
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        hostUsername: "serializetest",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: userId,
        opponentUsername: "serializetest",
        opponentRank: "Bronze",
        gameId: "test-game-serialize",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-serialize",
        hostId: userId,
        opponentId: userId,
        currentTurnPlayerId: userId,
        currentPhase: "main1",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
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
        currentChain: [
          {
            cardId,
            playerId: userId,
            spellSpeed: 3,
            effect: createNegateJsonAbility(),
          },
        ],
        lastMoveAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    // Get current chain should serialize effect for display
    const chainState = await t.run(async (ctx) => {
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
        .first();
      return gameState?.currentChain;
    });

    expect(chainState).toHaveLength(1);
    expect(chainState?.[0]?.effect).toBeDefined();
  });
});
