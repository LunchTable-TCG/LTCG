/**
 * Combat System Tests
 *
 * Tests for LunchTable TCG combat mechanics:
 * - Attack declarations and validation
 * - Battle damage calculation (ATK vs ATK, ATK vs DEF)
 * - Direct attacks
 * - Card destruction in battle
 * - LP modifications
 * - Protection mechanics
 */

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import schema from "../../schema";
import { modules } from "../../test.setup";
// @ts-nocheck
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Helper types
type GamePhase =
  | "draw"
  | "main"
  | "combat"
  | "breakdown_check"
  | "end";

interface BoardCard {
  cardId: Id<"cardDefinitions">;
  position: 1 | -1; // 1 = ATK, -1 = DEF
  attack: number;
  defense: number;
  hasAttacked: boolean;
  isFaceDown: boolean;
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
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
  attack: number,
  defense: number,
  cardType: "stereotype" | "spell" | "trap" = "stereotype"
): Promise<Id<"cardDefinitions">> {
  return await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("cardDefinitions", {
      name,
      rarity: "common",
      cardType,
      archetype: "neutral",
      cost: 0,
      attack,
      defense,
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

async function createGameWithBattlePhase(
  t: ReturnType<typeof convexTest>,
  host: TestUser,
  opponent: TestUser,
  hostBoard: BoardCard[],
  opponentBoard: BoardCard[],
  currentTurnPlayerId: Id<"users">,
  phase: GamePhase = "combat"
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
      currentTurnPlayerId,
      currentPhase: phase,
      turnNumber: 2,
      hostLifePoints: 8000,
      opponentLifePoints: 8000,
      hostClout: 5,
      opponentClout: 5,
      hostDeck: [],
      opponentDeck: [],
      hostHand: [],
      opponentHand: [],
      hostBoard,
      opponentBoard,
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

  return { lobbyId, gameStateId };
}

// =============================================================================
// ATTACK VALIDATION TESTS
// =============================================================================

describe("Combat System - Attack Validation", () => {
  it("should reject attack during Main Phase (not Battle Phase)", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attackerCard = await createTestCard(t, "Attacker", 1800, 1200);

    const hostBoard: BoardCard[] = [
      {
        cardId: attackerCard,
        position: 1,
        attack: 1800,
        defense: 1200,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "main" // Main Phase, not Battle
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    // Attempt to attack during Main Phase should fail
    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: attackerCard,
      })
    ).rejects.toThrow(/Battle Phase|Invalid move/i);
  });

  it("should reject attack when not your turn", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attackerCard = await createTestCard(t, "Attacker", 1800, 1200);

    const hostBoard: BoardCard[] = [
      {
        cardId: attackerCard,
        position: 1,
        attack: 1800,
        defense: 1200,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    // Opponent's turn, not host's
    const { lobbyId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      opponent.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: attackerCard,
      })
    ).rejects.toThrow(/not your turn/i); // "It is not your turn"
  });

  it("should reject attack with monster that already attacked", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attackerCard = await createTestCard(t, "Attacker", 1800, 1200);

    const hostBoard: BoardCard[] = [
      {
        cardId: attackerCard,
        position: 1,
        attack: 1800,
        defense: 1200,
        hasAttacked: true, // Already attacked
        isFaceDown: false,
      },
    ];

    const { lobbyId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: attackerCard,
      })
    ).rejects.toThrow(/already attacked/i);
  });

  it("should reject attack with Defense Position monster", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const defenderCard = await createTestCard(t, "Defender", 1000, 2000);

    const hostBoard: BoardCard[] = [
      {
        cardId: defenderCard,
        position: -1, // Defense Position
        attack: 1000,
        defense: 2000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: defenderCard,
      })
    ).rejects.toThrow(/Attack Position/i);
  });

  it("should reject direct attack when opponent has monsters", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attackerCard = await createTestCard(t, "Attacker", 1800, 1200);
    const opponentMonster = await createTestCard(t, "Blocker", 1000, 1000);

    const hostBoard: BoardCard[] = [
      {
        cardId: attackerCard,
        position: 1,
        attack: 1800,
        defense: 1200,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: opponentMonster,
        position: 1,
        attack: 1000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    // Attempt direct attack (no targetCardId) when opponent has monsters
    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: attackerCard,
        // No targetCardId = direct attack
      })
    ).rejects.toThrow(/opponent has monsters/i);
  });
});

// =============================================================================
// DIRECT ATTACK TESTS
// =============================================================================

describe("Combat System - Direct Attacks", () => {
  it("should allow direct attack when opponent has no monsters", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attackerCard = await createTestCard(t, "Attacker", 1800, 1200);

    const hostBoard: BoardCard[] = [
      {
        cardId: attackerCard,
        position: 1,
        attack: 1800,
        defense: 1200,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: attackerCard,
      // No targetCardId = direct attack
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.damageTo).toHaveLength(1);
    expect(result.battleResult.damageTo[0].amount).toBe(1800);

    // Verify LP was reduced
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.opponentLifePoints).toBe(8000 - 1800);
  });

  it("should deal correct damage on direct attack", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const strongAttacker = await createTestCard(t, "Strong Attacker", 2500, 1500);

    const hostBoard: BoardCard[] = [
      {
        cardId: strongAttacker,
        position: 1,
        attack: 2500,
        defense: 1500,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: strongAttacker,
    });

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.opponentLifePoints).toBe(8000 - 2500);
  });
});

// =============================================================================
// ATK VS ATK BATTLE TESTS
// =============================================================================

describe("Combat System - ATK vs ATK Battles", () => {
  it("should destroy defender and deal damage when attacker ATK > defender ATK", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attacker = await createTestCard(t, "Strong Monster", 2000, 1000);
    const defender = await createTestCard(t, "Weak Monster", 1500, 1000);

    const hostBoard: BoardCard[] = [
      {
        cardId: attacker,
        position: 1,
        attack: 2000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: defender,
        position: 1, // ATK position
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: attacker,
      targetCardId: defender,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.destroyed).toContain(defender);
    expect(result.battleResult.damageTo[0].amount).toBe(500); // 2000 - 1500

    // Verify opponent LP reduced
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.opponentLifePoints).toBe(8000 - 500);

    // Verify defender removed from board
    expect(gameState?.opponentBoard).toHaveLength(0);
  });

  it("should destroy attacker and deal damage to attacker when defender ATK > attacker ATK", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const weakAttacker = await createTestCard(t, "Weak Attacker", 1200, 1000);
    const strongDefender = await createTestCard(t, "Strong Defender", 1800, 1000);

    const hostBoard: BoardCard[] = [
      {
        cardId: weakAttacker,
        position: 1,
        attack: 1200,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: strongDefender,
        position: 1, // ATK position
        attack: 1800,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: weakAttacker,
      targetCardId: strongDefender,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.destroyed).toContain(weakAttacker);
    expect(result.battleResult.damageTo[0].amount).toBe(600); // 1800 - 1200

    // Verify host LP reduced (attacker's controller takes damage)
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostLifePoints).toBe(8000 - 600);

    // Verify attacker removed from host board
    expect(gameState?.hostBoard).toHaveLength(0);
  });

  it("should destroy both monsters with no damage when ATK values are equal", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const monster1 = await createTestCard(t, "Monster 1", 1500, 1000);
    const monster2 = await createTestCard(t, "Monster 2", 1500, 1000);

    const hostBoard: BoardCard[] = [
      {
        cardId: monster1,
        position: 1,
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: monster2,
        position: 1,
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: monster1,
      targetCardId: monster2,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.destroyed).toContain(monster1);
    expect(result.battleResult.destroyed).toContain(monster2);
    expect(result.battleResult.damageTo).toHaveLength(0); // No damage on tie

    // Verify both boards empty
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard).toHaveLength(0);
    expect(gameState?.opponentBoard).toHaveLength(0);

    // Verify LP unchanged
    expect(gameState?.hostLifePoints).toBe(8000);
    expect(gameState?.opponentLifePoints).toBe(8000);
  });
});

// =============================================================================
// ATK VS DEF BATTLE TESTS
// =============================================================================

describe("Combat System - ATK vs DEF Battles", () => {
  it("should destroy defender with no damage when attacker ATK > defender DEF", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attacker = await createTestCard(t, "Attacker", 2000, 1000);
    const defenseMonster = await createTestCard(t, "Wall", 500, 1800);

    const hostBoard: BoardCard[] = [
      {
        cardId: attacker,
        position: 1,
        attack: 2000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: defenseMonster,
        position: -1, // DEF position
        attack: 500,
        defense: 1800,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: attacker,
      targetCardId: defenseMonster,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.destroyed).toContain(defenseMonster);
    expect(result.battleResult.damageTo).toHaveLength(0); // No damage when attacking DEF

    // Verify LP unchanged
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostLifePoints).toBe(8000);
    expect(gameState?.opponentLifePoints).toBe(8000);
  });

  it("should deal damage to attacker when defender DEF > attacker ATK", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const weakAttacker = await createTestCard(t, "Weak Attacker", 1000, 500);
    const strongWall = await createTestCard(t, "Strong Wall", 200, 2500);

    const hostBoard: BoardCard[] = [
      {
        cardId: weakAttacker,
        position: 1,
        attack: 1000,
        defense: 500,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: strongWall,
        position: -1, // DEF position
        attack: 200,
        defense: 2500,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: weakAttacker,
      targetCardId: strongWall,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.destroyed).toHaveLength(0); // Neither destroyed
    expect(result.battleResult.damageTo[0].amount).toBe(1500); // 2500 - 1000

    // Verify attacker's controller takes damage
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostLifePoints).toBe(8000 - 1500);

    // Verify both monsters still on field
    expect(gameState?.hostBoard).toHaveLength(1);
    expect(gameState?.opponentBoard).toHaveLength(1);
  });

  it("should result in no destruction and no damage when ATK equals DEF", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attacker = await createTestCard(t, "Attacker", 1500, 1000);
    const defender = await createTestCard(t, "Defender", 500, 1500);

    const hostBoard: BoardCard[] = [
      {
        cardId: attacker,
        position: 1,
        attack: 1500,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: defender,
        position: -1, // DEF position
        attack: 500,
        defense: 1500,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: attacker,
      targetCardId: defender,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.destroyed).toHaveLength(0);
    expect(result.battleResult.damageTo).toHaveLength(0);

    // Verify LP unchanged
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostLifePoints).toBe(8000);
    expect(gameState?.opponentLifePoints).toBe(8000);
  });
});

// =============================================================================
// PROTECTION MECHANICS TESTS
// =============================================================================

describe("Combat System - Protection Mechanics", () => {
  it("should not destroy monster with cannotBeDestroyedByBattle protection", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attacker = await createTestCard(t, "Attacker", 3000, 1000);
    const protectedMonster = await createTestCard(t, "Protected", 1000, 1000);

    const hostBoard: BoardCard[] = [
      {
        cardId: attacker,
        position: 1,
        attack: 3000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const opponentBoard: BoardCard[] = [
      {
        cardId: protectedMonster,
        position: 1,
        attack: 1000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
        cannotBeDestroyedByBattle: true, // Protection
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      opponentBoard,
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: attacker,
      targetCardId: protectedMonster,
    });

    expect(result.success).toBe(true);
    // Damage should still be dealt
    expect(result.battleResult.damageTo[0].amount).toBe(2000); // 3000 - 1000

    // Verify protected monster NOT destroyed
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.opponentBoard).toHaveLength(1);
    expect(gameState?.opponentBoard[0].cardId).toBe(protectedMonster);
  });
});

// =============================================================================
// GAME END CONDITIONS
// =============================================================================

describe("Combat System - Game End Conditions", () => {
  it("should end game when LP reaches 0 from battle damage", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const finisher = await createTestCard(t, "Finisher", 8000, 1000);

    const hostBoard: BoardCard[] = [
      {
        cardId: finisher,
        position: 1,
        attack: 8000,
        defense: 1000,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: finisher,
    });

    expect(result.success).toBe(true);
    expect(result.battleResult.gameEnded).toBe(true);

    // Verify opponent LP is 0
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.opponentLifePoints).toBe(0);
  });
});

// =============================================================================
// ATTACK STATE TRACKING
// =============================================================================

describe("Combat System - Attack State Tracking", () => {
  it("should mark monster as having attacked after battle", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");
    const attacker = await createTestCard(t, "Attacker", 1800, 1200);

    const hostBoard: BoardCard[] = [
      {
        cardId: attacker,
        position: 1,
        attack: 1800,
        defense: 1200,
        hasAttacked: false,
        isFaceDown: false,
      },
    ];

    const { lobbyId, gameStateId } = await createGameWithBattlePhase(
      t,
      host,
      opponent,
      hostBoard,
      [],
      host.id,
      "combat"
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await asHost.mutation(api.gameplay.combatSystem.declareAttack, {
      lobbyId,
      attackerCardId: attacker,
    });

    // Verify hasAttacked flag is set
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.hostBoard[0].hasAttacked).toBe(true);
  });
});
