/**
 * Ranked Mode Gating Tests (Agent cards)
 *
 * Ensures Agent cards are Story + Casual only and blocked from Ranked matchmaking.
 */

import { api } from "@convex/_generated/api";
import type { MutationCtx } from "@convex/_generated/server";
import schema from "@convex/schema";
import { modules } from "@convex/test.setup";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: Required for TS2589 workaround
const apiAny = api as any;
const lobbyApi = apiAny["gameplay/games/lobby"];

const createTestInstance = () => convexTest(schema, modules);

async function createTestUser(
  t: ReturnType<typeof createTestInstance>,
  email: string,
  username: string
) {
  const privyId = `did:privy:test_${email.replace(/[^a-z0-9]/gi, "_")}`;
  const userId = await t.run(async (ctx: MutationCtx) => {
    return await ctx.db.insert("users", {
      email,
      username,
      privyId,
      createdAt: Date.now(),
    });
  });
  return { userId, privyId };
}

describe("Ranked gating - Agent cards", () => {
  it("should reject creating a ranked lobby when active deck contains an Agent card", async () => {
    const t = createTestInstance();

    const { userId, privyId } = await createTestUser(t, "rankedagent@test.com", "rankedagent");
    const asUser = t.withIdentity({ subject: privyId });

    const deckId = await t.run(async (ctx: MutationCtx) => {
      // Create 1 agent + 29 filler cards (30 total).
      const agentCardId = await ctx.db.insert("cardDefinitions", {
        name: "Test Agent",
        rarity: "common",
        cardType: "agent",
        archetype: "neutral",
        cost: 4,
        attack: 1000,
        defense: 1000,
        isActive: true,
        createdAt: Date.now(),
      });

      const fillerIds = [];
      for (let i = 0; i < 29; i++) {
        const id = await ctx.db.insert("cardDefinitions", {
          name: `Test Filler ${i}`,
          rarity: "common",
          cardType: "creature",
          archetype: "neutral",
          cost: 3,
          attack: 1000,
          defense: 1000,
          isActive: true,
          createdAt: Date.now(),
        });
        fillerIds.push(id);
      }

      const deckId = await ctx.db.insert("userDecks", {
        userId,
        name: "Agent Deck",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("deckCards", {
        deckId,
        cardDefinitionId: agentCardId,
        quantity: 1,
      });

      for (const cardId of fillerIds) {
        await ctx.db.insert("deckCards", {
          deckId,
          cardDefinitionId: cardId,
          quantity: 1,
        });
      }

      // Set as active deck
      await ctx.db.patch(userId, { activeDeckId: deckId });

      return deckId;
    });

    expect(deckId).toBeDefined();

    await expect(
      asUser.mutation(lobbyApi.createLobby, { mode: "ranked", isPrivate: false })
    ).rejects.toThrowError(/Agent cards are not legal in Ranked\./);
  });
});

