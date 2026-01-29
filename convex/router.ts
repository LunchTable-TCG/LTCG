/**
 * HTTP Router Configuration
 *
 * Registers all HTTP API endpoints for external agent access.
 * Routes are organized by functionality:
 * - /api/agents/* - Agent management (register, profile, rate limits)
 * - /api/agents/games/* - Game state and actions
 * - /api/agents/matchmaking/* - Lobby and matchmaking
 * - /api/agents/decks/* - Deck management
 * - /api/agents/cards/* - Card catalog
 */

import { httpRouter } from "convex/server";

// Agent Management
import * as agents from "./http/agents";

// Game State & Actions
import * as games from "./http/games";

// Matchmaking
import * as matchmaking from "./http/matchmaking";

// Decks & Cards
import * as decks from "./http/decks";

const http = httpRouter();

// ============================================================================
// Agent Management Endpoints
// ============================================================================

// POST /api/agents/register - Register new agent and receive API key
http.route({
  path: "/api/agents/register",
  method: "POST",
  handler: agents.register,
});

// GET /api/agents/me - Get authenticated agent profile
http.route({
  path: "/api/agents/me",
  method: "GET",
  handler: agents.me,
});

// GET /api/agents/rate-limit - Get current rate limit status
http.route({
  path: "/api/agents/rate-limit",
  method: "GET",
  handler: agents.rateLimit,
});

// ============================================================================
// Game State Endpoints (Read-only)
// ============================================================================

// GET /api/agents/pending-turns - Get games where it's agent's turn
http.route({
  path: "/api/agents/pending-turns",
  method: "GET",
  handler: games.pendingTurns,
});

// GET /api/agents/games/state - Get full game state
http.route({
  path: "/api/agents/games/state",
  method: "GET",
  handler: games.gameState,
});

// GET /api/agents/games/available-actions - Get legal moves
http.route({
  path: "/api/agents/games/available-actions",
  method: "GET",
  handler: games.availableActions,
});

// GET /api/agents/games/history - Get game event log
http.route({
  path: "/api/agents/games/history",
  method: "GET",
  handler: games.gameHistory,
});

// ============================================================================
// Game Action Endpoints - Movement Actions
// ============================================================================

// POST /api/agents/games/actions/summon - Normal summon monster
http.route({
  path: "/api/agents/games/actions/summon",
  method: "POST",
  handler: games.summonMonster,
});

// POST /api/agents/games/actions/set-card - Set monster face-down
http.route({
  path: "/api/agents/games/actions/set-card",
  method: "POST",
  handler: games.setCard,
});

// POST /api/agents/games/actions/flip-summon - Flip face-down monster
http.route({
  path: "/api/agents/games/actions/flip-summon",
  method: "POST",
  handler: games.flipSummonMonster,
});

// POST /api/agents/games/actions/change-position - Switch ATK/DEF position
http.route({
  path: "/api/agents/games/actions/change-position",
  method: "POST",
  handler: games.changeMonsterPosition,
});

// ============================================================================
// Game Action Endpoints - Spell/Trap Actions
// ============================================================================

// POST /api/agents/games/actions/set-spell-trap - Set spell/trap face-down
http.route({
  path: "/api/agents/games/actions/set-spell-trap",
  method: "POST",
  handler: games.setSpellTrapCard,
});

// POST /api/agents/games/actions/activate-spell - Activate spell card
http.route({
  path: "/api/agents/games/actions/activate-spell",
  method: "POST",
  handler: games.activateSpellCard,
});

// POST /api/agents/games/actions/activate-trap - Activate trap card
http.route({
  path: "/api/agents/games/actions/activate-trap",
  method: "POST",
  handler: games.activateTrapCard,
});

// POST /api/agents/games/actions/chain-response - Respond to chain or pass priority
http.route({
  path: "/api/agents/games/actions/chain-response",
  method: "POST",
  handler: games.chainResponse,
});

// ============================================================================
// Game Action Endpoints - Combat & Turn Actions
// ============================================================================

// POST /api/agents/games/actions/attack - Declare attack
http.route({
  path: "/api/agents/games/actions/attack",
  method: "POST",
  handler: games.attackMonster,
});

// POST /api/agents/games/actions/end-turn - End turn
http.route({
  path: "/api/agents/games/actions/end-turn",
  method: "POST",
  handler: games.endPlayerTurn,
});

// POST /api/agents/games/actions/surrender - Forfeit game
http.route({
  path: "/api/agents/games/actions/surrender",
  method: "POST",
  handler: games.surrenderGame,
});

// ============================================================================
// Matchmaking Endpoints
// ============================================================================

// POST /api/agents/matchmaking/enter - Create or enter lobby
http.route({
  path: "/api/agents/matchmaking/enter",
  method: "POST",
  handler: matchmaking.enter,
});

// GET /api/agents/matchmaking/lobbies - List available lobbies
http.route({
  path: "/api/agents/matchmaking/lobbies",
  method: "GET",
  handler: matchmaking.lobbies,
});

// POST /api/agents/matchmaking/join - Join lobby by ID
http.route({
  path: "/api/agents/matchmaking/join",
  method: "POST",
  handler: matchmaking.join,
});

// POST /api/agents/matchmaking/leave - Cancel/leave lobby
http.route({
  path: "/api/agents/matchmaking/leave",
  method: "POST",
  handler: matchmaking.leave,
});

// ============================================================================
// Deck Management Endpoints
// ============================================================================

// GET /api/agents/decks - Get user's decks
http.route({
  path: "/api/agents/decks",
  method: "GET",
  handler: decks.getUserDecks,
});

// GET /api/agents/decks/:id - Get deck with cards (query param: deckId)
http.route({
  path: "/api/agents/decks/:id",
  method: "GET",
  handler: decks.getDeck,
});

// GET /api/agents/starter-decks - Get starter deck codes
http.route({
  path: "/api/agents/starter-decks",
  method: "GET",
  handler: decks.getStarterDecks,
});

// POST /api/agents/decks/create - Create new deck
http.route({
  path: "/api/agents/decks/create",
  method: "POST",
  handler: decks.createDeck,
});

// ============================================================================
// Card Catalog Endpoints
// ============================================================================

// GET /api/agents/cards - Get all card definitions
http.route({
  path: "/api/agents/cards",
  method: "GET",
  handler: decks.getAllCards,
});

// GET /api/agents/cards/:id - Get single card details (query param: cardId)
http.route({
  path: "/api/agents/cards/:id",
  method: "GET",
  handler: decks.getCard,
});

export default http;
