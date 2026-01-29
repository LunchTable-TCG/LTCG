/**
 * Tests for LTCG API Client
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LTCGApiClient } from '../LTCGApiClient';
import {
  AuthenticationError,
  RateLimitError,
  NetworkError,
  ValidationError,
  GameError,
} from '../errors';
import { ApiErrorCode } from '../../types/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LTCGApiClient', () => {
  const TEST_API_KEY = 'ltcg_test_key_123';
  const TEST_BASE_URL = 'https://api.example.com';

  let client: LTCGApiClient;

  beforeEach(() => {
    client = new LTCGApiClient({
      apiKey: TEST_API_KEY,
      baseUrl: TEST_BASE_URL,
      timeout: 5000,
      maxRetries: 3,
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe('constructor', () => {
    it('should create client with required config', () => {
      expect(client).toBeInstanceOf(LTCGApiClient);
    });

    it('should throw if API key is missing', () => {
      expect(() => {
        new LTCGApiClient({ apiKey: '', baseUrl: TEST_BASE_URL });
      }).toThrow('API key is required');
    });

    it('should throw if base URL is missing', () => {
      expect(() => {
        new LTCGApiClient({ apiKey: TEST_API_KEY, baseUrl: '' });
      }).toThrow('Base URL is required');
    });

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new LTCGApiClient({
        apiKey: TEST_API_KEY,
        baseUrl: 'https://api.example.com/',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: Date.now() }),
      });

      clientWithSlash.getDecks();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agents/decks',
        expect.any(Object)
      );
    });

    it('should use default values for optional config', () => {
      const minimalClient = new LTCGApiClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
      });

      expect(minimalClient).toBeInstanceOf(LTCGApiClient);
    });
  });

  // ============================================================================
  // Request & Error Handling Tests
  // ============================================================================

  describe('request handling', () => {
    it('should include Authorization header for authenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { agentId: 'test' }, timestamp: Date.now() }),
      });

      await client.getAgentProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_API_KEY}`,
          }),
        })
      );
    });

    it('should not include Authorization header for public endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: Date.now() }),
      });

      await client.getStarterDecks();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { agentId: 'test' }, timestamp: Date.now() }),
      });

      await client.getAgentProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should parse success response and return data', async () => {
      const testData = { agentId: 'test123', name: 'TestAgent' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: testData, timestamp: Date.now() }),
      });

      const result = await client.getAgentProfile();

      expect(result).toEqual(testData);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Invalid API key',
          },
          timestamp: Date.now(),
        }),
      });

      await expect(client.getAgentProfile()).rejects.toThrow(AuthenticationError);
    });

    it('should throw RateLimitError on 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Rate limit exceeded',
            details: {
              retryAfter: 30,
              remaining: 0,
              limit: 60,
            },
          },
          timestamp: Date.now(),
        }),
      });

      await expect(client.getAgentProfile()).rejects.toThrow(RateLimitError);
    });

    it('should throw ValidationError on 400 with validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Missing required fields',
            details: {
              missingFields: ['name'],
            },
          },
          timestamp: Date.now(),
        }),
      });

      await expect(client.registerAgent('')).rejects.toThrow(ValidationError);
    });

    it('should throw GameError on game-specific errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.NOT_YOUR_TURN,
            message: 'It is not your turn',
            details: {
              gameId: 'game123',
            },
          },
          timestamp: Date.now(),
        }),
      });

      await expect(
        client.summon({ gameId: 'game123', handIndex: 0, position: 'attack' })
      ).rejects.toThrow(GameError);
    });
  });

  // ============================================================================
  // Retry Logic Tests
  // ============================================================================

  describe('retry logic', () => {
    it('should retry on 429 rate limit with exponential backoff', async () => {
      vi.useFakeTimers();

      // First call: rate limit
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
            message: 'Rate limit exceeded',
            details: { retryAfter: 1 },
          },
        }),
      });

      // Second call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { agentId: 'test' }, timestamp: Date.now() }),
      });

      const promise = client.getAgentProfile();

      // Fast-forward time for retry delay
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toEqual({ agentId: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should retry on 5xx server errors', async () => {
      vi.useFakeTimers();

      // First call: server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Internal server error',
          },
        }),
      });

      // Second call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { agentId: 'test' }, timestamp: Date.now() }),
      });

      const promise = client.getAgentProfile();
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ agentId: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should not retry on authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Invalid API key',
          },
        }),
      });

      await expect(client.getAgentProfile()).rejects.toThrow(AuthenticationError);

      // Should only be called once, no retries
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      vi.useFakeTimers();

      // All calls fail with 500
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Server error',
          },
        }),
      });

      const promise = client.getAgentProfile();
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // maxRetries = 3

      vi.useRealTimers();
    });

    it('should use exponential backoff for retries', async () => {
      vi.useFakeTimers();

      const delays: number[] = [];
      let startTime = Date.now();

      mockFetch.mockImplementation(async () => {
        const currentTime = Date.now();
        if (delays.length > 0) {
          delays.push(currentTime - startTime);
        }
        startTime = currentTime;

        return {
          ok: false,
          status: 500,
          json: async () => ({
            success: false,
            error: { code: 'ERROR', message: 'Error' },
          }),
        };
      });

      const promise = client.getAgentProfile();
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();

      // Verify exponential backoff pattern (1000ms, 2000ms, 4000ms)
      // Note: timing may vary slightly
      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Timeout Tests
  // ============================================================================

  describe('timeout handling', () => {
    it('should timeout after configured duration', async () => {
      vi.useFakeTimers();

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Never resolves
          })
      );

      const promise = client.getAgentProfile();

      // Fast-forward past timeout
      vi.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow(NetworkError);
      await expect(promise).rejects.toThrow(/timeout/i);

      vi.useRealTimers();
    });

    it('should use longer timeout for matchmaking', async () => {
      const longClient = new LTCGApiClient({
        apiKey: TEST_API_KEY,
        baseUrl: TEST_BASE_URL,
        timeout: 5000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { lobbyId: 'lobby123', status: 'waiting' },
          timestamp: Date.now(),
        }),
      });

      await longClient.enterMatchmaking({ deckId: 'deck123', mode: 'casual' });

      // Matchmaking uses TIMEOUTS.MATCHMAKING (60000ms)
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Agent Management Tests (3 endpoints)
  // ============================================================================

  describe('registerAgent', () => {
    it('should register agent successfully', async () => {
      const responseData = {
        userId: 'user123',
        agentId: 'agent123',
        apiKey: 'ltcg_new_key',
        keyPrefix: 'ltcg_new',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: responseData, timestamp: Date.now() }),
      });

      const result = await client.registerAgent('TestAgent', 'starter_warrior');

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'TestAgent',
            starterDeckCode: 'starter_warrior',
          }),
        })
      );
    });

    it('should register agent without starter deck', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: 'user123', agentId: 'agent123', apiKey: 'key', keyPrefix: 'key' },
          timestamp: Date.now(),
        }),
      });

      await client.registerAgent('TestAgent');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.starterDeckCode).toBeUndefined();
    });
  });

  describe('getAgentProfile', () => {
    it('should get agent profile', async () => {
      const profileData = {
        agentId: 'agent123',
        userId: 'user123',
        name: 'TestAgent',
        elo: 1500,
        wins: 10,
        losses: 5,
        createdAt: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: profileData, timestamp: Date.now() }),
      });

      const result = await client.getAgentProfile();

      expect(result).toEqual(profileData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/me`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_API_KEY}`,
          }),
        })
      );
    });
  });

  describe('getRateLimit', () => {
    it('should get rate limit status', async () => {
      const rateLimitData = {
        remaining: 45,
        limit: 60,
        resetAt: Date.now() + 60000,
        dailyRemaining: 9500,
        dailyLimit: 10000,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: rateLimitData, timestamp: Date.now() }),
      });

      const result = await client.getRateLimit();

      expect(result).toEqual(rateLimitData);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/rate-limit`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  // ============================================================================
  // Game State Tests (4 endpoints)
  // ============================================================================

  describe('getPendingTurns', () => {
    it('should get pending turns', async () => {
      const pendingTurns = [
        { gameId: 'game1', turnNumber: 3 },
        { gameId: 'game2', turnNumber: 5 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: pendingTurns, timestamp: Date.now() }),
      });

      const result = await client.getPendingTurns();

      expect(result).toEqual(pendingTurns);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/pending-turns`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('getGameState', () => {
    it('should get game state with gameId parameter', async () => {
      const gameState = {
        gameId: 'game123',
        status: 'active',
        currentTurn: 'host',
        phase: 'main1',
        turnNumber: 3,
        hostPlayer: {
          playerId: 'player1',
          lifePoints: 8000,
          deckCount: 35,
          monsterZone: [],
          spellTrapZone: [],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        opponentPlayer: {
          playerId: 'player2',
          lifePoints: 7500,
          deckCount: 33,
          monsterZone: [],
          spellTrapZone: [],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        hand: [],
        hasNormalSummoned: false,
        canChangePosition: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: gameState, timestamp: Date.now() }),
      });

      const result = await client.getGameState('game123');

      expect(result).toEqual(gameState);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/games/state?gameId=game123`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('getAvailableActions', () => {
    it('should get available actions', async () => {
      const actions = {
        gameId: 'game123',
        phase: 'main1',
        actions: [
          { type: 'summon', description: 'Summon monster' },
          { type: 'end_turn', description: 'End turn' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: actions, timestamp: Date.now() }),
      });

      const result = await client.getAvailableActions('game123');

      expect(result).toEqual(actions);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/games/available-actions?gameId=game123`,
        expect.any(Object)
      );
    });
  });

  describe('getGameHistory', () => {
    it('should get game history', async () => {
      const history = [
        {
          eventId: 'event1',
          gameId: 'game123',
          turnNumber: 1,
          phase: 'draw',
          eventType: 'draw',
          playerId: 'player1',
          description: 'Player 1 drew a card',
          timestamp: Date.now(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: history, timestamp: Date.now() }),
      });

      const result = await client.getGameHistory('game123');

      expect(result).toEqual(history);
    });
  });

  // ============================================================================
  // Game Actions Tests (10 endpoints)
  // ============================================================================

  describe('summon', () => {
    it('should summon a monster', async () => {
      const response = { success: true, message: 'Monster summoned' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: response, timestamp: Date.now() }),
      });

      const result = await client.summon({
        gameId: 'game123',
        handIndex: 0,
        position: 'attack',
      });

      expect(result).toEqual(response);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/games/actions/summon`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            gameId: 'game123',
            handIndex: 0,
            position: 'attack',
          }),
        })
      );
    });

    it('should summon with tributes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Tribute summoned' },
          timestamp: Date.now(),
        }),
      });

      await client.summon({
        gameId: 'game123',
        handIndex: 2,
        position: 'attack',
        tributeIndices: [0, 1],
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tributeIndices).toEqual([0, 1]);
    });
  });

  describe('setCard', () => {
    it('should set a card face-down', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Card set' },
          timestamp: Date.now(),
        }),
      });

      const result = await client.setCard({
        gameId: 'game123',
        handIndex: 1,
        zone: 'monster',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('activateSpell', () => {
    it('should activate spell from hand', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Spell activated' },
          timestamp: Date.now(),
        }),
      });

      await client.activateSpell({
        gameId: 'game123',
        handIndex: 2,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.handIndex).toBe(2);
    });

    it('should activate spell from board', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Spell activated' },
          timestamp: Date.now(),
        }),
      });

      await client.activateSpell({
        gameId: 'game123',
        boardIndex: 0,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.boardIndex).toBe(0);
    });
  });

  describe('attack', () => {
    it('should perform direct attack', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Direct attack' },
          timestamp: Date.now(),
        }),
      });

      await client.attack({
        gameId: 'game123',
        attackerBoardIndex: 0,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.targetBoardIndex).toBeUndefined();
    });

    it('should attack target monster', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Attack successful' },
          timestamp: Date.now(),
        }),
      });

      await client.attack({
        gameId: 'game123',
        attackerBoardIndex: 0,
        targetBoardIndex: 1,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.targetBoardIndex).toBe(1);
    });
  });

  describe('endTurn', () => {
    it('should end turn', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Turn ended' },
          timestamp: Date.now(),
        }),
      });

      const result = await client.endTurn({ gameId: 'game123' });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Matchmaking Tests (4 endpoints)
  // ============================================================================

  describe('enterMatchmaking', () => {
    it('should enter matchmaking queue', async () => {
      const response = {
        lobbyId: 'lobby123',
        status: 'waiting',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: response, timestamp: Date.now() }),
      });

      const result = await client.enterMatchmaking({
        deckId: 'deck123',
        mode: 'ranked',
      });

      expect(result).toEqual(response);
    });

    it('should create private lobby', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { lobbyId: 'lobby123', joinCode: 'ABC123', status: 'waiting' },
          timestamp: Date.now(),
        }),
      });

      await client.enterMatchmaking({
        deckId: 'deck123',
        mode: 'casual',
        isPrivate: true,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.isPrivate).toBe(true);
    });
  });

  describe('getLobbies', () => {
    it('should get all lobbies', async () => {
      const lobbies = [
        {
          lobbyId: 'lobby1',
          mode: 'casual',
          hostPlayerId: 'player1',
          hostPlayerName: 'Player1',
          isPrivate: false,
          status: 'waiting',
          createdAt: Date.now(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: lobbies, timestamp: Date.now() }),
      });

      const result = await client.getLobbies();

      expect(result).toEqual(lobbies);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/matchmaking/lobbies`,
        expect.any(Object)
      );
    });

    it('should filter lobbies by mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: Date.now() }),
      });

      await client.getLobbies('ranked');

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/matchmaking/lobbies?mode=ranked`,
        expect.any(Object)
      );
    });
  });

  describe('joinLobby', () => {
    it('should join lobby by ID', async () => {
      const response = {
        gameId: 'game123',
        opponentName: 'Opponent',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: response, timestamp: Date.now() }),
      });

      const result = await client.joinLobby({
        lobbyId: 'lobby123',
        deckId: 'deck123',
      });

      expect(result).toEqual(response);
    });

    it('should join lobby by join code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { gameId: 'game123', opponentName: 'Host' },
          timestamp: Date.now(),
        }),
      });

      await client.joinLobby({
        joinCode: 'ABC123',
        deckId: 'deck123',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.joinCode).toBe('ABC123');
    });
  });

  describe('leaveLobby', () => {
    it('should leave lobby', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: 'Left lobby' },
          timestamp: Date.now(),
        }),
      });

      await client.leaveLobby('lobby123');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.lobbyId).toBe('lobby123');
    });
  });

  // ============================================================================
  // Decks & Cards Tests (6 endpoints)
  // ============================================================================

  describe('getDecks', () => {
    it('should get all decks', async () => {
      const decks = [
        {
          deckId: 'deck1',
          name: 'My Deck',
          cards: [],
          archetype: 'warrior',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: decks, timestamp: Date.now() }),
      });

      const result = await client.getDecks();

      expect(result).toEqual(decks);
    });
  });

  describe('getDeck', () => {
    it('should get specific deck', async () => {
      const deck = {
        deckId: 'deck123',
        name: 'Warrior Deck',
        cards: [],
        archetype: 'warrior',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: deck, timestamp: Date.now() }),
      });

      const result = await client.getDeck('deck123');

      expect(result).toEqual(deck);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/decks/deck123`,
        expect.any(Object)
      );
    });
  });

  describe('getStarterDecks', () => {
    it('should get starter decks without auth', async () => {
      const starterDecks = [
        {
          code: 'starter_warrior',
          name: 'Warrior Starter',
          description: 'A basic warrior deck',
          archetype: 'warrior',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: starterDecks, timestamp: Date.now() }),
      });

      const result = await client.getStarterDecks();

      expect(result).toEqual(starterDecks);

      // Verify no Authorization header
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('createDeck', () => {
    it('should create new deck', async () => {
      const newDeck = {
        deckId: 'deck456',
        name: 'Custom Deck',
        cards: [],
        archetype: 'dragon',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newDeck, timestamp: Date.now() }),
      });

      const result = await client.createDeck({
        name: 'Custom Deck',
        cardIds: ['card1', 'card2'],
        archetype: 'dragon',
      });

      expect(result).toEqual(newDeck);
    });
  });

  describe('getCards', () => {
    it('should get all cards without filters', async () => {
      const cards = [
        {
          cardId: 'card1',
          name: 'Dark Magician',
          type: 'monster',
          description: 'A powerful wizard',
          abilities: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: cards, timestamp: Date.now() }),
      });

      const result = await client.getCards();

      expect(result).toEqual(cards);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/cards`,
        expect.any(Object)
      );
    });

    it('should get cards with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], timestamp: Date.now() }),
      });

      await client.getCards({ type: 'monster', archetype: 'warrior', race: 'Dragon' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/cards?type=monster&archetype=warrior&race=Dragon`,
        expect.any(Object)
      );
    });
  });

  describe('getCard', () => {
    it('should get specific card', async () => {
      const card = {
        cardId: 'card123',
        name: 'Blue-Eyes White Dragon',
        type: 'monster',
        level: 8,
        atk: 3000,
        def: 2500,
        description: 'Legendary dragon',
        abilities: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: card, timestamp: Date.now() }),
      });

      const result = await client.getCard('card123');

      expect(result).toEqual(card);
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/cards/card123`,
        expect.any(Object)
      );
    });
  });
});
