// @ts-nocheck
/**
 * Phase Management Tests
 *
 * Tests for LunchTable TCG turn structure and phase transitions:
 * - Phase sequence: Draw → Main → Combat → Breakdown Check → End
 * - Skip Combat Phase
 * - Skip to End Phase
 * - Turn validation
 */

import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import schema from "../../schema";
import { modules } from "../../test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// Helper types
type GamePhase =
  | "draw"
  | "main"
  | "combat"
  | "breakdown_check"
  | "end";

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

async function createGameInPhase(
  t: ReturnType<typeof convexTest>,
  host: TestUser,
  opponent: TestUser,
  currentPhase: GamePhase,
  currentTurnPlayerId: Id<"users">
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
      currentPhase,
      turnNumber: 2,
      hostLifePoints: 8000,
      opponentLifePoints: 8000,
      hostClout: 5,
      opponentClout: 5,
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
// PHASE ADVANCE TESTS
// =============================================================================

describe("Phase Management - Advance Phase", () => {
  it("should advance from main to combat", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });

    // advancePhase returns { newPhase, phasesVisited, ... } not { success }
    expect(result.newPhase).toBeDefined();

    // Verify phase advanced to combat
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("combat");
  });

  it("should advance from combat to breakdown_check", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "combat", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });

    // advancePhase returns { newPhase, phasesVisited, ... } not { success }
    expect(result.newPhase).toBeDefined();

    // Verify phase advanced to breakdown_check
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("breakdown_check");
  });

  it("should advance from breakdown_check to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "breakdown_check", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });

    // advancePhase returns { newPhase, phasesVisited, ... } not { success }
    expect(result.newPhase).toBe("end");

    // Verify phase is now end
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });

  it("should reject advance phase when not your turn", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // Opponent's turn
    const { lobbyId } = await createGameInPhase(t, host, opponent, "main", opponent.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId })
    ).rejects.toThrow(/not your turn/i);
  });

  it("should reject advance from end phase", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createGameInPhase(t, host, opponent, "end", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId })
    ).rejects.toThrow(/Cannot advance|Invalid/i);
  });
});

// =============================================================================
// SKIP COMBAT PHASE TESTS
// =============================================================================

describe("Phase Management - Skip Combat Phase", () => {
  it("should skip from main directly to breakdown_check", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId });

    expect(result.success).toBe(true);

    // Verify skipped to breakdown_check
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("breakdown_check");
  });

  it("should allow skip combat phase from combat phase (goes to breakdown_check)", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // In combat phase - skipBattlePhase CAN be called from combat phase
    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "combat", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId });

    expect(result.success).toBe(true);
    expect(result.newPhase).toBe("breakdown_check");

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("breakdown_check");
  });

  it("should reject skip combat phase when in breakdown_check", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // In breakdown_check - cannot skip combat phase from here
    const { lobbyId } = await createGameInPhase(t, host, opponent, "breakdown_check", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    // Note: GAME_CANNOT_ADVANCE_PHASE always returns the same message from ErrorMessages lookup
    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId })
    ).rejects.toThrow(/Cannot advance|End Phase|Battle Phase|Main Phase/i);
  });

  it("should reject skip combat phase when not your turn", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createGameInPhase(
      t,
      host,
      opponent,
      "main",
      opponent.id // Opponent's turn
    );

    const asHost = t.withIdentity({ subject: host.privyId });

    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId })
    ).rejects.toThrow(/not your turn/i);
  });
});

// =============================================================================
// SKIP TO END PHASE TESTS
// =============================================================================

describe("Phase Management - Skip To End Phase", () => {
  it("should skip from main directly to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipToEndPhase, { lobbyId });

    expect(result.success).toBe(true);

    // Verify skipped to end
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });

  it("should skip from combat directly to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "combat", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipToEndPhase, { lobbyId });

    expect(result.success).toBe(true);

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });
});

// =============================================================================
// SKIP BREAKDOWN CHECK TESTS
// =============================================================================

describe("Phase Management - Skip Breakdown Check", () => {
  it("should skip from breakdown_check directly to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "breakdown_check", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipMainPhase2, { lobbyId });

    expect(result.success).toBe(true);

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });

  it("should reject skip breakdown check when not in breakdown_check", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // In main, not breakdown_check
    const { lobbyId } = await createGameInPhase(t, host, opponent, "main", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    // Note: GAME_CANNOT_ADVANCE_PHASE always returns the same message from ErrorMessages lookup
    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipMainPhase2, { lobbyId })
    ).rejects.toThrow(/Cannot advance|End Phase|Battle Phase|Main Phase/i);
  });
});

// =============================================================================
// PHASE SEQUENCE VALIDATION TESTS
// =============================================================================

describe("Phase Management - Phase Sequence", () => {
  it("should follow correct phase sequence: main -> combat -> breakdown_check -> end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    // Phase 1: main -> combat
    await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
    let gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("combat");

    // Phase 2: combat -> breakdown_check
    await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
    gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("breakdown_check");

    // Phase 3: breakdown_check -> end
    await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
    gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });
});
