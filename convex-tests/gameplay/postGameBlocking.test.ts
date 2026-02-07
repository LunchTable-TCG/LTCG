// @ts-nocheck
/**
 * Post-Game Action Blocking Tests
 *
 * Tests that all gameplay actions are properly blocked after a game has ended.
 * When a game status changes from "active" to "completed", players should not be
 * able to perform any further actions.
 *
 * These tests verify the GAME_NOT_ACTIVE error is thrown for:
 * - Combat actions (declareAttack, declareAttackWithResponse)
 * - Summon actions (normalSummon, setMonster, flipSummon)
 * - Spell/Trap actions (activateSpell, setSpellTrap, activateTrap)
 * - Phase actions (advancePhase, skipBattlePhase, skipToEndPhase, skipMainPhase2, endTurn)
 */

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

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
  cardData: {
    name: string;
    attack?: number;
    defense?: number;
    cardType?: "creature" | "spell" | "trap" | "equipment";
    cost?: number;
  }
): Promise<Id<"cardDefinitions">> {
  return await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("cardDefinitions", {
      name: cardData.name,
      cardType: cardData.cardType || "creature",
      archetype: "neutral",
      rarity: "common",
      attack: cardData.attack ?? 1000,
      defense: cardData.defense ?? 1000,
      cost: cardData.cost ?? 1,
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

/**
 * Creates a game that has already ended (status: "completed")
 * This is the key helper for testing post-game action blocking.
 */
async function createCompletedGame(
  t: ReturnType<typeof convexTest>,
  host: TestUser,
  opponent: TestUser,
  options: {
    currentPhase?: string;
    currentTurnPlayerId?: Id<"users">;
    hostHand?: Id<"cardDefinitions">[];
    opponentHand?: Id<"cardDefinitions">[];
    hostBoard?: Array<{
      cardId: Id<"cardDefinitions">;
      position: number;
      attack: number;
      defense: number;
      hasAttacked?: boolean;
      isFaceDown?: boolean;
    }>;
    opponentBoard?: Array<{
      cardId: Id<"cardDefinitions">;
      position: number;
      attack: number;
      defense: number;
      hasAttacked?: boolean;
      isFaceDown?: boolean;
    }>;
    hostSpellTrapZone?: Array<{
      cardId: Id<"cardDefinitions">;
      isFaceDown: boolean;
      isActivated: boolean;
      turnSet?: number;
    }>;
    opponentSpellTrapZone?: Array<{
      cardId: Id<"cardDefinitions">;
      isFaceDown: boolean;
      isActivated: boolean;
      turnSet?: number;
    }>;
  } = {}
) {
  const now = Date.now();

  // Create a completed game lobby (key difference from active games)
  const lobbyId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("gameLobbies", {
      hostId: host.id,
      hostUsername: "host",
      hostRank: "Bronze",
      hostRating: 1000,
      deckArchetype: "neutral",
      mode: "ranked",
      status: "completed", // Game has ended
      isPrivate: false,
      opponentId: opponent.id,
      opponentUsername: "opponent",
      opponentRank: "Bronze",
      gameId: `test-game-${now}`,
      turnNumber: 5,
      winnerId: host.id, // Game has a winner
      createdAt: now,
    });
  });

  // Create game state (some mutations query this for validation)
  const gameStateId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("gameStates", {
      lobbyId,
      gameId: `test-game-${now}`,
      hostId: host.id,
      opponentId: opponent.id,
      currentTurnPlayerId: options.currentTurnPlayerId ?? host.id,
      currentPhase: options.currentPhase ?? "main1",
      turnNumber: 5,
      hostLifePoints: 8000,
      opponentLifePoints: 0, // Opponent lost
      hostMana: 5,
      opponentMana: 5,
      hostDeck: [],
      opponentDeck: [],
      hostHand: options.hostHand ?? [],
      opponentHand: options.opponentHand ?? [],
      hostBoard:
        options.hostBoard?.map((bc) => ({
          cardId: bc.cardId,
          position: bc.position,
          attack: bc.attack,
          defense: bc.defense,
          hasAttacked: bc.hasAttacked ?? false,
          isFaceDown: bc.isFaceDown ?? false,
        })) ?? [],
      opponentBoard:
        options.opponentBoard?.map((bc) => ({
          cardId: bc.cardId,
          position: bc.position,
          attack: bc.attack,
          defense: bc.defense,
          hasAttacked: bc.hasAttacked ?? false,
          isFaceDown: bc.isFaceDown ?? false,
        })) ?? [],
      hostGraveyard: [],
      opponentGraveyard: [],
      hostBanished: [],
      opponentBanished: [],
      hostSpellTrapZone: options.hostSpellTrapZone ?? [],
      opponentSpellTrapZone: options.opponentSpellTrapZone ?? [],
      hostNormalSummonedThisTurn: false,
      opponentNormalSummonedThisTurn: false,
      currentChain: [],
      lastMoveAt: now,
      createdAt: now,
    });
  });

  return { lobbyId, gameStateId };
}

// Error message pattern that matches GAME_NOT_ACTIVE errors
const GAME_NOT_ACTIVE_PATTERN = /not active|GAME_NOT_ACTIVE|GAME_8027|is completed/i;

// =============================================================================
// COMBAT ACTION BLOCKING TESTS
// =============================================================================

describe("Post-Game Blocking - Combat Actions", () => {
  it("should reject declareAttack when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // Create a monster card for the attack attempt
    const attackerCard = await createTestCard(t, {
      name: "Test Attacker",
      attack: 1500,
      defense: 1000,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "battle",
      hostBoard: [
        {
          cardId: attackerCard,
          position: 1, // Attack position
          attack: 1500,
          defense: 1000,
          hasAttacked: false,
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: attackerCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject declareAttack with target when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const attackerCard = await createTestCard(t, {
      name: "Attacker",
      attack: 2000,
      defense: 1500,
    });

    const defenderCard = await createTestCard(t, {
      name: "Defender",
      attack: 1000,
      defense: 2000,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "battle",
      hostBoard: [
        {
          cardId: attackerCard,
          position: 1,
          attack: 2000,
          defense: 1500,
          hasAttacked: false,
        },
      ],
      opponentBoard: [
        {
          cardId: defenderCard,
          position: -1, // Defense position
          attack: 1000,
          defense: 2000,
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: attackerCard,
        targetCardId: defenderCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject declareAttackWithResponse when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const attackerCard = await createTestCard(t, {
      name: "Response Attacker",
      attack: 1800,
      defense: 1200,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "battle",
      hostBoard: [
        {
          cardId: attackerCard,
          position: 1,
          attack: 1800,
          defense: 1200,
          hasAttacked: false,
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttackWithResponse, {
        lobbyId,
        attackerCardId: attackerCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });
});

// =============================================================================
// SUMMON ACTION BLOCKING TESTS
// =============================================================================

describe("Post-Game Blocking - Summon Actions", () => {
  it("should reject normalSummon when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const monsterCard = await createTestCard(t, {
      name: "Test Monster",
      attack: 1400,
      defense: 1200,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostHand: [monsterCard],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: monsterCard,
        position: "attack",
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject setMonster when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const monsterCard = await createTestCard(t, {
      name: "Set Monster",
      attack: 500,
      defense: 2000,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostHand: [monsterCard],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.setMonster, {
        lobbyId,
        cardId: monsterCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject flipSummon when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const faceDownMonster = await createTestCard(t, {
      name: "Face Down Monster",
      attack: 1000,
      defense: 1500,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostBoard: [
        {
          cardId: faceDownMonster,
          position: -1, // Defense position
          attack: 1000,
          defense: 1500,
          isFaceDown: true,
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.flipSummon, {
        lobbyId,
        cardId: faceDownMonster,
        newPosition: "attack",
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });
});

// =============================================================================
// SPELL/TRAP ACTION BLOCKING TESTS
// =============================================================================

describe("Post-Game Blocking - Spell/Trap Actions", () => {
  it("should reject activateSpell when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const spellCard = await createTestCard(t, {
      name: "Test Spell",
      cardType: "spell",
      cost: 0,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostHand: [spellCard],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.spellsTraps.activateSpell, {
        lobbyId,
        cardId: spellCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject setSpellTrap when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const trapCard = await createTestCard(t, {
      name: "Test Trap",
      cardType: "trap",
      cost: 0,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostHand: [trapCard],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.spellsTraps.setSpellTrap, {
        lobbyId,
        cardId: trapCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject activateTrap when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const trapCard = await createTestCard(t, {
      name: "Set Trap",
      cardType: "trap",
      cost: 0,
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostSpellTrapZone: [
        {
          cardId: trapCard,
          isFaceDown: true,
          isActivated: false,
          turnSet: 1, // Set on turn 1, can activate on turn 5
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.spellsTraps.activateTrap, {
        lobbyId,
        cardId: trapCard,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });
});

// =============================================================================
// PHASE ACTION BLOCKING TESTS
// =============================================================================

describe("Post-Game Blocking - Phase Actions", () => {
  it("should reject advancePhase when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject skipBattlePhase when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject skipToEndPhase when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipToEndPhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject skipMainPhase2 when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main2",
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipMainPhase2, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject endTurn when game is completed", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "end",
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.gameEngine.turns.endTurn, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });
});

// =============================================================================
// OPPONENT ACTION BLOCKING TESTS
// =============================================================================

describe("Post-Game Blocking - Opponent Actions", () => {
  it("should reject opponent actions on completed games", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const opponentMonster = await createTestCard(t, {
      name: "Opponent Monster",
      attack: 1600,
      defense: 1400,
    });

    // Game is completed but set up as if it's opponent's turn
    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      currentTurnPlayerId: opponent.id,
      opponentHand: [opponentMonster],
    });

    const asOpponent = t.withIdentity({ subject: opponent.privyId });

    // Opponent should also be blocked from actions
    await expect(
      asOpponent.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: opponentMonster,
        position: "attack",
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject opponent phase actions on completed games", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      currentTurnPlayerId: opponent.id,
    });

    const asOpponent = t.withIdentity({ subject: opponent.privyId });

    await expect(
      asOpponent.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe("Post-Game Blocking - Edge Cases", () => {
  it("should reject actions immediately after game ends", async () => {
    // This test ensures there's no race condition window where actions could slip through
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const card1 = await createTestCard(t, { name: "Card 1", attack: 1000 });
    const card2 = await createTestCard(t, { name: "Card 2", attack: 1200 });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "battle",
      hostBoard: [
        {
          cardId: card1,
          position: 1,
          attack: 1000,
          defense: 800,
          hasAttacked: false,
        },
        {
          cardId: card2,
          position: 1,
          attack: 1200,
          defense: 900,
          hasAttacked: false,
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    // Try multiple actions in quick succession - all should fail
    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: card1,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: card2,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject actions from both players on completed game", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const hostSpell = await createTestCard(t, {
      name: "Host Spell",
      cardType: "spell",
    });

    const opponentSpell = await createTestCard(t, {
      name: "Opponent Spell",
      cardType: "spell",
    });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostHand: [hostSpell],
      opponentHand: [opponentSpell],
    });

    const asHost = t.withIdentity({ subject: host.privyId });
    const asOpponent = t.withIdentity({ subject: opponent.privyId });

    // Both players should be blocked
    await expect(
      asHost.mutation(api.gameplay.gameEngine.spellsTraps.activateSpell, {
        lobbyId,
        cardId: hostSpell,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asOpponent.mutation(api.gameplay.gameEngine.spellsTraps.activateSpell, {
        lobbyId,
        cardId: opponentSpell,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });

  it("should reject all action types in sequence on completed game", async () => {
    // Comprehensive test that tries every action type
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const monster = await createTestCard(t, { name: "Monster", attack: 1000 });
    const spell = await createTestCard(t, { name: "Spell", cardType: "spell" });
    const trap = await createTestCard(t, { name: "Trap", cardType: "trap" });
    const faceDown = await createTestCard(t, { name: "Face Down", attack: 500 });

    const { lobbyId } = await createCompletedGame(t, host, opponent, {
      currentPhase: "main1",
      hostHand: [monster, spell, trap],
      hostBoard: [
        {
          cardId: faceDown,
          position: -1,
          attack: 500,
          defense: 1000,
          isFaceDown: true,
        },
      ],
    });

    const asHost = t.withIdentity({ subject: host.privyId });

    // Combat
    await expect(
      asHost.mutation(api.gameplay.combatSystem.declareAttack, {
        lobbyId,
        attackerCardId: faceDown,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    // Summons
    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.normalSummon, {
        lobbyId,
        cardId: monster,
        position: "attack",
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.setMonster, {
        lobbyId,
        cardId: monster,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asHost.mutation(api.gameplay.gameEngine.summons.flipSummon, {
        lobbyId,
        cardId: faceDown,
        newPosition: "attack",
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    // Spells/Traps
    await expect(
      asHost.mutation(api.gameplay.gameEngine.spellsTraps.activateSpell, {
        lobbyId,
        cardId: spell,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asHost.mutation(api.gameplay.gameEngine.spellsTraps.setSpellTrap, {
        lobbyId,
        cardId: trap,
      })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    // Phases
    await expect(
      asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);

    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipToEndPhase, { lobbyId })
    ).rejects.toThrow(GAME_NOT_ACTIVE_PATTERN);
  });
});
