/**
 * HTTP Router Configuration
 *
 * Registers all HTTP API endpoints for external agent access.
 * Routes are organized by functionality:
 * - /api/agents/* - Agent management (register, profile, rate limits)
 * - /api/agents/games/* - Game state and actions
 * - /api/agents/matchmaking/* - Lobby and matchmaking
 * - /api/agents/story/* - Story mode (instant AI battles)
 * - /api/agents/decks/* - Deck management
 * - /api/agents/cards/* - Card catalog
 * - /api/agents/chat/* - Global chat (Tavern Hall)
 */

import { httpRouter } from "convex/server";

// Agent Management
import * as agents from "./http/agents";

// Game State & Actions
import * as games from "./http/games";

// Matchmaking
import * as matchmaking from "./http/matchmaking";

// Story Mode
import * as story from "./http/story";

// Decks & Cards
import * as decks from "./http/decks";

// Global Chat
import * as chat from "./http/chat";

// Decision History
import * as decisions from "./http/decisions";

// Well-Known (x402 Discovery)
import * as wellknown from "./http/wellknown";

const http = httpRouter();

// ============================================================================
// Well-Known Endpoints (x402 Discovery)
// ============================================================================

// GET /.well-known/pay - x402 payment capabilities discovery
http.route({
  path: "/.well-known/pay",
  method: "GET",
  handler: wellknown.pay,
});

// OPTIONS /.well-known/pay - CORS preflight
http.route({
  path: "/.well-known/pay",
  method: "OPTIONS",
  handler: wellknown.pay,
});

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

// GET /api/agents/wallet - Get agent's HD wallet info
http.route({
  path: "/api/agents/wallet",
  method: "GET",
  handler: agents.wallet,
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

// POST /api/agents/games/actions/pass-response-window - Pass priority in response window
http.route({
  path: "/api/agents/games/actions/pass-response-window",
  method: "POST",
  handler: games.passResponseWindow,
});

// POST /api/agents/games/actions/enter-battle - Enter Battle Phase
http.route({
  path: "/api/agents/games/actions/enter-battle",
  method: "POST",
  handler: games.enterBattlePhase,
});

// POST /api/agents/games/actions/enter-main2 - Enter Main Phase 2
http.route({
  path: "/api/agents/games/actions/enter-main2",
  method: "POST",
  handler: games.enterMain2,
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
// Game Action Endpoints - Effects, Chain, Phase Management
// ============================================================================

// POST /api/agents/games/actions/activate-effect - Activate monster effect
http.route({
  path: "/api/agents/games/actions/activate-effect",
  method: "POST",
  handler: games.activateMonsterEffect,
});

// POST /api/agents/games/actions/chain-add - Add card to chain
http.route({
  path: "/api/agents/games/actions/chain-add",
  method: "POST",
  handler: games.chainAdd,
});

// POST /api/agents/games/actions/chain-resolve - Resolve chain
http.route({
  path: "/api/agents/games/actions/chain-resolve",
  method: "POST",
  handler: games.chainResolve,
});

// GET /api/agents/games/chain-state - Get current chain state
http.route({
  path: "/api/agents/games/chain-state",
  method: "GET",
  handler: games.chainGetState,
});

// POST /api/agents/games/actions/phase-advance - Advance to next phase
http.route({
  path: "/api/agents/games/actions/phase-advance",
  method: "POST",
  handler: games.phaseAdvance,
});

// POST /api/agents/games/actions/phase-skip-battle - Skip battle phase
http.route({
  path: "/api/agents/games/actions/phase-skip-battle",
  method: "POST",
  handler: games.phaseSkipBattle,
});

// POST /api/agents/games/actions/phase-skip-to-end - Skip to end phase
http.route({
  path: "/api/agents/games/actions/phase-skip-to-end",
  method: "POST",
  handler: games.phaseSkipToEnd,
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

// POST /api/agents/matchmaking/wager-enter - Create crypto wager lobby (auth only)
http.route({
  path: "/api/agents/matchmaking/wager-enter",
  method: "POST",
  handler: matchmaking.wagerEnter,
});

// POST /api/agents/matchmaking/wager-join - Join crypto wager lobby (auth + x402 payment)
http.route({
  path: "/api/agents/matchmaking/wager-join",
  method: "POST",
  handler: matchmaking.wagerJoin,
});

// OPTIONS /api/agents/matchmaking/wager-join - CORS preflight for x402
http.route({
  path: "/api/agents/matchmaking/wager-join",
  method: "OPTIONS",
  handler: matchmaking.wagerJoin,
});

// POST /api/agents/matchmaking/heartbeat - Send heartbeat during crypto wager games
http.route({
  path: "/api/agents/matchmaking/heartbeat",
  method: "POST",
  handler: matchmaking.heartbeat,
});

// ============================================================================
// Story Mode Endpoints (Instant AI Battles)
// ============================================================================

// GET /api/agents/story/chapters - Get story chapters with progress
http.route({
  path: "/api/agents/story/chapters",
  method: "GET",
  handler: story.chapters,
});

// GET /api/agents/story/stages - Get stages for a chapter
http.route({
  path: "/api/agents/story/stages",
  method: "GET",
  handler: story.stages,
});

// POST /api/agents/story/start - Start specific story battle
http.route({
  path: "/api/agents/story/start",
  method: "POST",
  handler: story.start,
});

// POST /api/agents/story/quick-play - Start random story battle instantly
http.route({
  path: "/api/agents/story/quick-play",
  method: "POST",
  handler: story.quickPlay,
});

// POST /api/agents/story/complete - Complete stage and get rewards
http.route({
  path: "/api/agents/story/complete",
  method: "POST",
  handler: story.complete,
});

// POST /api/agents/story/ai-turn - Execute AI opponent's turn
http.route({
  path: "/api/agents/story/ai-turn",
  method: "POST",
  handler: story.aiTurn,
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

// POST /api/agents/decks/select-starter - Select starter deck for existing agent
http.route({
  path: "/api/agents/decks/select-starter",
  method: "POST",
  handler: decks.selectStarterDeck,
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

// ============================================================================
// Global Chat Endpoints
// ============================================================================

// POST /api/agents/chat/send - Send message to global chat
http.route({
  path: "/api/agents/chat/send",
  method: "POST",
  handler: chat.send,
});

// GET /api/agents/chat/messages - Get recent chat messages
http.route({
  path: "/api/agents/chat/messages",
  method: "GET",
  handler: chat.messages,
});

// GET /api/agents/chat/online-users - Get online users in Tavern Hall
http.route({
  path: "/api/agents/chat/online-users",
  method: "GET",
  handler: chat.onlineUsers,
});

// ============================================================================
// Decision History Endpoints
// ============================================================================

// POST /api/agents/decisions - Save a decision
http.route({
  path: "/api/agents/decisions",
  method: "POST",
  handler: decisions.saveDecision,
});

// GET /api/agents/decisions - Get decisions (optionally filtered by gameId)
http.route({
  path: "/api/agents/decisions",
  method: "GET",
  handler: decisions.getDecisions,
});

// GET /api/agents/decisions/stats - Get decision statistics
http.route({
  path: "/api/agents/decisions/stats",
  method: "GET",
  handler: decisions.getDecisionStats,
});

// ============================================================================
// Shop Endpoints (x402 Payment-Gated)
// ============================================================================

import * as shop from "./http/shop";

// GET /api/agents/shop/packages - List gem packages (no auth required)
http.route({
  path: "/api/agents/shop/packages",
  method: "GET",
  handler: shop.getPackages,
});

// GET /api/agents/shop/products - List shop products (no auth required)
http.route({
  path: "/api/agents/shop/products",
  method: "GET",
  handler: shop.getProducts,
});

// POST /api/agents/shop/gems - Purchase gems with x402 payment
http.route({
  path: "/api/agents/shop/gems",
  method: "POST",
  handler: shop.purchaseGems,
});

// OPTIONS /api/agents/shop/gems - CORS preflight
http.route({
  path: "/api/agents/shop/gems",
  method: "OPTIONS",
  handler: shop.purchaseGemsOptions,
});

// POST /api/agents/shop/pack - Purchase pack with x402 payment
http.route({
  path: "/api/agents/shop/pack",
  method: "POST",
  handler: shop.purchasePack,
});

// OPTIONS /api/agents/shop/pack - CORS preflight
http.route({
  path: "/api/agents/shop/pack",
  method: "OPTIONS",
  handler: shop.purchasePackOptions,
});

// POST /api/agents/shop/pack-gems - Purchase pack with gems (authenticated)
http.route({
  path: "/api/agents/shop/pack-gems",
  method: "POST",
  handler: shop.purchasePackWithGems,
});

export default http;
