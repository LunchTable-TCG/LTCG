/**
 * Deck & Card API Endpoints
 *
 * Provides access to card catalog, user decks, and starter decks.
 * Used by ElizaOS agents to browse cards and manage decks.
 */

// Import at runtime only (not for type checking) to avoid TS2589
const api: any = require("../_generated/api").api;
const internal: any = require("../_generated/api").internal;
import { authHttpAction } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  getQueryParam,
  parseJsonBody,
  successResponse,
  validateRequiredFields,
} from "./middleware/responses";

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
    const decks = await ctx.runQuery(internal.core.decks.getUserDecksInternal, {
      userId: auth.userId,
    });

    // Format deck data (internal query already returns formatted data)
    const formattedDecks = decks.map((deck: any) => ({
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
    const deck = await ctx.runQuery(api.core.decks.getDeckWithCards, {
      deckId: deckId as any,
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
    const starterDecks = await ctx.runQuery(api.agents.getStarterDecks, {});

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
    const deckId = await ctx.runMutation(api.core.decks.createDeck, {
      userId: auth.userId,
      name: body.name,
      cardDefinitionIds: body.cardIds as any,
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
    const cards = await ctx.runQuery(api.core.cards.getAllCardDefinitions, {});

    // Apply filters
    let filteredCards = cards;

    if (typeParam) {
      filteredCards = filteredCards.filter((card: any) => card.type === typeParam);
    }

    if (archetypeParam) {
      filteredCards = filteredCards.filter((card: any) => card.archetype === archetypeParam);
    }

    // Apply limit
    const limit = limitParam ? Number.parseInt(limitParam) : filteredCards.length;
    filteredCards = filteredCards.slice(0, limit);

    // Format card data
    const formattedCards = filteredCards.map((card: any) => ({
      cardId: card._id,
      name: card.name,
      type: card.type,
      archetype: card.archetype,
      level: card.level,
      atk: card.atk,
      def: card.def,
      attribute: card.attribute,
      rarity: card.rarity,
      description: card.description,
      ability: card.ability, // JSON ability structure
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
    const card = await ctx.runQuery(api.core.cards.getCardDefinition, {
      cardDefinitionId: cardId as any,
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
      atk: card.atk,
      def: card.def,
      attribute: card.attribute,
      rarity: card.rarity,
      description: card.description,
      ability: card.ability,
      artworkUrl: card.artworkUrl || null,
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
    const result = await ctx.runMutation(internal.agents.selectStarterDeckInternal, {
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
