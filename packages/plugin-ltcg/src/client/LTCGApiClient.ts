/**
 * LTCG HTTP API Client
 *
 * Main client for interacting with the LTCG REST API.
 * Implements all 27 endpoints with full error handling and retry logic.
 */

import { API_ENDPOINTS, RETRY_CONFIG, TIMEOUTS } from "../constants";
import type {
  ActivateSpellRequest,
  ActivateTrapRequest,
  AgentProfile,
  ApiSuccessResponse,
  AttackRequest,
  AvailableActionsResponse,
  CardDefinition,
  ChainResponseRequest,
  ChangePositionRequest,
  CreateDeckRequest,
  Deck,
  EndTurnRequest,
  EnterMatchmakingRequest,
  EnterMatchmakingResponse,
  FlipSummonRequest,
  GameEvent,
  GameStateResponse,
  JoinLobbyRequest,
  JoinLobbyResponse,
  Lobby,
  RateLimitStatus,
  RegisterAgentRequest,
  RegisterAgentResponse,
  SetCardRequest,
  SetSpellTrapRequest,
  StarterDeck,
  SummonRequest,
  SurrenderRequest,
  WalletStatusResponse,
} from "../types/api";
import type { ErrorDetails } from "../types/eliza";
import { normalizeGameState } from "../utils/normalizeGameState";
import {
  AuthenticationError,
  GameError,
  NetworkError,
  PaymentRequiredError,
  RateLimitError,
  ValidationError,
  parseErrorResponse,
} from "./errors";
import { type X402Config, X402PaymentHandler } from "./x402PaymentHandler";

export interface LTCGApiClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  debug?: boolean;
  /** x402 payment configuration for autonomous purchases */
  x402Config?: X402Config;
}

export class LTCGApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly debug: boolean;
  private readonly x402Handler: X402PaymentHandler | null;
  private readonly x402Config: X402Config | null;

  constructor(config: LTCGApiClientConfig) {
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    if (!config.baseUrl) {
      throw new Error("Base URL is required");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.endsWith("/") ? config.baseUrl.slice(0, -1) : config.baseUrl;
    this.timeout = config.timeout ?? TIMEOUTS.DEFAULT;
    this.maxRetries = config.maxRetries ?? RETRY_CONFIG.maxAttempts;
    this.debug = config.debug ?? false;

    // Initialize x402 payment handler if configured
    this.x402Config = config.x402Config ?? null;
    this.x402Handler = config.x402Config?.enabled
      ? new X402PaymentHandler(config.x402Config)
      : null;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = this.timeout,
    requiresAuth = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        if (this.debug) {
          console.log(`[LTCG API] ${options.method || "GET"} ${endpoint} (attempt ${attempt + 1})`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        };

        if (requiresAuth) {
          headers.Authorization = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse response - handle malformed JSON gracefully
        let body: ErrorDetails;
        try {
          body = await response.json();
        } catch (jsonError) {
          // Response is not valid JSON (e.g., HTML error page)
          const text = await response.text().catch(() => "Unable to read response body");
          throw new NetworkError(
            `Invalid JSON response from server: ${text.substring(0, 200)}`,
            jsonError instanceof Error ? jsonError : undefined,
            {
              parseError: String(jsonError),
              responseText: text.substring(0, 500),
            }
          );
        }

        // Handle errors
        if (!response.ok) {
          // Handle 402 Payment Required (x402 protocol)
          if (response.status === 402) {
            const paymentHeader = response.headers.get("PAYMENT-REQUIRED");

            if (paymentHeader && this.x402Handler && this.x402Config?.autoPayEnabled !== false) {
              // Parse payment requirements
              const requirements = X402PaymentHandler.decodePaymentRequired(paymentHeader);

              if (requirements) {
                if (this.debug) {
                  console.log("[LTCG API] 402 Payment Required, attempting x402 payment...");
                }

                // Attempt to make payment
                const paymentResult = await this.x402Handler.handlePayment(requirements);

                if (paymentResult.success && paymentResult.proof) {
                  // Retry request with payment proof
                  if (this.debug) {
                    console.log("[LTCG API] Payment signed, retrying with PAYMENT-SIGNATURE...");
                  }

                  const paymentSignature = X402PaymentHandler.encodePaymentProof(
                    paymentResult.proof
                  );

                  // Make new request with payment header
                  const retryHeaders: Record<string, string> = {
                    "Content-Type": "application/json",
                    "PAYMENT-SIGNATURE": paymentSignature,
                    ...(options.headers as Record<string, string>),
                  };

                  if (requiresAuth) {
                    retryHeaders.Authorization = `Bearer ${this.apiKey}`;
                  }

                  const retryController = new AbortController();
                  const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);

                  const retryResponse = await fetch(url, {
                    ...options,
                    headers: retryHeaders,
                    signal: retryController.signal,
                  });

                  clearTimeout(retryTimeoutId);

                  const retryBody = await retryResponse.json();

                  if (retryResponse.ok) {
                    const successResponse = retryBody as unknown as ApiSuccessResponse<T>;
                    return successResponse.data;
                  }

                  // Payment was made but request still failed
                  throw parseErrorResponse(retryResponse.status, retryBody);
                }

                // Payment failed - throw error with requirements
                throw new PaymentRequiredError(
                  requirements,
                  paymentResult.error || "Payment failed"
                );
              }
            }

            // No x402 handler or auto-pay disabled - throw payment required error
            const requirements = paymentHeader
              ? X402PaymentHandler.decodePaymentRequired(paymentHeader)
              : null;

            if (requirements) {
              throw new PaymentRequiredError(requirements, "Payment required");
            }
          }

          const error = parseErrorResponse(response.status, body);

          // Retry on rate limit errors (429)
          if (error instanceof RateLimitError && attempt < this.maxRetries - 1) {
            const delay = error.retryAfter
              ? error.retryAfter * 1000
              : this.calculateBackoff(attempt);
            if (this.debug) {
              console.log(`[LTCG API] Rate limited, retrying after ${delay}ms`);
            }
            await this.sleep(delay);
            continue;
          }

          // Retry on 5xx errors
          if (response.status >= 500 && attempt < this.maxRetries - 1) {
            const delay = this.calculateBackoff(attempt);
            if (this.debug) {
              console.log(
                `[LTCG API] Server error (${response.status}), retrying after ${delay}ms`
              );
            }
            await this.sleep(delay);
            continue;
          }

          throw error;
        }

        // Success response
        const successResponse = body as unknown as ApiSuccessResponse<T>;
        return successResponse.data;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on API errors that are intentionally thrown (non-retryable)
        if (
          error instanceof AuthenticationError ||
          error instanceof ValidationError ||
          error instanceof GameError ||
          error instanceof PaymentRequiredError
        ) {
          throw error;
        }

        // Don't retry on rate limit or other API errors that already went through retry logic
        if (error instanceof RateLimitError) {
          throw error;
        }

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === "AbortError") {
          throw new NetworkError(`Request timeout after ${timeout}ms`, error, {
            endpoint,
            attempt: attempt + 1,
          });
        }

        // Network errors - retry with backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateBackoff(attempt);
          if (this.debug) {
            console.log(`[LTCG API] Network error, retrying after ${delay}ms:`, error);
          }
          await this.sleep(delay);
          continue;
        }

        // Max retries exceeded
        throw new NetworkError(
          `Failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error : undefined,
          { endpoint, attempts: this.maxRetries }
        );
      }
    }

    // Should never reach here, but TypeScript doesn't know that
    throw lastError || new NetworkError("Request failed");
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = RETRY_CONFIG.baseDelay * 2 ** attempt;
    return Math.min(delay, RETRY_CONFIG.maxDelay);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Agent Management (3 endpoints)
  // ============================================================================

  /**
   * Register a new AI agent
   * POST /api/agents/register
   */
  async registerAgent(name: string, starterDeckCode?: string): Promise<RegisterAgentResponse> {
    const body: RegisterAgentRequest = {
      name,
      starterDeckCode,
    };

    return this.request<RegisterAgentResponse>(
      API_ENDPOINTS.REGISTER_AGENT,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      this.timeout,
      false // Registration doesn't require auth
    );
  }

  /**
   * Get current agent's profile
   * GET /api/agents/me
   */
  async getAgentProfile(): Promise<AgentProfile> {
    return this.request<AgentProfile>(API_ENDPOINTS.GET_AGENT_PROFILE, {
      method: "GET",
    });
  }

  /**
   * Get current rate limit status
   * GET /api/agents/rate-limit
   */
  async getRateLimit(): Promise<RateLimitStatus> {
    return this.request<RateLimitStatus>(API_ENDPOINTS.GET_RATE_LIMIT, {
      method: "GET",
    });
  }

  /**
   * Get agent's wallet information (non-custodial HD wallet)
   * GET /api/agents/wallet
   */
  async getWalletInfo(): Promise<WalletStatusResponse["data"]> {
    return this.request<WalletStatusResponse["data"]>(API_ENDPOINTS.GET_WALLET_INFO, {
      method: "GET",
    });
  }

  // ============================================================================
  // Game State (4 endpoints)
  // ============================================================================

  /**
   * Get list of games waiting for your turn
   * GET /api/agents/pending-turns
   */
  async getPendingTurns(): Promise<Array<{ gameId: string; turnNumber: number }>> {
    return this.request<Array<{ gameId: string; turnNumber: number }>>(
      API_ENDPOINTS.GET_PENDING_TURNS,
      {
        method: "GET",
      }
    );
  }

  /**
   * Get detailed game state
   * GET /api/agents/games/state?gameId=xxx
   */
  async getGameState(gameId: string): Promise<GameStateResponse> {
    const rawState = await this.request<GameStateResponse>(
      `${API_ENDPOINTS.GET_GAME_STATE}?gameId=${gameId}`,
      {
        method: "GET",
      }
    );
    // Normalize to include legacy fields for backward compatibility
    return normalizeGameState(rawState);
  }

  /**
   * Get available actions for current turn
   * GET /api/agents/games/available-actions?gameId=xxx
   */
  async getAvailableActions(gameId: string): Promise<AvailableActionsResponse> {
    return this.request<AvailableActionsResponse>(
      `${API_ENDPOINTS.GET_AVAILABLE_ACTIONS}?gameId=${gameId}`,
      {
        method: "GET",
      }
    );
  }

  /**
   * Get game event history
   * GET /api/agents/games/history?gameId=xxx
   */
  async getGameHistory(gameId: string): Promise<GameEvent[]> {
    return this.request<GameEvent[]>(`${API_ENDPOINTS.GET_GAME_HISTORY}?gameId=${gameId}`, {
      method: "GET",
    });
  }

  // ============================================================================
  // Game Actions (10 endpoints)
  // ============================================================================

  /**
   * Summon a monster from hand
   * POST /api/agents/games/actions/summon
   */
  async summon(request: SummonRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_SUMMON, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Set a card face-down
   * POST /api/agents/games/actions/set-card
   */
  async setCard(request: SetCardRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_SET_CARD, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Set a spell or trap card face-down
   * POST /api/agents/games/actions/set-spell-trap
   */
  async setSpellTrapCard(
    request: SetSpellTrapRequest
  ): Promise<{ success: true; cardType: string }> {
    return this.request<{ success: true; cardType: string }>(API_ENDPOINTS.ACTION_SET_SPELL_TRAP, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Activate a spell card
   * POST /api/agents/games/actions/activate-spell
   */
  async activateSpell(request: ActivateSpellRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_ACTIVATE_SPELL, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Activate a trap card
   * POST /api/agents/games/actions/activate-trap
   */
  async activateTrap(request: ActivateTrapRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_ACTIVATE_TRAP, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Enter Battle Phase from Main Phase 1
   * POST /api/agents/games/actions/enter-battle
   */
  async enterBattlePhase(gameId: string): Promise<{ success: true; phase: string }> {
    return this.request<{ success: true; phase: string }>(API_ENDPOINTS.ACTION_ENTER_BATTLE, {
      method: "POST",
      body: JSON.stringify({ gameId }),
    });
  }

  /**
   * Enter Main Phase 2 from Battle Phase
   * POST /api/agents/games/actions/enter-main2
   */
  async enterMainPhase2(gameId: string): Promise<{ success: true; phase: string }> {
    return this.request<{ success: true; phase: string }>(API_ENDPOINTS.ACTION_ENTER_MAIN2, {
      method: "POST",
      body: JSON.stringify({ gameId }),
    });
  }

  /**
   * Declare an attack
   * POST /api/agents/games/actions/attack
   */
  async attack(request: AttackRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_ATTACK, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Change monster battle position
   * POST /api/agents/games/actions/change-position
   */
  async changePosition(
    request: ChangePositionRequest
  ): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_CHANGE_POSITION, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Flip summon a face-down monster
   * POST /api/agents/games/actions/flip-summon
   */
  async flipSummon(request: FlipSummonRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_FLIP_SUMMON, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Respond to chain activation
   * POST /api/agents/games/actions/chain-response
   */
  async chainResponse(request: ChainResponseRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_CHAIN_RESPONSE, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * End current turn
   * POST /api/agents/games/actions/end-turn
   */
  async endTurn(request: EndTurnRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_END_TURN, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Surrender the game
   * POST /api/agents/games/actions/surrender
   */
  async surrender(request: SurrenderRequest): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.ACTION_SURRENDER, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // ============================================================================
  // Matchmaking (4 endpoints)
  // ============================================================================

  /**
   * Enter matchmaking queue
   * POST /api/agents/matchmaking/enter
   */
  async enterMatchmaking(request: EnterMatchmakingRequest): Promise<EnterMatchmakingResponse> {
    return this.request<EnterMatchmakingResponse>(
      API_ENDPOINTS.MATCHMAKING_ENTER,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      TIMEOUTS.MATCHMAKING // Use longer timeout for matchmaking
    );
  }

  /**
   * Get available lobbies
   * GET /api/agents/matchmaking/lobbies?mode=xxx
   */
  async getLobbies(mode?: string): Promise<Lobby[]> {
    const endpoint = mode
      ? `${API_ENDPOINTS.MATCHMAKING_LOBBIES}?mode=${encodeURIComponent(mode)}`
      : API_ENDPOINTS.MATCHMAKING_LOBBIES;

    const response = await this.request<{ lobbies: Lobby[]; count: number }>(endpoint, {
      method: "GET",
    });
    return response.lobbies;
  }

  /**
   * Join an existing lobby
   * POST /api/agents/matchmaking/join
   */
  async joinLobby(request: JoinLobbyRequest): Promise<JoinLobbyResponse> {
    return this.request<JoinLobbyResponse>(
      API_ENDPOINTS.MATCHMAKING_JOIN,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      TIMEOUTS.MATCHMAKING
    );
  }

  /**
   * Leave a lobby
   * POST /api/agents/matchmaking/leave
   */
  async leaveLobby(lobbyId: string): Promise<{ success: true; message: string }> {
    return this.request<{ success: true; message: string }>(API_ENDPOINTS.MATCHMAKING_LEAVE, {
      method: "POST",
      body: JSON.stringify({ lobbyId }),
    });
  }

  // ============================================================================
  // Decks & Cards (6 endpoints)
  // ============================================================================

  /**
   * Get all decks for current agent
   * GET /api/agents/decks
   */
  async getDecks(): Promise<Deck[]> {
    const response = await this.request<{ decks: Deck[]; count: number }>(API_ENDPOINTS.GET_DECKS, {
      method: "GET",
    });
    return response.decks;
  }

  /**
   * Get specific deck by ID
   * GET /api/agents/decks/:id
   */
  async getDeck(deckId: string): Promise<Deck> {
    const endpoint = API_ENDPOINTS.GET_DECK.replace(":id", deckId);
    return this.request<Deck>(endpoint, {
      method: "GET",
    });
  }

  /**
   * Get available starter decks
   * GET /api/agents/starter-decks
   */
  async getStarterDecks(): Promise<StarterDeck[]> {
    const response = await this.request<{ starterDecks: StarterDeck[] }>(
      API_ENDPOINTS.GET_STARTER_DECKS,
      {
        method: "GET",
      },
      this.timeout,
      true // Starter decks require auth in current API design
    );
    return response.starterDecks;
  }

  /**
   * Create a new deck
   * POST /api/agents/decks/create
   */
  async createDeck(request: CreateDeckRequest): Promise<Deck> {
    return this.request<Deck>(API_ENDPOINTS.CREATE_DECK, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Get all available cards
   * GET /api/agents/cards?type=xxx&archetype=xxx
   */
  async getCards(filters?: {
    type?: string;
    archetype?: string;
    race?: string;
  }): Promise<CardDefinition[]> {
    let endpoint: string = API_ENDPOINTS.GET_CARDS;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.archetype) params.append("archetype", filters.archetype);
      if (filters.race) params.append("race", filters.race);

      const queryString = params.toString();
      if (queryString) {
        endpoint = `${endpoint}?${queryString}`;
      }
    }

    const response = await this.request<{
      cards: CardDefinition[];
      count: number;
      totalCards: number;
    }>(endpoint, {
      method: "GET",
    });
    return response.cards;
  }

  /**
   * Get specific card by ID
   * GET /api/agents/cards/:id
   */
  async getCard(cardId: string): Promise<CardDefinition> {
    const endpoint = API_ENDPOINTS.GET_CARD.replace(":id", cardId);
    return this.request<CardDefinition>(endpoint, {
      method: "GET",
    });
  }

  // ============================================================================
  // Global Chat Methods
  // ============================================================================

  /**
   * Send a message to global chat
   * POST /api/agents/chat/send
   * Rate limited to 5 messages per 10 seconds
   */
  async sendChatMessage(content: string): Promise<{ messageId: string; timestamp: number }> {
    return this.request<{ messageId: string; timestamp: number }>(API_ENDPOINTS.CHAT_SEND, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  /**
   * Get recent global chat messages
   * GET /api/agents/chat/messages?limit=50
   * No authentication required (public read)
   */
  async getRecentMessages(limit = 50): Promise<{
    messages: Array<{
      _id: string;
      userId: string;
      username: string;
      message: string;
      createdAt: number;
      isSystem: boolean;
    }>;
    count: number;
  }> {
    const endpoint = `${API_ENDPOINTS.CHAT_MESSAGES}?limit=${limit}`;
    return this.request<{
      messages: Array<{
        _id: string;
        userId: string;
        username: string;
        message: string;
        createdAt: number;
        isSystem: boolean;
      }>;
      count: number;
    }>(
      endpoint,
      { method: "GET" },
      this.timeout,
      false // Public endpoint, no auth required
    );
  }

  /**
   * Get online users in Tavern Hall
   * GET /api/agents/chat/online-users
   * No authentication required (public read)
   */
  async getOnlineUsers(): Promise<{
    users: Array<{
      userId: string;
      username: string;
      status: "online" | "in_game" | "idle";
      lastActiveAt: number;
      rank: string;
      rankedElo: number;
    }>;
    count: number;
  }> {
    return this.request<{
      users: Array<{
        userId: string;
        username: string;
        status: "online" | "in_game" | "idle";
        lastActiveAt: number;
        rank: string;
        rankedElo: number;
      }>;
      count: number;
    }>(
      API_ENDPOINTS.CHAT_ONLINE_USERS,
      { method: "GET" },
      this.timeout,
      false // Public endpoint, no auth required
    );
  }

  // ============================================================================
  // Story Mode (6 endpoints) - Instant AI Battles
  // ============================================================================

  /**
   * Get all story chapters with progress
   * GET /api/agents/story/chapters
   */
  async getStoryChapters(): Promise<{
    chapters: Array<{
      _id: string;
      actNumber: number;
      chapterNumber: number;
      title: string;
      description: string;
      archetype: string;
      aiDifficulty: string;
      stagesCompleted: number;
      totalStages: number;
      totalStars: number;
      maxStars: number;
      isUnlocked: boolean;
    }>;
    count: number;
  }> {
    return this.request<{
      chapters: Array<{
        _id: string;
        actNumber: number;
        chapterNumber: number;
        title: string;
        description: string;
        archetype: string;
        aiDifficulty: string;
        stagesCompleted: number;
        totalStages: number;
        totalStars: number;
        maxStars: number;
        isUnlocked: boolean;
      }>;
      count: number;
    }>(API_ENDPOINTS.STORY_CHAPTERS, { method: "GET" });
  }

  /**
   * Get stages for a specific chapter
   * GET /api/agents/story/stages?chapterId=xxx
   */
  async getStoryStages(chapterId: string): Promise<{
    stages: Array<{
      _id: string;
      stageNumber: number;
      name: string;
      description: string;
      aiDifficulty: string;
      rewardGold: number;
      rewardXp: number;
      firstClearBonus: number;
      status: "locked" | "available" | "completed" | "starred";
      starsEarned: number;
      bestScore?: number;
      timesCompleted: number;
      firstClearClaimed: boolean;
    }>;
    count: number;
  }> {
    return this.request<{
      stages: Array<{
        _id: string;
        stageNumber: number;
        name: string;
        description: string;
        aiDifficulty: string;
        rewardGold: number;
        rewardXp: number;
        firstClearBonus: number;
        status: "locked" | "available" | "completed" | "starred";
        starsEarned: number;
        bestScore?: number;
        timesCompleted: number;
        firstClearClaimed: boolean;
      }>;
      count: number;
    }>(`${API_ENDPOINTS.STORY_STAGES}?chapterId=${chapterId}`, {
      method: "GET",
    });
  }

  /**
   * Start a specific story battle
   * POST /api/agents/story/start
   */
  async startStoryBattle(
    chapterId: string,
    stageNumber?: number
  ): Promise<{
    gameId: string;
    lobbyId: string;
    stageId: string;
    chapter: string;
    stage: { name: string; number: number };
    aiOpponent: string;
    difficulty: string;
    rewards: { gold: number; xp: number; firstClearBonus: number };
    message: string;
  }> {
    return this.request<{
      gameId: string;
      lobbyId: string;
      stageId: string;
      chapter: string;
      stage: { name: string; number: number };
      aiOpponent: string;
      difficulty: string;
      rewards: { gold: number; xp: number; firstClearBonus: number };
      message: string;
    }>(API_ENDPOINTS.STORY_START, {
      method: "POST",
      body: JSON.stringify({ chapterId, stageNumber }),
    });
  }

  /**
   * Start a random story battle instantly (quick play)
   * POST /api/agents/story/quick-play
   */
  async quickPlayStory(difficulty?: "easy" | "medium" | "hard" | "boss"): Promise<{
    gameId: string;
    lobbyId: string;
    stageId: string;
    chapter: string;
    stage: { name: string; number: number };
    aiOpponent: string;
    difficulty: string;
    rewards: { gold: number; xp: number; firstClearBonus: number };
    message: string;
  }> {
    return this.request<{
      gameId: string;
      lobbyId: string;
      stageId: string;
      chapter: string;
      stage: { name: string; number: number };
      aiOpponent: string;
      difficulty: string;
      rewards: { gold: number; xp: number; firstClearBonus: number };
      message: string;
    }>(API_ENDPOINTS.STORY_QUICK_PLAY, {
      method: "POST",
      body: JSON.stringify({ difficulty }),
    });
  }

  /**
   * Complete a story stage and receive rewards
   * POST /api/agents/story/complete
   */
  async completeStoryStage(
    stageId: string,
    won: boolean,
    finalLP: number
  ): Promise<{
    won: boolean;
    rewards: { gold: number; xp: number };
    starsEarned: number;
    newBestScore?: number;
    unlockedNextStage?: boolean;
    levelUp?: { newLevel: number; oldLevel: number } | null;
    newBadges?: string[];
  }> {
    return this.request<{
      won: boolean;
      rewards: { gold: number; xp: number };
      starsEarned: number;
      newBestScore?: number;
      unlockedNextStage?: boolean;
      levelUp?: { newLevel: number; oldLevel: number } | null;
      newBadges?: string[];
    }>(API_ENDPOINTS.STORY_COMPLETE, {
      method: "POST",
      body: JSON.stringify({ stageId, won, finalLP }),
    });
  }

  /**
   * Execute AI opponent's turn in a story battle
   * POST /api/agents/story/ai-turn
   */
  async executeAITurn(gameId: string): Promise<{
    success: boolean;
    message: string;
    actionsTaken: number;
  }> {
    return this.request<{
      success: boolean;
      message: string;
      actionsTaken: number;
    }>(API_ENDPOINTS.STORY_AI_TURN, {
      method: "POST",
      body: JSON.stringify({ gameId }),
    });
  }

  // ============================================================================
  // Decision History Methods
  // ============================================================================

  /**
   * Save a decision to persistent storage
   * POST /api/agents/decisions
   */
  async saveDecision(decision: {
    gameId: string;
    turnNumber: number;
    phase: string;
    action: string;
    reasoning: string;
    parameters?: Record<string, unknown>;
    executionTimeMs?: number;
    result?: string;
  }): Promise<{ success: boolean; decisionId: string }> {
    return this.request<{ success: boolean; decisionId: string }>("/api/agents/decisions", {
      method: "POST",
      body: JSON.stringify(decision),
    });
  }

  /**
   * Get decisions, optionally filtered by game
   * GET /api/agents/decisions?gameId=xxx&limit=50
   */
  async getDecisions(options?: { gameId?: string; limit?: number }): Promise<{
    decisions: Array<{
      _id: string;
      agentId: string;
      gameId: string;
      turnNumber: number;
      phase: string;
      action: string;
      reasoning: string;
      parameters?: Record<string, unknown>;
      executionTimeMs?: number;
      result?: string;
      createdAt: number;
    }>;
  }> {
    const params = new URLSearchParams();
    if (options?.gameId) params.set("gameId", options.gameId);
    if (options?.limit) params.set("limit", options.limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<{
      decisions: Array<{
        _id: string;
        agentId: string;
        gameId: string;
        turnNumber: number;
        phase: string;
        action: string;
        reasoning: string;
        parameters?: Record<string, unknown>;
        executionTimeMs?: number;
        result?: string;
        createdAt: number;
      }>;
    }>(`/api/agents/decisions${query}`, { method: "GET" });
  }

  /**
   * Get decision statistics for this agent
   * GET /api/agents/decisions/stats
   */
  async getDecisionStats(): Promise<{
    totalDecisions: number;
    actionCounts: Record<string, number>;
    avgExecutionTimeMs: number;
    successRate: number;
    successCount: number;
    failureCount: number;
  }> {
    return this.request<{
      totalDecisions: number;
      actionCounts: Record<string, number>;
      avgExecutionTimeMs: number;
      successRate: number;
      successCount: number;
      failureCount: number;
    }>("/api/agents/decisions/stats", { method: "GET" });
  }

  // ============================================================================
  // Shop Endpoints (x402 Payment-Gated)
  // ============================================================================

  /**
   * Get available gem packages
   * GET /api/agents/shop/packages
   *
   * No payment required - returns package info
   */
  async getGemPackages(): Promise<{
    packages: Array<{
      packageId: string;
      name: string;
      gems: number;
      usdCents: number;
      bonusPercent: number;
    }>;
  }> {
    return this.request<{
      packages: Array<{
        packageId: string;
        name: string;
        gems: number;
        usdCents: number;
        bonusPercent: number;
      }>;
    }>("/api/agents/shop/packages", { method: "GET" }, this.timeout, false);
  }

  /**
   * Get available shop products (packs, boxes)
   * GET /api/agents/shop/products
   *
   * No payment required - returns product info
   */
  async getShopProducts(): Promise<{
    products: Array<{
      productId: string;
      name: string;
      description: string;
      productType: "pack" | "box" | "currency";
      goldPrice?: number;
      gemPrice?: number;
      isActive: boolean;
    }>;
  }> {
    return this.request<{
      products: Array<{
        productId: string;
        name: string;
        description: string;
        productType: "pack" | "box" | "currency";
        goldPrice?: number;
        gemPrice?: number;
        isActive: boolean;
      }>;
    }>("/api/agents/shop/products", { method: "GET" }, this.timeout, false);
  }

  /**
   * Purchase gems using x402 payment
   * POST /api/agents/shop/gems
   *
   * Requires x402 payment. If x402Config is set with autoPayEnabled,
   * the payment will be made automatically. Otherwise, throws PaymentRequiredError.
   *
   * @param packageId - The gem package ID to purchase
   * @returns Result with gems credited and new balance
   */
  async purchaseGems(packageId: string): Promise<{
    success: boolean;
    gemsCredited: number;
    transactionSignature: string;
    newBalance: number;
  }> {
    return this.request<{
      success: boolean;
      gemsCredited: number;
      transactionSignature: string;
      newBalance: number;
    }>("/api/agents/shop/gems", {
      method: "POST",
      body: JSON.stringify({ packageId }),
    });
  }

  /**
   * Purchase a card pack using x402 payment
   * POST /api/agents/shop/pack
   *
   * Requires x402 payment. If x402Config is set with autoPayEnabled,
   * the payment will be made automatically. Otherwise, throws PaymentRequiredError.
   *
   * @param productId - The shop product ID (must be a pack)
   * @returns Result with cards received
   */
  async purchasePack(productId: string): Promise<{
    success: boolean;
    productName: string;
    cardsReceived: Array<{
      cardDefinitionId: string;
      name: string;
      rarity: string;
      variant: string;
    }>;
    transactionSignature: string;
  }> {
    return this.request<{
      success: boolean;
      productName: string;
      cardsReceived: Array<{
        cardDefinitionId: string;
        name: string;
        rarity: string;
        variant: string;
      }>;
      transactionSignature: string;
    }>("/api/agents/shop/pack", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  }

  /**
   * Purchase a card pack using gems (no x402)
   * POST /api/agents/shop/pack-gems
   *
   * Requires authentication. Deducts gems from player balance.
   *
   * @param productId - The shop product ID (must be a pack)
   * @returns Result with cards received and gem balance
   */
  async purchaseWithGems(productId: string): Promise<{
    success: boolean;
    productName: string;
    cardsReceived: Array<{
      cardDefinitionId: string;
      name: string;
      rarity: string;
      variant: string;
    }>;
    gemsSpent: number;
    newGemBalance: number;
  }> {
    return this.request<{
      success: boolean;
      productName: string;
      cardsReceived: Array<{
        cardDefinitionId: string;
        name: string;
        rarity: string;
        variant: string;
      }>;
      gemsSpent: number;
      newGemBalance: number;
    }>("/api/agents/shop/pack-gems", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  }

  /**
   * Check if x402 payments are enabled for this client
   */
  isX402Enabled(): boolean {
    return this.x402Handler !== null && this.x402Config?.enabled === true;
  }

  /**
   * Get the x402 configuration (if set)
   */
  getX402Config(): X402Config | null {
    return this.x402Config;
  }
}
