import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUser } from "./auth";
import { LTCGCards } from "@lunchtable-tcg/cards";
import { LTCGMatch } from "@lunchtable-tcg/match";
import { LTCGStory } from "@lunchtable-tcg/story";
import { createInitialState } from "@lunchtable-tcg/engine";
import type { Command } from "@lunchtable-tcg/engine";

const cards = new LTCGCards(components.lunchtable_tcg_cards as any);
const match = new LTCGMatch(components.lunchtable_tcg_match as any);
const story = new LTCGStory(components.lunchtable_tcg_story as any);

// ── Card Queries ───────────────────────────────────────────────────

export const getAllCards = query({
  args: {},
  handler: async (ctx) => cards.cards.getAllCards(ctx),
});

export const getUserCards = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return cards.cards.getUserCards(ctx, user._id);
  },
});

export const getUserDecks = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return cards.decks.getUserDecks(ctx, user._id);
  },
});

export const getDeckWithCards = query({
  args: { deckId: v.string() },
  handler: async (ctx, args) => cards.decks.getDeckWithCards(ctx, args.deckId),
});

// ── Deck Mutations ─────────────────────────────────────────────────

export const createDeck = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return cards.decks.createDeck(ctx, user._id, args.name);
  },
});

export const saveDeck = mutation({
  args: {
    deckId: v.string(),
    cards: v.array(v.object({ cardDefinitionId: v.string(), quantity: v.number() })),
  },
  handler: async (ctx, args) => cards.decks.saveDeck(ctx, args.deckId, args.cards),
});

export const setActiveDeck = mutation({
  args: { deckId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await cards.decks.setActiveDeck(ctx, user._id, args.deckId);
    await ctx.db.patch(user._id, { activeDeckId: args.deckId });
  },
});

export const selectStarterDeck = mutation({
  args: { deckCode: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const allCards = await cards.cards.getAllCards(ctx);
    await cards.decks.selectStarterDeck(ctx, user._id, args.deckCode, allCards);
  },
});

// ── Story Queries ──────────────────────────────────────────────────

export const getChapters = query({
  args: {},
  handler: async (ctx) => story.chapters.getChapters(ctx, { status: "published" }),
});

export const getChapterStages = query({
  args: { chapterId: v.string() },
  handler: async (ctx, args) => story.stages.getStages(ctx, args.chapterId),
});

export const getStoryProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return story.progress.getProgress(ctx, user._id);
  },
});

export const getStageProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return story.progress.getStageProgress(ctx, user._id);
  },
});

// ── Start Story Battle ─────────────────────────────────────────────

export const startStoryBattle = mutation({
  args: {
    chapterId: v.string(),
    stageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (!user.activeDeckId) throw new Error("No active deck set");
    const deckData = await cards.decks.getDeckWithCards(ctx, user.activeDeckId);
    if (!deckData) throw new Error("Deck not found");

    const playerDeck: string[] = [];
    for (const card of (deckData as any).cards ?? []) {
      for (let i = 0; i < (card.quantity ?? 1); i++) {
        playerDeck.push(card.cardDefinitionId);
      }
    }
    if (playerDeck.length < 30) throw new Error("Deck must have at least 30 cards");

    const stages = await story.stages.getStages(ctx, args.chapterId);
    const stageNum = args.stageNumber ?? 1;
    const stage = (stages ?? []).find((s: any) => s.stageNumber === stageNum);

    const allCards = await cards.cards.getAllCards(ctx);
    const aiDeck = buildAIDeck(allCards);

    const cardLookup: Record<string, any> = {};
    for (const c of allCards ?? []) {
      cardLookup[c._id] = c;
    }

    const initialState = createInitialState(
      cardLookup,
      {},
      user._id,
      "cpu",
      playerDeck,
      aiDeck,
      "host",
    );

    const matchId = await match.createMatch(ctx, {
      hostId: user._id,
      awayId: "cpu",
      mode: "story",
      hostDeck: playerDeck,
      awayDeck: aiDeck,
      isAIOpponent: true,
    });

    await match.startMatch(ctx, {
      matchId,
      initialState: JSON.stringify(initialState),
    });

    return { matchId, stageNumber: stageNum };
  },
});

function buildAIDeck(allCards: any[]): string[] {
  const deck: string[] = [];
  const stereotypes = allCards.filter((c: any) => c.cardType === "stereotype" && c.isActive);
  const spells = allCards.filter((c: any) => c.cardType === "spell" && c.isActive);
  const traps = allCards.filter((c: any) => c.cardType === "trap" && c.isActive);

  for (const card of stereotypes.slice(0, 7)) {
    for (let i = 0; i < 3; i++) deck.push(card._id);
  }
  for (const card of spells.slice(0, 6)) {
    for (let i = 0; i < 2; i++) deck.push(card._id);
  }
  for (const card of traps.slice(0, 4)) {
    for (let i = 0; i < 2; i++) deck.push(card._id);
  }

  while (deck.length < 40 && allCards.length > 0) {
    deck.push(allCards[deck.length % allCards.length]._id);
  }

  return deck.slice(0, 40);
}

// ── Submit Action ──────────────────────────────────────────────────

export const submitAction = mutation({
  args: {
    matchId: v.string(),
    command: v.string(),
    seat: v.union(v.literal("host"), v.literal("away")),
  },
  handler: async (ctx, args) => {
    const result = await match.submitAction(ctx, {
      matchId: args.matchId,
      command: args.command,
      seat: args.seat,
    });

    const meta = await match.getMatchMeta(ctx, { matchId: args.matchId });
    if ((meta as any)?.status === "active" && (meta as any)?.isAIOpponent) {
      const events = JSON.parse(result.events);
      const gameOver = events.some((e: any) => e.type === "GAME_OVER");
      if (!gameOver && args.seat === "host") {
        await ctx.scheduler.runAfter(500, internal.game.executeAITurn, {
          matchId: args.matchId,
        });
      }
    }

    return result;
  },
});

// ── AI Turn ────────────────────────────────────────────────────────

export const executeAITurn = internalMutation({
  args: { matchId: v.string() },
  handler: async (ctx, args) => {
    const viewJson = await match.getPlayerView(ctx, {
      matchId: args.matchId,
      seat: "away",
    });
    if (!viewJson) return;

    const command: Command = { type: "END_TURN" };

    try {
      const result = await match.submitAction(ctx, {
        matchId: args.matchId,
        command: JSON.stringify(command),
        seat: "away",
      });

      const events = JSON.parse(result.events);
      const gameOver = events.some((e: any) => e.type === "GAME_OVER");
      if (gameOver) return;
    } catch {
      // Game ended or error — stop
    }
  },
});

// ── Game View Queries ──────────────────────────────────────────────

export const getPlayerView = query({
  args: {
    matchId: v.string(),
    seat: v.union(v.literal("host"), v.literal("away")),
  },
  handler: async (ctx, args) => match.getPlayerView(ctx, args),
});

export const getMatchMeta = query({
  args: { matchId: v.string() },
  handler: async (ctx, args) => match.getMatchMeta(ctx, args),
});

export const getRecentEvents = query({
  args: { matchId: v.string(), sinceVersion: v.number() },
  handler: async (ctx, args) => match.getRecentEvents(ctx, args),
});
