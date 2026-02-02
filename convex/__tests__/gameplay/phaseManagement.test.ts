// @ts-nocheck
/**
 * Phase Management Tests
 *
 * Tests for Yu-Gi-Oh turn structure and phase transitions:
 * - Phase sequence: Draw → Standby → Main1 → Battle → Main2 → End
 * - Skip Battle Phase
 * - Skip to End Phase
 * - Turn validation
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
      hostMana: 5,
      opponentMana: 5,
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
  it("should advance from main1 to battle_start/battle", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main1", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });

    // advancePhase returns { newPhase, phasesVisited, ... } not { success }
    expect(result.newPhase).toBeDefined();

    // Verify phase advanced (should auto-advance through battle_start to battle)
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(["battle_start", "battle"]).toContain(gameState?.currentPhase);
  });

  it("should advance from battle to main2", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "battle", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });

    // advancePhase returns { newPhase, phasesVisited, ... } not { success }
    expect(result.newPhase).toBeDefined();

    // Verify phase advanced (should auto-advance through battle_end to main2)
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(["battle_end", "main2"]).toContain(gameState?.currentPhase);
  });

  it("should advance from main2 to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main2", host.id);

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
    const { lobbyId } = await createGameInPhase(t, host, opponent, "main1", opponent.id);

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
// SKIP BATTLE PHASE TESTS
// =============================================================================

describe("Phase Management - Skip Battle Phase", () => {
  it("should skip from main1 directly to main2", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main1", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId });

    expect(result.success).toBe(true);

    // Verify skipped to main2
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("main2");
  });

  it("should allow skip battle phase from battle phase (goes to main2)", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // In battle phase - skipBattlePhase CAN be called from battle phase
    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "battle", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId });

    expect(result.success).toBe(true);
    expect(result.newPhase).toBe("main2");

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("main2");
  });

  it("should reject skip battle phase when in main2", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // In main2 - cannot skip battle phase from here
    const { lobbyId } = await createGameInPhase(t, host, opponent, "main2", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    // Note: GAME_CANNOT_ADVANCE_PHASE always returns the same message from ErrorMessages lookup
    await expect(
      asHost.mutation(api.gameplay.phaseManager.skipBattlePhase, { lobbyId })
    ).rejects.toThrow(/Cannot advance|End Phase|Battle Phase|Main Phase/i);
  });

  it("should reject skip battle phase when not your turn", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId } = await createGameInPhase(
      t,
      host,
      opponent,
      "main1",
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
  it("should skip from main1 directly to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main1", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipToEndPhase, { lobbyId });

    expect(result.success).toBe(true);

    // Verify skipped to end
    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });

  it("should skip from battle directly to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "battle", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipToEndPhase, { lobbyId });

    expect(result.success).toBe(true);

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });
});

// =============================================================================
// SKIP MAIN PHASE 2 TESTS
// =============================================================================

describe("Phase Management - Skip Main Phase 2", () => {
  it("should skip from main2 directly to end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main2", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    const result = await asHost.mutation(api.gameplay.phaseManager.skipMainPhase2, { lobbyId });

    expect(result.success).toBe(true);

    const gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });

  it("should reject skip main phase 2 when not in main2", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    // In main1, not main2
    const { lobbyId } = await createGameInPhase(t, host, opponent, "main1", host.id);

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
  it("should follow correct phase sequence: main1 -> battle -> main2 -> end", async () => {
    const t = convexTest(schema, modules);

    const host = await createTestUser(t, "host@test.com", "host");
    const opponent = await createTestUser(t, "opponent@test.com", "opponent");

    const { lobbyId, gameStateId } = await createGameInPhase(t, host, opponent, "main1", host.id);

    const asHost = t.withIdentity({ subject: host.privyId });

    // Phase 1: main1 -> battle
    await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
    let gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(["battle_start", "battle"]).toContain(gameState?.currentPhase);

    // If we're at battle_start, advance to battle
    if (gameState?.currentPhase === "battle_start") {
      await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
      gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    }

    // Phase 2: battle -> main2
    await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
    gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(["battle_end", "main2"]).toContain(gameState?.currentPhase);

    // If we're at battle_end, advance to main2
    if (gameState?.currentPhase === "battle_end") {
      await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
      gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    }
    expect(gameState?.currentPhase).toBe("main2");

    // Phase 3: main2 -> end
    await asHost.mutation(api.gameplay.phaseManager.advancePhase, { lobbyId });
    gameState = await t.run(async (ctx) => ctx.db.get(gameStateId));
    expect(gameState?.currentPhase).toBe("end");
  });
});
