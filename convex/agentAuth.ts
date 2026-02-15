import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { LTCGCards } from "@lunchtable-tcg/cards";
import { LTCGMatch } from "@lunchtable-tcg/match";
import { createInitialState, DEFAULT_CONFIG, buildCardLookup } from "@lunchtable-tcg/engine";

const cards = new LTCGCards(components.lunchtable_tcg_cards as any);
const match = new LTCGMatch(components.lunchtable_tcg_match as any);

// ── Agent Queries ─────────────────────────────────────────────────

export const getAgentByKeyHash = query({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agents")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", args.apiKeyHash))
      .first();
  },
});

// ── Agent Registration ────────────────────────────────────────────

export const registerAgent = mutation({
  args: {
    name: v.string(),
    apiKeyHash: v.string(),
    apiKeyPrefix: v.string(),
  },
  handler: async (ctx, args) => {
    // Create a user record for the agent
    const userId = await ctx.db.insert("users", {
      privyId: `agent:${args.apiKeyHash.slice(0, 16)}`,
      username: `agent_${args.name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 14)}`,
      createdAt: Date.now(),
    });

    const agentId = await ctx.db.insert("agents", {
      name: args.name,
      apiKeyHash: args.apiKeyHash,
      apiKeyPrefix: args.apiKeyPrefix,
      userId,
      isActive: true,
      createdAt: Date.now(),
    });

    return { agentId, userId };
  },
});

// ── Agent Game Actions ────────────────────────────────────────────

export const agentStartBattle = mutation({
  args: {
    agentUserId: v.id("users"),
    chapterId: v.string(),
    stageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.agentUserId);
    if (!user) throw new Error("Agent user not found");

    if (!user.activeDeckId) throw new Error("No active deck set. Select a starter deck first.");
    const deckData = await cards.decks.getDeckWithCards(ctx, user.activeDeckId);
    if (!deckData) throw new Error("Deck not found");

    const playerDeck: string[] = [];
    for (const card of (deckData as any).cards ?? []) {
      for (let i = 0; i < (card.quantity ?? 1); i++) {
        playerDeck.push(card.cardDefinitionId);
      }
    }
    if (playerDeck.length < 30) throw new Error("Deck must have at least 30 cards");

    const allCards = await cards.cards.getAllCards(ctx);

    // Build AI deck
    const active = (allCards ?? []).filter((c: any) => c.isActive);
    const stereotypes = active.filter((c: any) => c.cardType === "stereotype");
    const spells = active.filter((c: any) => c.cardType === "spell");
    const traps = active.filter((c: any) => c.cardType === "trap");
    const aiDeck: string[] = [];
    for (const card of stereotypes.slice(0, 7)) {
      for (let i = 0; i < 3; i++) aiDeck.push(card._id);
    }
    for (const card of spells.slice(0, 6)) {
      for (let i = 0; i < 2; i++) aiDeck.push(card._id);
    }
    for (const card of traps.slice(0, 4)) {
      for (let i = 0; i < 2; i++) aiDeck.push(card._id);
    }
    while (aiDeck.length < 40 && active.length > 0) {
      aiDeck.push(active[aiDeck.length % active.length]._id);
    }
    const finalAiDeck = aiDeck.slice(0, 40);

    const cardLookup = buildCardLookup(allCards as any);

    const initialState = createInitialState(
      cardLookup,
      DEFAULT_CONFIG,
      user._id,
      "cpu",
      playerDeck,
      finalAiDeck,
      "host",
    );

    const matchId = await match.createMatch(ctx, {
      hostId: user._id,
      awayId: "cpu",
      mode: "story",
      hostDeck: playerDeck,
      awayDeck: finalAiDeck,
      isAIOpponent: true,
    });

    await match.startMatch(ctx, {
      matchId,
      initialState: JSON.stringify(initialState),
    });

    return { matchId, stageNumber: args.stageNumber ?? 1 };
  },
});
