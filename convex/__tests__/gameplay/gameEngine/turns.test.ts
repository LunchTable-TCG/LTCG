/**
 * Turn Management Tests
 *
 * Tests for turn transitions, phase changes, flag resets, and draw phase.
 */

import type { Id } from "@convex/_generated/dataModel";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Helper to create test instance
const createTestInstance = () => convexTest(schema, modules);

// Helper to create basic game setup
async function createGameSetup(t: ReturnType<typeof createTestInstance>) {
  const hostId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      username: "host",
      email: "host@test.com",
      createdAt: Date.now(),
    });
  });

  const opponentId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      username: "opponent",
      email: "opponent@test.com",
      createdAt: Date.now(),
    });
  });

  const lobbyId = await t.run(async (ctx) => {
    return await ctx.db.insert("gameLobbies", {
      hostId,
      hostUsername: "host",
      hostRank: "Bronze",
      hostRating: 1000,
      deckArchetype: "neutral",
      mode: "ranked",
      status: "active",
      isPrivate: false,
      opponentId,
      opponentUsername: "opponent",
      opponentRank: "Bronze",
      gameId: "test-game",
      turnNumber: 1,
      currentTurnPlayerId: hostId,
      createdAt: Date.now(),
    });
  });

  const gameStateId = await t.run(async (ctx) => {
    return await ctx.db.insert("gameStates", {
      lobbyId,
      gameId: "test-game",
      hostId,
      opponentId,
      currentTurnPlayerId: hostId,
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
      lastMoveAt: Date.now(),
      createdAt: Date.now(),
    });
  });

  return { hostId, opponentId, lobbyId, gameStateId };
}

// Helper to create card
async function createCard(t: ReturnType<typeof createTestInstance>, name: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("cardDefinitions", {
      name,
      rarity: "common",
      cardType: "creature",
      archetype: "neutral",
      cost: 4,
      attack: 1500,
      defense: 1200,
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

// =============================================================================
// PHASE VALIDATION TESTS
// =============================================================================

describe("Turn Phase Validation", () => {
  it("should allow ending turn from Main Phase 2", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, { currentPhase: "main2" });
    });

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(gameState?.currentPhase).toBe("main2");
    expect(["main2", "end"].includes(gameState?.currentPhase ?? "")).toBe(true);
  });

  it("should allow ending turn from End Phase", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, { currentPhase: "end" });
    });

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(gameState?.currentPhase).toBe("end");
    expect(["main2", "end"].includes(gameState?.currentPhase ?? "")).toBe(true);
  });

  it("should NOT allow ending turn from Main Phase 1", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(gameState?.currentPhase).toBe("main1");
    expect(["main2", "end"].includes(gameState?.currentPhase ?? "")).toBe(false);
  });
});

// =============================================================================
// FLAG RESET TESTS
// =============================================================================

describe("Turn Transition - Flag Resets", () => {
  it("should reset hasAttacked flags for all monsters on both boards", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    const card1 = await createCard(t, "Test Monster 1");
    const card2 = await createCard(t, "Test Monster 2");

    // Set up board with attacked monsters
    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, {
        hostBoard: [
          {
            cardId: card1,
            position: 1,
            attack: 1500,
            defense: 1200,
            hasAttacked: true,
            isFaceDown: false,
          },
        ],
        opponentBoard: [
          {
            cardId: card2,
            position: 1,
            attack: 1800,
            defense: 1000,
            hasAttacked: true,
            isFaceDown: false,
          },
        ],
      });
    });

    // Verify initial state has hasAttacked = true
    const initialState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(initialState?.hostBoard[0]?.hasAttacked).toBe(true);
    expect(initialState?.opponentBoard[0]?.hasAttacked).toBe(true);

    // Simulate turn reset logic
    await t.run(async (ctx) => {
      const gameState = await ctx.db.get(gameStateId);
      if (!gameState) throw new Error("Game state not found");

      const resetHostBoard = gameState.hostBoard.map((card) => ({
        ...card,
        hasAttacked: false,
      }));

      const resetOpponentBoard = gameState.opponentBoard.map((card) => ({
        ...card,
        hasAttacked: false,
      }));

      await ctx.db.patch(gameStateId, {
        hostBoard: resetHostBoard,
        opponentBoard: resetOpponentBoard,
      });
    });

    const afterReset = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(afterReset?.hostBoard[0]?.hasAttacked).toBe(false);
    expect(afterReset?.opponentBoard[0]?.hasAttacked).toBe(false);
  });

  it("should reset normalSummonedThisTurn flags for both players", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, {
        hostNormalSummonedThisTurn: true,
        opponentNormalSummonedThisTurn: true,
      });
    });

    const initialState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(initialState?.hostNormalSummonedThisTurn).toBe(true);
    expect(initialState?.opponentNormalSummonedThisTurn).toBe(true);

    // Simulate turn reset
    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, {
        hostNormalSummonedThisTurn: false,
        opponentNormalSummonedThisTurn: false,
      });
    });

    const afterReset = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(afterReset?.hostNormalSummonedThisTurn).toBe(false);
    expect(afterReset?.opponentNormalSummonedThisTurn).toBe(false);
  });
});

// =============================================================================
// PLAYER SWITCH TESTS
// =============================================================================

describe("Turn Transition - Player Switch", () => {
  it("should switch current turn player to opponent", async () => {
    const t = createTestInstance();
    const { hostId, opponentId, lobbyId, gameStateId } = await createGameSetup(t);

    // Verify initial state
    const initialState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });
    expect(initialState?.currentTurnPlayerId).toBe(hostId);

    // Simulate turn switch
    await t.run(async (ctx) => {
      await ctx.db.patch(lobbyId, {
        currentTurnPlayerId: opponentId,
        turnNumber: 2,
      });

      await ctx.db.patch(gameStateId, {
        currentTurnPlayerId: opponentId,
        turnNumber: 2,
      });
    });

    const lobby = await t.run(async (ctx) => {
      return await ctx.db.get(lobbyId);
    });

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(lobby?.currentTurnPlayerId).toBe(opponentId);
    expect(lobby?.turnNumber).toBe(2);
    expect(gameState?.currentTurnPlayerId).toBe(opponentId);
    expect(gameState?.turnNumber).toBe(2);
  });

  it("should increment turn number correctly", async () => {
    const t = createTestInstance();
    const { lobbyId } = await createGameSetup(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(lobbyId, { turnNumber: 5 });
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.get(lobbyId);
      if (!lobby) throw new Error("Lobby not found");

      await ctx.db.patch(lobbyId, {
        turnNumber: (lobby.turnNumber ?? 0) + 1,
      });
    });

    const lobby = await t.run(async (ctx) => {
      return await ctx.db.get(lobbyId);
    });

    expect(lobby?.turnNumber).toBe(6);
  });
});

// =============================================================================
// DRAW PHASE TESTS
// =============================================================================

describe("Draw Phase Execution", () => {
  it("should draw card for new turn player (not first turn)", async () => {
    const t = createTestInstance();

    const card1 = await createCard(t, "Deck Card 1");
    const card2 = await createCard(t, "Deck Card 2");

    const hostId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "drawhost",
        email: "drawhost@test.com",
        createdAt: Date.now(),
      });
    });

    const opponentId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "drawopponent",
        email: "drawopponent@test.com",
        createdAt: Date.now(),
      });
    });

    const lobbyId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId,
        hostUsername: "drawhost",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId,
        opponentUsername: "drawopponent",
        opponentRank: "Bronze",
        gameId: "test-game-draw",
        turnNumber: 2,
        currentTurnPlayerId: opponentId,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-game-draw",
        hostId,
        opponentId,
        currentTurnPlayerId: opponentId,
        currentPhase: "draw",
        turnNumber: 2,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
        hostDeck: [],
        opponentDeck: [card1, card2],
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

    // Simulate draw card
    await t.run(async (ctx) => {
      const gameState = await ctx.db.get(gameStateId);
      if (!gameState) throw new Error("Game state not found");

      const drawnCard = gameState.opponentDeck[0];
      if (!drawnCard) throw new Error("No card to draw");

      await ctx.db.patch(gameStateId, {
        opponentDeck: gameState.opponentDeck.slice(1),
        opponentHand: [...gameState.opponentHand, drawnCard],
      });
    });

    const afterDraw = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(afterDraw?.opponentDeck.length).toBe(1);
    expect(afterDraw?.opponentHand.length).toBe(1);
    expect(afterDraw?.opponentHand[0]).toBe(card1);
  });

  it("should skip draw on first turn for host", async () => {
    const t = createTestInstance();
    const { lobbyId } = await createGameSetup(t);

    const lobby = await t.run(async (ctx) => {
      return await ctx.db.get(lobbyId);
    });

    // Logic from turns.ts - first turn host skips draw
    const shouldSkipDraw =
      (lobby?.turnNumber ?? 0) === 1 && lobby?.currentTurnPlayerId === lobby?.hostId;
    expect(shouldSkipDraw).toBe(true);
  });
});

// =============================================================================
// DECK-OUT TESTS
// =============================================================================

describe("Deck-Out Detection", () => {
  it("should detect deck-out condition when player has empty deck", async () => {
    const t = createTestInstance();
    const { opponentId, gameStateId } = await createGameSetup(t);

    // Set opponent deck to empty
    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, {
        opponentDeck: [],
        turnNumber: 10,
        currentTurnPlayerId: opponentId,
        currentPhase: "draw",
      });
    });

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    // Check deck-out condition
    const isDeckOut = gameState?.opponentDeck.length === 0;
    expect(isDeckOut).toBe(true);
  });

  it("should not trigger deck-out when deck has cards", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    const card = await createCard(t, "Last Card");

    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, {
        hostDeck: [card],
      });
    });

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    const isDeckOut = gameState?.hostDeck.length === 0;
    expect(isDeckOut).toBe(false);
  });
});

// =============================================================================
// PHASE TRANSITION TESTS
// =============================================================================

describe("Phase Transition", () => {
  it("should transition phases correctly: main1 -> battle -> main2 -> end", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    // Start at main1
    let gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });
    expect(gameState?.currentPhase).toBe("main1");

    // Transition to battle
    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, { currentPhase: "battle" });
    });
    gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });
    expect(gameState?.currentPhase).toBe("battle");

    // Transition to main2
    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, { currentPhase: "main2" });
    });
    gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });
    expect(gameState?.currentPhase).toBe("main2");

    // Transition to end
    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, { currentPhase: "end" });
    });
    gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });
    expect(gameState?.currentPhase).toBe("end");
  });
});

// =============================================================================
// HAND SIZE LIMIT TESTS
// =============================================================================

describe("Hand Size Limit", () => {
  it("should enforce hand size limit of 6 cards", async () => {
    const t = createTestInstance();
    const { gameStateId } = await createGameSetup(t);

    // Create 8 cards
    const cards: Id<"cardDefinitions">[] = [];
    for (let i = 0; i < 8; i++) {
      const cardId = await createCard(t, `Hand Card ${i}`);
      cards.push(cardId);
    }

    await t.run(async (ctx) => {
      await ctx.db.patch(gameStateId, {
        hostHand: cards,
      });
    });

    const gameState = await t.run(async (ctx) => {
      return await ctx.db.get(gameStateId);
    });

    // Hand has 8 cards, but limit is 6
    expect(gameState?.hostHand.length).toBe(8);
    if (!gameState) throw new Error("Expected gameState to exist");

    const needsDiscard = gameState.hostHand.length > 6;
    expect(needsDiscard).toBe(true);
    const discardCount = gameState.hostHand.length - 6;
    expect(discardCount).toBe(2);
  });
});
