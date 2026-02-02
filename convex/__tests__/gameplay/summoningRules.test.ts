// @ts-nocheck
/**
 * Summoning Rules Tests
 *
 * Tests for Yu-Gi-Oh summoning mechanics:
 * - Normal Summon validation (once per turn, tribute requirements)
 * - Set Monster validation
 * - Flip Summon validation
 * - Monster zone limits
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { MutationCtx } from "@convex/_generated/server";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Helper types
type GamePhase =
  | "draw"
  | "standby"
  | "main1"
  | "battle_start"
  | "battle"
  | "battle_end"
  | "main2"
  | "end";

interface BoardCard {
  cardId: Id<"cardDefinitions">;
  position: 1 | -1; // 1 = ATK, -1 = DEF
  attack: number;
  defense: number;
  hasAttacked: boolean;
  isFaceDown: boolean;
}

// =============================================================================
// TEST SETUP HELPERS
// =============================================================================

interface TestUser {
  id: Id<"users">;
  privyId: string;
}

async function createTestUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  username: string
): Promise<TestUser> {
  const privyId = `did:privy:test_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const id = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("users", {
      email,
      username,
      privyId,
      createdAt: Date.now(),
    });
  });
  return { id, privyId };
}

async function createTestCard(
  t: ReturnType<typeof convexTest>,
  name: string,
  cost: number, // Level/cost - determines tribute requirements
  attack: number,
  defense: number,
  cardType: "creature" | "spell" | "trap" = "creature"
): Promise<Id<"cardDefinitions">> {
  return await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("cardDefinitions", {
      name,
      rarity: "common",
      cardType,
      archetype: "neutral",
      cost,
      attack,
      defense,
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

async function createGameInMainPhase(
  t: ReturnType<typeof convexTest>,
  host: TestUser,
  opponent: TestUser,
  hostHand: Id<"cardDefinitions">[],
  hostBoard: BoardCard[],
  opponentBoard: BoardCard[] = [],
  hostNormalSummonedThisTurn = false
) {
  const lobbyId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("gameLobbies", {
      hostId: host.id,
      hostUsername: "host",
      hostRank: "Bronze",
      hostRating: 1000,
      deckArchetype: "neutral",
      mode: "ranked",
      status: "active",
      isPrivate: false,
      opponentId: opponent.id,
      opponentUsername: "opponent",
      opponentRank: "Bronze",
      gameId: `test-game-${Date.now()}`,
      turnNumber: 2,
      createdAt: Date.now(),
    });
  });

  const now = Date.now();
  const gameStateId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("gameStates", {
      lobbyId,
      gameId: `test-game-${now}`,
      hostId: host.id,
      opponentId: opponent.id,
      currentTurnPlayerId: host.id, // Host's turn
      currentPhase: "main1", // Main Phase for summoning
      turnNumber: 2,
      hostLifePoints: 8000,
      opponentLifePoints: 8000,
      hostMana: 5,
      opponentMana: 5,
      hostDeck: [],
      opponentDeck: [],
      hostHand,
      opponentHand: [],
      hostBoard,
      opponentBoard,
      hostGraveyard: [],
      opponentGraveyard: [],
      hostBanished: [],
      opponentBanished: [],
      hostSpellTrapZone: [],
      opponentSpellTrapZone: [],
      hostNormalSummonedThisTurn,
      opponentNormalSummonedThisTurn: false,
      currentChain: [],
      lastMoveAt: now,
      createdAt: now,
    });
  });

  return { lobbyId, gameStateId };
}

// =============================================================================
// NORMAL SUMMON TESTS
// =============================================================================

describe("Summoning Rules - Normal Summon", () => {
  it("should allow normal summon of level 4 or lower monster without tributes", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const lowLevelMonster = await createTestCard(t, "Low Level Monster", 4, 1500, 1000);

    const { lobbyId, gameStateId } = await createGameInMainPhase(
      t,
      host,
      opponent,
      [lowLevelMonster],
      []
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
      lobbyId,
      cardId: lowLevelMonster,
      position: "attack",
    });

    expect(result.success).toBe(true);

    // Verify card is on board
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard).toHaveLength(1);
    expect(gameState?.hostBoard[0].cardId).toBe(lowLevelMonster);
    expect(gameState?.hostBoard[0].position).toBe(1); // Attack position

    // Verify card removed from hand
    expect(gameState?.hostHand).toHaveLength(0);

    // Verify normal summon flag is set
    expect(gameState?.hostNormalSummonedThisTurn).toBe(true);
  });

  it("should reject second normal summon in same turn", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const monster = await createTestCard(t, "Monster", 4, 1500, 1000);

    // Player already normal summoned this turn
    const { lobbyId } = await createGameInMainPhase(
      t,
      host,
      opponent,
      [monster],
      [],
      [],
      true // hostNormalSummonedThisTurn = true
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: monster,
        position: "attack",
      })
    ).rejects.toThrow(/Normal Summon|once per turn/i);
  });

  it("should require 1 tribute for level 5-6 monsters", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const level5Monster = await createTestCard(t, "Level 5 Monster", 5, 2000, 1500);
    const tributeMonster = await createTestCard(t, "Tribute Fodder", 2, 500, 500);

    // Put tribute monster on board, high level in hand
    const hostBoard: BoardCard[] = [
      {
        cardId: tributeMonster,
        position: 1,
        attack: 500,
        defense: 500,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameInMainPhase(
      t,
      host,
      opponent,
      [level5Monster],
      hostBoard
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    // Summon with tribute
    const result = await asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
      lobbyId,
      cardId: level5Monster,
      tributeCardIds: [tributeMonster],
      position: "attack",
    });

    expect(result.success).toBe(true);

    // Verify level 5 monster is on board
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard).toHaveLength(1);
    expect(gameState?.hostBoard[0].cardId).toBe(level5Monster);

    // Verify tribute monster went to graveyard
    expect(gameState?.hostGraveyard).toContain(tributeMonster);
  });

  it("should reject level 5-6 monster summon without tribute", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const level5Monster = await createTestCard(t, "Level 5 Monster", 5, 2000, 1500);

    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [level5Monster], []);

    const asHost = t.withIdentity({ subject: host.privyId });

    // Try to summon without tribute
    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: level5Monster,
        position: "attack",
      })
    ).rejects.toThrow(/requires.*tribute/i);
  });

  it("should require 2 tributes for level 7+ monsters", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const level7Monster = await createTestCard(t, "Level 7 Monster", 7, 2500, 2000);
    const tribute1 = await createTestCard(t, "Tribute 1", 2, 500, 500);
    const tribute2 = await createTestCard(t, "Tribute 2", 2, 600, 600);

    // Put 2 tribute monsters on board
    const hostBoard: BoardCard[] = [
      {
        cardId: tribute1,
        position: 1,
        attack: 500,
        defense: 500,
        hasAttacked: false,
        isFaceDown: false,
      },
      {
        cardId: tribute2,
        position: 1,
        attack: 600,
        defense: 600,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameInMainPhase(
      t,
      host,
      opponent,
      [level7Monster],
      hostBoard
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    // Summon with 2 tributes
    const result = await asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
      lobbyId,
      cardId: level7Monster,
      tributeCardIds: [tribute1, tribute2],
      position: "attack",
    });

    expect(result.success).toBe(true);

    // Verify level 7 monster is on board
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard).toHaveLength(1);
    expect(gameState?.hostBoard[0].cardId).toBe(level7Monster);

    // Verify both tributes went to graveyard
    expect(gameState?.hostGraveyard).toContain(tribute1);
    expect(gameState?.hostGraveyard).toContain(tribute2);
  });

  it("should reject level 7+ monster summon with only 1 tribute", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const level7Monster = await createTestCard(t, "Level 7 Monster", 7, 2500, 2000);
    const tribute = await createTestCard(t, "Tribute", 2, 500, 500);

    // Only 1 tribute on board
    const hostBoard: BoardCard[] = [
      {
        cardId: tribute,
        position: 1,
        attack: 500,
        defense: 500,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [level7Monster], hostBoard);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: level7Monster,
        tributeCardIds: [tribute],
        position: "attack",
      })
    ).rejects.toThrow(/requires.*tribute/i);
  });

  it("should reject summon when monster zone is full (5 monsters)", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const newMonster = await createTestCard(t, "New Monster", 4, 1500, 1000);

    // Create 5 monsters on board (full zone)
    const fullBoard: BoardCard[] = [];
    for (let i = 0; i < 5; i++) {
      const cardId = await createTestCard(t, `Monster ${i}`, 2, 1000, 1000);
      fullBoard.push({
        cardId,
        position: 1,
        attack: 1000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      });
    }

    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [newMonster], fullBoard);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: newMonster,
        position: "attack",
      })
    ).rejects.toThrow(/Invalid move|zone.*full/i);
  });

  it("should reject summon of card not in hand", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const notInHandMonster = await createTestCard(t, "Not In Hand", 4, 1500, 1000);

    // Card is NOT in hand (empty hand)
    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [], []);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: notInHandMonster,
        position: "attack",
      })
    ).rejects.toThrow(/not in your hand/i);
  });

  it("should reject summon of spell/trap cards", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const spellCard = await createTestCard(t, "Spell Card", 0, 0, 0, "spell");

    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [spellCard], []);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: spellCard,
        position: "attack",
      })
    ).rejects.toThrow(/monster cards|Normal Summon/i);
  });
});

// =============================================================================
// SET MONSTER TESTS
// =============================================================================

describe("Summoning Rules - Set Monster", () => {
  it("should allow setting monster face-down", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const monster = await createTestCard(t, "Set Monster", 4, 1500, 1000);

    const { lobbyId, gameStateId } = await createGameInMainPhase(t, host, opponent, [monster], []);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.gameEngine.summons.setMonster, {
      lobbyId,
      cardId: monster,
    });

    expect(result.success).toBe(true);

    // Verify card is on board face-down in defense position
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard).toHaveLength(1);
    expect(gameState?.hostBoard[0].cardId).toBe(monster);
    expect(gameState?.hostBoard[0].isFaceDown).toBe(true);
    expect(gameState?.hostBoard[0].position).toBe(-1); // Defense position

    // Verify normal summon flag is set (set counts as normal summon)
    expect(gameState?.hostNormalSummonedThisTurn).toBe(true);
  });

  it("should reject second set in same turn (counts as normal summon)", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const monster = await createTestCard(t, "Monster", 4, 1500, 1000);

    // Already normal summoned/set this turn
    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [monster], [], [], true);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.setMonster, {
        lobbyId,
        cardId: monster,
      })
    ).rejects.toThrow(/Normal Summon|once per turn/i);
  });
});

// =============================================================================
// FLIP SUMMON TESTS
// =============================================================================

describe("Summoning Rules - Flip Summon", () => {
  it("should allow flip summon of face-down monster", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const faceDownMonster = await createTestCard(t, "Face Down Monster", 4, 1500, 1000);

    // Monster is already face-down on board
    const hostBoard: BoardCard[] = [
      {
        cardId: faceDownMonster,
        position: -1, // Defense
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: true,
      },
    ];

    const { lobbyId, gameStateId } = await createGameInMainPhase(t, host, opponent, [], hostBoard);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.gameEngine.summons.flipSummon, {
      lobbyId,
      cardId: faceDownMonster,
      newPosition: "attack",
    });

    expect(result.success).toBe(true);

    // Verify card is now face-up in attack position
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard[0].isFaceDown).toBe(false);
    expect(gameState?.hostBoard[0].position).toBe(1); // Attack position
  });

  it("should NOT count flip summon as normal summon (can still normal summon after)", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const faceDownMonster = await createTestCard(t, "Face Down Monster", 4, 1500, 1000);
    const handMonster = await createTestCard(t, "Hand Monster", 4, 1400, 1200);

    // Monster is face-down on board, another in hand
    const hostBoard: BoardCard[] = [
      {
        cardId: faceDownMonster,
        position: -1,
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: true,
      },
    ];

    const { lobbyId, gameStateId } = await createGameInMainPhase(
      t,
      host,
      opponent,
      [handMonster],
      hostBoard
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    // First: Flip summon
    await asHost.mutation(api.gameplay.gameEngine.summons.flipSummon, {
      lobbyId,
      cardId: faceDownMonster,
      newPosition: "attack",
    });

    // Second: Should still be able to normal summon
    const result = await asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
      lobbyId,
      cardId: handMonster,
      position: "attack",
    });

    expect(result.success).toBe(true);

    // Verify both monsters on board
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard).toHaveLength(2);
  });

  it("should reject flip summon of already face-up monster", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const faceUpMonster = await createTestCard(t, "Face Up Monster", 4, 1500, 1000);

    // Monster is already face-up
    const hostBoard: BoardCard[] = [
      {
        cardId: faceUpMonster,
        position: 1,
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false, // Face-up
      },
    ];

    const { lobbyId } = await createGameInMainPhase(t, host, opponent, [], hostBoard);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.flipSummon, {
        lobbyId,
        cardId: faceUpMonster,
        newPosition: "attack",
      })
    ).rejects.toThrow(/Invalid move|face.*up/i);
  });
});

// =============================================================================
// TURN VALIDATION TESTS
// =============================================================================

describe("Summoning Rules - Turn Validation", () => {
  it("should reject summon when not your turn", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const monster = await createTestCard(t, "Monster", 4, 1500, 1000);

    // Create game but set opponent as current turn player
    const lobbyId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId: host.id,
        hostUsername: "host",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "ranked",
        status: "active",
        isPrivate: false,
        opponentId: opponent.id,
        opponentUsername: "opponent",
        opponentRank: "Bronze",
        gameId: `test-game-${Date.now()}`,
        turnNumber: 2,
        createdAt: Date.now(),
      });
    });

    const now = Date.now();
    await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: `test-game-${now}`,
        hostId: host.id,
        opponentId: opponent.id,
        currentTurnPlayerId: opponent.id, // Opponent's turn
        currentPhase: "main1",
        turnNumber: 2,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 5,
        opponentMana: 5,
        hostDeck: [],
        opponentDeck: [],
        hostHand: [monster],
        opponentHand: [],
        hostBoard: [],
        opponentBoard: [],
        hostGraveyard: [],
        opponentGraveyard: [],
        hostBanished: [],
        opponentBanished: [],
        hostSpellTrapZone: [],
        opponentSpellTrapZone: [],
        hostNormalSummonedThisTurn: false,
        opponentNormalSummonedThisTurn: false,
        currentChain: [],
        lastMoveAt: now,
        createdAt: now,
      });
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: monster,
        position: "attack",
      })
    ).rejects.toThrow(/not your turn/i);
  });
});
