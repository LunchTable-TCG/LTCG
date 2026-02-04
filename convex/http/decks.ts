/**
 * Deck & Card API Endpoints
 *
 * Provides access to card catalog, user decks, and starter decks.
 * Used by elizaOS agents to browse cards and manage decks.
 */

import type { Id } from "../_generated/dataModel";
import type {
  CardDefinition,
  DeckInfo,
  DeckSummary,
  MutationFunction,
  QueryFunction,
} from "./lib/apiHelpers";
import { authHttpAction } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  getQueryParam,
  parseJsonBody,
  successResponse,
  validateRequiredFields,
} from "./middleware/responses";

// Type-safe API references to avoid TS2589
const getUserDecksInternalQuery = require("../_generated/api").internal.core.decks
  .getUserDecksInternal as QueryFunction<{ userId: Id<"users"> }, DeckSummary[]>;

const getDeckWithCardsQuery = require("../_generated/api").api.core.decks
  .getDeckWithCards as QueryFunction<{ deckId: Id<"decks">; userId: Id<"users"> }, DeckInfo | null>;

const getStarterDecksQuery = require("../_generated/api").api.agents
  .getStarterDecks as QueryFunction<
  Record<string, never>,
  Array<{ code: string; name: string; archetype: string }>
>;

const createDeckMutation = require("../_generated/api").api.core.decks
  .createDeck as MutationFunction<
  {
    userId: Id<"users">;
    name: string;
    cardDefinitionIds: Id<"cardDefinitions">[];
    archetype: string;
  },
  Id<"decks">
>;

const getAllCardDefinitionsQuery = require("../_generated/api").api.core.cards
  .getAllCardDefinitions as QueryFunction<Record<string, never>, CardDefinition[]>;

const getCardDefinitionQuery = require("../_generated/api").api.core.cards
  .getCardDefinition as QueryFunction<
  { cardDefinitionId: Id<"cardDefinitions"> },
  CardDefinition | null
>;

const selectStarterDeckInternalMutation = require("../_generated/api").internal.agents
  .selectStarterDeckInternal as MutationFunction<
  { userId: Id<"users">; starterDeckCode: string },
  { success: boolean; deckId: Id<"decks"> }
>;

/**
 * GET /api/agents/decks
 * Get all decks for authenticated agent
 * Requires API key authentication
 */
export const getUserDecks = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Get user's decks using internal query (accepts userId directly)
    const decks = await ctx.runQuery(getUserDecksInternalQuery, {
      userId: auth.userId,
    });

    // Format deck data (internal query already returns formatted data)
    const formattedDecks = decks.map((deck) => ({
      deckId: deck._id,
      name: deck.name,
      archetype: deck.archetype,
      cardCount: deck.cardCount,
      isValid: deck.isValid,
      isActive: deck.isActive,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    }));

    return successResponse({
      decks: formattedDecks,
      count: formattedDecks.length,
    });
  } catch (error) {
    return errorResponse("FETCH_DECKS_FAILED", "Failed to fetch decks", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/decks/:id
 * Get detailed deck information including card list
 * Requires API key authentication
 */
export const getDeck = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const deckId = getQueryParam(request, "deckId");

    if (!deckId) {
      return errorResponse("MISSING_DECK_ID", "deckId query parameter is required", 400);
    }

    // Get deck with cards
    const deck = await ctx.runQuery(getDeckWithCardsQuery, {
      deckId: deckId as Id<"decks">,
      userId: auth.userId,
    });

    if (!deck) {
      return errorResponse("DECK_NOT_FOUND", "Deck not found", 404);
    }

    // Format deck with full card details
    return successResponse({
      deckId: deck._id,
      name: deck.name,
      archetype: deck.archetype,
      cards: deck.cardsWithDetails, // Includes card definitions
      isValid: deck.isValid,
      isActive: deck.isActive,
      validationErrors: deck.validationErrors || [],
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    });
  } catch (error) {
    return errorResponse("FETCH_DECK_FAILED", "Failed to fetch deck", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/starter-decks
 * Get available starter deck codes
 * Requires API key authentication
 */
export const getStarterDecks = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Get starter decks
    const starterDecks = await ctx.runQuery(getStarterDecksQuery, {});

    return successResponse({
      starterDecks,
    });
  } catch (error) {
    return errorResponse("FETCH_STARTER_DECKS_FAILED", "Failed to fetch starter decks", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/agents/decks/create
 * Create a new deck
 * Requires API key authentication
 */
export const createDeck = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      name: string;
      cardIds: string[];
      archetype: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["name", "cardIds", "archetype"]);
    if (validation) return validation;

    // Validate deck size (40-60 cards for main deck)
    if (body.cardIds.length < 40 || body.cardIds.length > 60) {
      return errorResponse("INVALID_DECK_SIZE", "Deck must contain 40-60 cards", 400, {
        cardCount: body.cardIds.length,
      });
    }

    // Create deck
    const deckId = await ctx.runMutation(createDeckMutation, {
      userId: auth.userId,
      name: body.name,
      cardDefinitionIds: body.cardIds as Id<"cardDefinitions">[],
      archetype: body.archetype,
    });

    return successResponse(
      {
        deckId,
        name: body.name,
        archetype: body.archetype,
        cardCount: body.cardIds.length,
      },
      201 // Created
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("deck name already exists")) {
        return errorResponse("DECK_NAME_EXISTS", "A deck with this name already exists", 409);
      }
      if (error.message.includes("card not found")) {
        return errorResponse("INVALID_CARD", "One or more card IDs are invalid", 400);
      }
      if (error.message.includes("copy limit")) {
        return errorResponse("COPY_LIMIT_EXCEEDED", "Maximum 3 copies of a card allowed", 400);
      }
    }

    return errorResponse("CREATE_DECK_FAILED", "Failed to create deck", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/cards
 * Get all card definitions (card catalog)
 * Requires API key authentication
 */
export const getAllCards = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Optional filters
    const typeParam = getQueryParam(request, "type");
    const archetypeParam = getQueryParam(request, "archetype");
    const limitParam = getQueryParam(request, "limit");

    // Get all card definitions
    const cards = await ctx.runQuery(getAllCardDefinitionsQuery, {});

    // Apply filters
    let filteredCards = cards;

    if (typeParam) {
      filteredCards = filteredCards.filter((card) => card.type === typeParam);
    }

    if (archetypeParam) {
      filteredCards = filteredCards.filter((card) => card.archetype === archetypeParam);
    }

    // Apply limit
    const limit = limitParam ? Number.parseInt(limitParam) : filteredCards.length;
    filteredCards = filteredCards.slice(0, limit);

    // Format card data
    const formattedCards = filteredCards.map((card) => ({
      cardId: card._id,
      name: card.name,
      type: card.type,
      archetype: card.archetype,
      level: card.level,
      atk: card.attack,
      def: card.defense,
      attribute: card.archetype,
      rarity: card.rarity,
      description: card.description,
      ability: card.effectText,
    }));

    return successResponse({
      cards: formattedCards,
      count: formattedCards.length,
      totalCards: cards.length,
    });
  } catch (error) {
    return errorResponse("FETCH_CARDS_FAILED", "Failed to fetch cards", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/cards/:id
 * Get single card details
 * Requires API key authentication
 */
export const getCard = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const cardId = getQueryParam(request, "cardId");

    if (!cardId) {
      return errorResponse("MISSING_CARD_ID", "cardId query parameter is required", 400);
    }

    // Get card definition
    const card = await ctx.runQuery(getCardDefinitionQuery, {
      cardDefinitionId: cardId as Id<"cardDefinitions">,
    });

    if (!card) {
      return errorResponse("CARD_NOT_FOUND", "Card not found", 404);
    }

    return successResponse({
      cardId: card._id,
      name: card.name,
      type: card.type,
      archetype: card.archetype,
      level: card.level,
      atk: card.attack,
      def: card.defense,
      attribute: card.archetype,
      rarity: card.rarity,
      description: card.description,
      ability: card.effectText,
      artworkUrl: card.imageUrl || null,
    });
  } catch (error) {
    return errorResponse("FETCH_CARD_FAILED", "Failed to fetch card", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/agents/decks/select-starter
 * Select a starter deck for an existing agent that doesn't have one
 * Requires API key authentication
 */
export const selectStarterDeck = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      starterDeckCode: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["starterDeckCode"]);
    if (validation) return validation;

    // Call internal mutation to select starter deck
    const result = await ctx.runMutation(selectStarterDeckInternalMutation, {
      userId: auth.userId,
      starterDeckCode: body.starterDeckCode,
    });

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Invalid starter deck code")) {
        return errorResponse(
          "INVALID_STARTER_DECK",
          "Invalid starter deck code. Valid codes: INFERNAL_DRAGONS, ABYSSAL_DEPTHS, IRON_LEGION, STORM_RIDERS",
          400
        );
      }
      if (error.message.includes("already has a deck")) {
        return errorResponse("DECK_EXISTS", "Agent already has a deck", 409);
      }
    }

    return errorResponse("SELECT_STARTER_FAILED", "Failed to select starter deck", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
