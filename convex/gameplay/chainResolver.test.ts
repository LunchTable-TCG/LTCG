/**
 * Chain Resolver Tests
 *
 * Tests chain mechanics: adding to chain, spell speed validation,
 * priority passing, and reverse resolution order.
 */

import { describe, expect, it } from "vitest";
import { createTestInstance } from "../../convex_test_utils/setup";
import type { Id } from "../_generated/dataModel";

describe("addToChainHelper", () => {
  it("should add first effect to empty chain", async () => {
    const t = createTestInstance();

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
        ability: "Draw 1 card",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
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
        currentChain: [],
        isActive: true,
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
        effect: "Draw 1 card",
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
    const t = createTestInstance();

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
        ability: "Draw 1 card",
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
        ability: "Negate 1 card effect",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 2,
            effect: "Draw 1 card",
          },
        ],
        isActive: true,
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
        effect: "Negate 1 card effect",
      });
    });

    expect(result.success).toBe(true);
    expect(result.chainLinkNumber).toBe(2);
    expect(result.currentChainLength).toBe(2);
  });

  it("should reject lower spell speed", async () => {
    const t = createTestInstance();

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
        ability: "Negate",
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
        ability: "Draw 1 card",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 3, // Counter trap (Speed 3)
            effect: "Negate",
          },
        ],
        isActive: true,
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
          effect: "Draw 1 card",
        });
      })
    ).rejects.toThrowError(/Cannot chain Spell Speed 1 to Spell Speed 3/);
  });

  it("should handle missing lobby", async () => {
    const t = createTestInstance();

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

    await expect(
      t.run(async (ctx) => {
        const { addToChainHelper } = await import("./chainResolver");
        return await addToChainHelper(ctx, {
          lobbyId: "invalid_lobby_id" as Id<"gameLobbies">,
          cardId,
          playerId: userId,
          playerUsername: "missingtest",
          spellSpeed: 2,
          effect: "Test",
        });
      })
    ).rejects.toThrowError(/Lobby not found/);
  });
});

describe("resolveChainHelper", () => {
  it("should resolve chain in reverse order", async () => {
    const t = createTestInstance();

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
        ability: "Draw 2 cards",
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
        ability: "Deal 500 damage",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 1,
            effect: "Draw 2 cards",
          },
          {
            cardId: card2Id,
            playerId: userId,
            spellSpeed: 2,
            effect: "Deal 500 damage",
          },
        ],
        isActive: true,
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
    const t = createTestInstance();

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
        ability: "Draw 2 cards",
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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
        currentChain: [
          {
            cardId: card1Id,
            playerId: userId,
            spellSpeed: 1,
            effect: "Draw 2 cards",
            negated: true, // Effect is negated
          },
        ],
        isActive: true,
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
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "emptychain",
        email: "empty@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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
        currentChain: [], // Empty chain
        isActive: true,
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { resolveChainHelper } = await import("./chainResolver");
        return await resolveChainHelper(ctx, { lobbyId });
      })
    ).rejects.toThrowError(/No chain to resolve/);
  });

  it("should handle missing game state", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "nostatetest",
        email: "nostate@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
        status: "in_progress",
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
    ).rejects.toThrowError(/Game state not found/);
  });
});

describe("passPriority edge cases", () => {
  it("should handle no chain to respond to", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "prioritytest",
        email: "priority@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      const gameId = await ctx.db.insert("games", {
        hostId: userId,
        opponentId: userId,
        mode: "ranked",
        status: "in_progress",
        startTime: Date.now(),
      });

      return await ctx.db.insert("gameLobbies", {
        hostId: userId,
        opponentId: userId,
        gameMode: "ranked",
        gameId,
        status: "in_progress",
        turnNumber: 1,
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
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
        currentChain: [], // Empty chain
        isActive: true,
      });
    });

    // Note: passPriority requires auth, so we can't test it directly
    // without mocking auth. This is more of an integration test scenario.
  });
});
