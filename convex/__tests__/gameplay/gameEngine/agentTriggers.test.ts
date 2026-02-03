/**
 * Agent turn trigger tests
 *
 * Verifies:
 * - on_turn_end and on_turn_start triggers fire during endTurn transition
 * - randomChoice is deterministic (hash-based)
 */

import { api } from "@convex/_generated/api";
import type { MutationCtx } from "@convex/_generated/server";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const apiAny = api as any;
const turnsApi = apiAny["gameplay/gameEngine/turns"];

const createTestInstance = () => convexTest(schema, modules);

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

describe("Agent turn triggers", () => {
  it("should execute on_turn_end and on_turn_start triggers during endTurn", async () => {
    const t = createTestInstance();

    const privyId = "did:privy:test_agent_triggers";
    const hostId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("users", {
        username: "host",
        email: "agenttriggers_host@test.com",
        privyId,
        createdAt: Date.now(),
      });
    });
    const opponentId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("users", {
        username: "opponent",
        email: "agenttriggers_opp@test.com",
        privyId: "did:privy:test_agent_triggers_opp",
        createdAt: Date.now(),
      });
    });

    const asHost = t.withIdentity({ subject: privyId });

    const lobbyId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("gameLobbies", {
        hostId,
        hostUsername: "host",
        hostRank: "Bronze",
        hostRating: 1000,
        deckArchetype: "neutral",
        mode: "casual",
        status: "active",
        isPrivate: false,
        opponentId,
        opponentUsername: "opponent",
        opponentRank: "Bronze",
        gameId: "test-agent-triggers",
        turnNumber: 1,
        currentTurnPlayerId: hostId,
        createdAt: Date.now(),
      });
    });

    const agentCardId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Test Agent Trigger",
        rarity: "rare",
        cardType: "agent",
        archetype: "neutral",
        cost: 4,
        attack: 1000,
        defense: 1000,
        ability: {
          effects: [
            { type: "damage", trigger: "on_turn_end", value: 111, targetOwner: "opponent" },
            {
              type: "randomChoice",
              trigger: "on_turn_start",
              choices: [
                { type: "damage", trigger: "on_turn_start", value: 222, targetOwner: "opponent" },
                { type: "damage", trigger: "on_turn_start", value: 333, targetOwner: "opponent" },
              ],
            },
          ],
          spellSpeed: 1,
        },
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const opponentDeckCardId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("cardDefinitions", {
        name: "Opponent Deck Card",
        rarity: "common",
        cardType: "creature",
        archetype: "neutral",
        cost: 1,
        attack: 500,
        defense: 500,
        isActive: true,
        createdAt: Date.now(),
      });
    });

    const gameStateId = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.insert("gameStates", {
        lobbyId,
        gameId: "test-agent-triggers",
        hostId,
        opponentId,
        currentTurnPlayerId: hostId,
        currentPhase: "end",
        turnNumber: 1,
        hostLifePoints: 8000,
        opponentLifePoints: 8000,
        hostMana: 0,
        opponentMana: 0,
        hostDeck: [],
        opponentDeck: [opponentDeckCardId],
        hostHand: [],
        opponentHand: [],
        hostBoard: [
          {
            cardId: agentCardId,
            position: 1,
            attack: 1000,
            defense: 1000,
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
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

    expect(gameStateId).toBeDefined();

    // Execute end turn (host -> opponent; turn 1 -> 2).
    const result = await asHost.mutation(turnsApi.endTurn, { lobbyId });
    expect(result.success).toBe(true);

    const updated = await t.run(async (ctx: MutationCtx) => {
      return await ctx.db.get(gameStateId);
    });

    expect(updated?.turnNumber).toBe(2);
    expect(updated?.currentTurnPlayerId).toBe(opponentId);

    const seed = `test-agent-triggers|2|${agentCardId}|1|0`;
    const choiceIndex = fnv1a32(seed) % 2;
    const expectedStartDamage = choiceIndex === 0 ? 222 : 333;

    // on_turn_end: -111, on_turn_start: -(222 or 333)
    expect(updated?.opponentLifePoints).toBe(8000 - 111 - expectedStartDamage);
  });
});

