import { describe, expect, it, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { logger } from '@elizaos/core';
import { StateAggregator } from '../StateAggregator';
import type { LTCGPollingService } from '../LTCGPollingService';
import type { TurnOrchestrator } from '../TurnOrchestrator';
import type { LTCGApiClient } from '../../client/LTCGApiClient';
import type { IAgentRuntime } from '@elizaos/core';
import type { GameStateResponse } from '../../types/api';

// ============================================================================
// Mock Setup
// ============================================================================

// Suppress logger output during tests
beforeEach(() => {
  spyOn(logger, 'info').mockImplementation(() => {});
  spyOn(logger, 'error').mockImplementation(() => {});
  spyOn(logger, 'warn').mockImplementation(() => {});
  spyOn(logger, 'debug').mockImplementation(() => {});
});

/**
 * Create a mock IAgentRuntime
 */
function createMockRuntime(
  settings: Record<string, string | undefined> = {},
  services: Record<string, unknown> = {}
): IAgentRuntime {
  const defaultSettings: Record<string, string | undefined> = {
    CONVEX_URL: 'https://convex.test.com',
    LTCG_USER_ID: 'test-user-id',
    ...settings,
  };

  return {
    getSetting: (key: string) => defaultSettings[key],
    getService: (serviceType: string) => services[serviceType] ?? null,
  } as unknown as IAgentRuntime;
}

/**
 * Create a mock LTCGPollingService
 */
function createMockPollingService(overrides: Partial<LTCGPollingService> = {}): LTCGPollingService {
  return {
    isActive: mock(() => false),
    getCurrentGameId: mock(() => null),
    isMatchmakingEnabled: mock(() => false),
    getMatchmakingStatus: mock(() => ({
      enabled: false,
      status: 'idle' as const,
      lobbiesScanned: 0,
      recentJoins: [],
      stats: {
        lobbiesJoined: 0,
        gamesStarted: 0,
        lastScanAt: 0,
      },
      nextScanIn: 0,
    })),
    getClient: mock(() => null),
    ...overrides,
  } as unknown as LTCGPollingService;
}

/**
 * Create a mock TurnOrchestrator
 */
function createMockOrchestrator(overrides: Partial<TurnOrchestrator> = {}): TurnOrchestrator {
  return {
    getDecisionHistory: mock(() => []),
    ...overrides,
  } as unknown as TurnOrchestrator;
}

/**
 * Create a mock LTCGApiClient
 */
function createMockApiClient(overrides: Partial<LTCGApiClient> = {}): LTCGApiClient {
  return {
    getGameState: mock(() => Promise.resolve(createMockGameState())),
    ...overrides,
  } as unknown as LTCGApiClient;
}

/**
 * Create a mock GameStateResponse
 */
function createMockGameState(overrides: Partial<GameStateResponse> = {}): GameStateResponse {
  return {
    status: 'in_progress',
    phase: 'main1',
    turnNumber: 1,
    currentTurn: 'host',
    isMyTurn: true,
    myLifePoints: 8000,
    opponentLifePoints: 8000,
    hostPlayer: {
      playerId: 'host-id',
      lifePoints: 8000,
      monsterZone: [],
      spellTrapZone: [],
    },
    opponentPlayer: {
      playerId: 'opp-id',
      lifePoints: 8000,
      monsterZone: [],
      spellTrapZone: [],
    },
    hand: [],
    myBoard: [],
    opponentBoard: [],
    ...overrides,
  } as GameStateResponse;
}

/**
 * Access private members for testing
 */
function getPrivateMembers(service: StateAggregator) {
  return service as unknown as {
    runtime: IAgentRuntime | null;
    pollingService: LTCGPollingService | null;
    orchestrator: TurnOrchestrator | null;
    apiClient: LTCGApiClient | null;
    convexClient: unknown;
    gameStateCache: Map<string, { gameState: GameStateResponse; timestamp: number }>;
    CACHE_TTL: number;
    getPollingService(): LTCGPollingService | null;
    getOrchestrator(): TurnOrchestrator | null;
    transformGameState(gameState: GameStateResponse, gameId: string): unknown;
    determineWinner(gameState: GameStateResponse): 'agent' | 'opponent' | undefined;
  };
}

// ============================================================================
// Initialization Tests
// ============================================================================

describe('StateAggregator - Initialization', () => {
  let aggregator: StateAggregator;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    aggregator = new StateAggregator(mockRuntime);
  });

  describe('initialize', () => {
    it('should initialize successfully with CONVEX_URL', async () => {
      await aggregator.initialize(mockRuntime);

      const privateMethods = getPrivateMembers(aggregator);
      expect(privateMethods.runtime).toBe(mockRuntime);
    });

    it('should initialize without CONVEX_URL (with warning)', async () => {
      const runtimeWithoutConvex = createMockRuntime({ CONVEX_URL: undefined });

      await aggregator.initialize(runtimeWithoutConvex);

      expect(logger.warn).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Lazy Service Loading Tests
// ============================================================================

describe('StateAggregator - Lazy Service Loading', () => {
  let aggregator: StateAggregator;
  let mockPollingService: LTCGPollingService;
  let mockOrchestrator: TurnOrchestrator;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockPollingService = createMockPollingService();
    mockOrchestrator = createMockOrchestrator();

    mockRuntime = createMockRuntime({}, {
      'ltcg-polling': mockPollingService,
      'ltcg-turn-orchestrator': mockOrchestrator,
    });

    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  describe('getPollingService (lazy loading)', () => {
    it('should load polling service on first access', () => {
      const privateMethods = getPrivateMembers(aggregator);

      // Initially null
      expect(privateMethods.pollingService).toBe(null);

      // Trigger lazy load through public API
      const service = privateMethods.getPollingService();

      expect(service).toBe(mockPollingService);
      expect(privateMethods.pollingService).toBe(mockPollingService);
    });

    it('should return cached service on subsequent calls', () => {
      const privateMethods = getPrivateMembers(aggregator);

      const service1 = privateMethods.getPollingService();
      const service2 = privateMethods.getPollingService();

      expect(service1).toBe(service2);
      // Both calls return the same cached service
      expect(service1).toBe(mockPollingService);
    });

    it('should return null if service is not available', async () => {
      const runtimeWithNoServices = createMockRuntime({}, {});
      const freshAggregator = new StateAggregator(runtimeWithNoServices);
      await freshAggregator.initialize(runtimeWithNoServices);

      const privateMethods = getPrivateMembers(freshAggregator);
      const service = privateMethods.getPollingService();

      expect(service).toBe(null);
    });
  });

  describe('getOrchestrator (lazy loading)', () => {
    it('should load orchestrator on first access', () => {
      const privateMethods = getPrivateMembers(aggregator);

      // Initially null
      expect(privateMethods.orchestrator).toBe(null);

      // Trigger lazy load
      const service = privateMethods.getOrchestrator();

      expect(service).toBe(mockOrchestrator);
      expect(privateMethods.orchestrator).toBe(mockOrchestrator);
    });

    it('should return cached orchestrator on subsequent calls', () => {
      const privateMethods = getPrivateMembers(aggregator);

      const service1 = privateMethods.getOrchestrator();
      const service2 = privateMethods.getOrchestrator();

      expect(service1).toBe(service2);
    });
  });
});

// ============================================================================
// Caching Tests
// ============================================================================

describe('StateAggregator - Caching Behavior', () => {
  let aggregator: StateAggregator;
  let mockApiClient: LTCGApiClient;
  let mockPollingService: LTCGPollingService;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockApiClient = createMockApiClient();
    mockPollingService = createMockPollingService({
      getClient: mock(() => mockApiClient),
    });

    mockRuntime = createMockRuntime({}, {
      'ltcg-polling': mockPollingService,
    });

    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  describe('game state caching', () => {
    it('should cache game state after first fetch', async () => {
      const gameId = 'test-game-id';

      // First call - should fetch
      await aggregator.getGameState('test-agent', gameId);

      expect(mockApiClient.getGameState).toHaveBeenCalledTimes(1);
    });

    it('should return cached state within TTL', async () => {
      const gameId = 'test-game-id-cached';
      const privateMethods = getPrivateMembers(aggregator);

      // Pre-populate cache
      const cachedState = createMockGameState({ turnNumber: 5 });
      privateMethods.gameStateCache.set(gameId, {
        gameState: cachedState,
        timestamp: Date.now(), // Fresh cache
      });

      // Should return cached state
      const result = await aggregator.getGameState('test-agent', gameId);

      expect(result.turnNumber).toBe(5);
      expect(mockApiClient.getGameState).not.toHaveBeenCalled();
    });

    it('should fetch fresh state when cache is expired', async () => {
      const gameId = 'test-game-id-expired';
      const privateMethods = getPrivateMembers(aggregator);

      // Pre-populate cache with expired timestamp
      const cachedState = createMockGameState({ turnNumber: 3 });
      privateMethods.gameStateCache.set(gameId, {
        gameState: cachedState,
        timestamp: Date.now() - privateMethods.CACHE_TTL - 1000, // Expired
      });

      // Mock fresh state
      const freshState = createMockGameState({ turnNumber: 7 });
      (mockApiClient.getGameState as ReturnType<typeof mock>).mockResolvedValue(freshState);

      const result = await aggregator.getGameState('test-agent', gameId);

      expect(mockApiClient.getGameState).toHaveBeenCalledWith(gameId);
      expect(result.turnNumber).toBe(7);
    });

    it('should update cache timestamp on fresh fetch', async () => {
      const gameId = 'test-game-id-update';
      const privateMethods = getPrivateMembers(aggregator);
      const beforeFetch = Date.now();

      await aggregator.getGameState('test-agent', gameId);

      const cached = privateMethods.gameStateCache.get(gameId);
      expect(cached).toBeDefined();
      expect(cached!.timestamp).toBeGreaterThanOrEqual(beforeFetch);
    });
  });

  describe('cache TTL (5 seconds)', () => {
    it('should have 5 second TTL', () => {
      const privateMethods = getPrivateMembers(aggregator);

      expect(privateMethods.CACHE_TTL).toBe(5000);
    });

    it('should respect 5 second TTL boundary', async () => {
      const gameId = 'test-ttl-boundary';
      const privateMethods = getPrivateMembers(aggregator);

      // Cache with timestamp exactly at TTL boundary
      const cachedState = createMockGameState({ turnNumber: 10 });
      privateMethods.gameStateCache.set(gameId, {
        gameState: cachedState,
        timestamp: Date.now() - 4999, // Just under TTL
      });

      const result = await aggregator.getGameState('test-agent', gameId);

      // Should return cached state (not fetch fresh)
      expect(result.turnNumber).toBe(10);
      expect(mockApiClient.getGameState).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Data Aggregation Tests
// ============================================================================

describe('StateAggregator - Data Aggregation', () => {
  let aggregator: StateAggregator;
  let mockApiClient: LTCGApiClient;
  let mockPollingService: LTCGPollingService;
  let mockOrchestrator: TurnOrchestrator;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockApiClient = createMockApiClient();
    mockPollingService = createMockPollingService({
      getClient: mock(() => mockApiClient),
      isActive: mock(() => true),
      getCurrentGameId: mock(() => 'current-game-id'),
      isMatchmakingEnabled: mock(() => true),
    });
    mockOrchestrator = createMockOrchestrator({
      getDecisionHistory: mock(() => [
        {
          id: 'decision-1',
          timestamp: Date.now(),
          turnNumber: 1,
          phase: 'main1',
          action: 'SUMMON_MONSTER',
          reasoning: 'Establish board presence',
          parameters: { handIndex: 0 },
          result: 'success',
          executionTimeMs: 150,
        },
        {
          id: 'decision-2',
          timestamp: Date.now(),
          turnNumber: 1,
          phase: 'battle',
          action: 'ATTACK',
          reasoning: 'Deal damage',
          parameters: { attackerBoardIndex: 0 },
          result: 'success',
          executionTimeMs: 100,
        },
      ]),
    });

    mockRuntime = createMockRuntime({}, {
      'ltcg-polling': mockPollingService,
      'ltcg-turn-orchestrator': mockOrchestrator,
    });

    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  describe('getAgentStatus', () => {
    it('should aggregate status from polling service', async () => {
      const status = await aggregator.getAgentStatus('test-agent');

      expect(status.agentId).toBe('test-agent');
      expect(status.isRunning).toBe(true);
      expect(status.pollingActive).toBe(true);
      expect(status.currentGameId).toBe('current-game-id');
      expect(status.autoMatchmaking).toBe(true);
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.lastActivity).toBeGreaterThan(0);
    });

    it('should throw error if polling service unavailable', async () => {
      const runtimeWithNoServices = createMockRuntime({}, {});
      const freshAggregator = new StateAggregator(runtimeWithNoServices);
      await freshAggregator.initialize(runtimeWithNoServices);

      await expect(freshAggregator.getAgentStatus('test-agent'))
        .rejects.toThrow('Polling service not available');
    });
  });

  describe('getMatchmakingStatus', () => {
    it('should return matchmaking status from polling service', async () => {
      const customStatus = {
        enabled: true,
        status: 'scanning' as const,
        lobbiesScanned: 5,
        recentJoins: [
          { timestamp: Date.now(), lobbyId: 'lobby-1', hostUsername: 'player1', gameId: 'game-1' },
        ],
        stats: {
          lobbiesJoined: 3,
          gamesStarted: 2,
          lastScanAt: Date.now(),
        },
        nextScanIn: 5000,
      };

      (mockPollingService.getMatchmakingStatus as ReturnType<typeof mock>).mockReturnValue(customStatus);

      const status = await aggregator.getMatchmakingStatus('test-agent');

      expect(status).toEqual(customStatus);
    });
  });

  describe('getDecisionHistory', () => {
    it('should return decision history from orchestrator', async () => {
      const result = await aggregator.getDecisionHistory('test-agent', 'game-123');

      expect(result.decisions).toHaveLength(2);
      expect(result.decisions[0].action).toBe('SUMMON_MONSTER');
      expect(result.decisions[1].action).toBe('ATTACK');
    });

    it('should return empty array if orchestrator unavailable', async () => {
      const runtimeWithNoOrchestrator = createMockRuntime({}, {
        'ltcg-polling': mockPollingService,
      });
      const freshAggregator = new StateAggregator(runtimeWithNoOrchestrator);
      await freshAggregator.initialize(runtimeWithNoOrchestrator);

      const result = await freshAggregator.getDecisionHistory('test-agent', 'game-123');

      expect(result.decisions).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const result = await aggregator.getDecisionHistory('test-agent', 'game-123', 10);

      expect(mockOrchestrator.getDecisionHistory).toHaveBeenCalledWith('game-123', 10);
    });

    it('should use default limit of 20', async () => {
      await aggregator.getDecisionHistory('test-agent', 'game-123');

      expect(mockOrchestrator.getDecisionHistory).toHaveBeenCalledWith('game-123', 20);
    });
  });

  describe('getGameState', () => {
    it('should transform game state into snapshot format', async () => {
      const gameState = createMockGameState({
        phase: 'battle',
        turnNumber: 3,
        isMyTurn: true,
        myLifePoints: 6000,
        opponentLifePoints: 4000,
        hand: [
          { name: 'Blue Dragon', type: 'creature', cardType: 'creature', handIndex: 0 },
          { name: 'Magic Bolt', type: 'spell', cardType: 'spell', handIndex: 1 },
        ],
        myBoard: [
          { name: 'Red Warrior', cardType: 'creature' },
          { name: 'Shield Wall', cardType: 'spell' },
        ],
        opponentBoard: [
          { name: 'Dark Knight', cardType: 'creature' },
          { name: 'Trap Hole', cardType: 'trap' },
        ],
        status: 'in_progress',
      } as Partial<GameStateResponse>);

      (mockApiClient.getGameState as ReturnType<typeof mock>).mockResolvedValue(gameState);

      const snapshot = await aggregator.getGameState('test-agent', 'game-456');

      expect(snapshot.gameId).toBe('game-456');
      expect(snapshot.phase).toBe('battle');
      expect(snapshot.turnNumber).toBe(3);
      expect(snapshot.isMyTurn).toBe(true);
      expect(snapshot.lifePoints.agent).toBe(6000);
      expect(snapshot.lifePoints.opponent).toBe(4000);
      expect(snapshot.hand.count).toBe(2);
      expect(snapshot.board.agentMonsters).toBe(1);
      expect(snapshot.board.agentSpellTraps).toBe(1);
      expect(snapshot.board.opponentMonsters).toBe(1);
      expect(snapshot.board.opponentSpellTraps).toBe(1);
    });

    it('should throw error if API client unavailable', async () => {
      (mockPollingService.getClient as ReturnType<typeof mock>).mockReturnValue(null);

      await expect(aggregator.getGameState('test-agent', 'game-789'))
        .rejects.toThrow('API client not available');
    });
  });
});

// ============================================================================
// Game State Transformation Tests
// ============================================================================

describe('StateAggregator - transformGameState', () => {
  let aggregator: StateAggregator;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockRuntime = createMockRuntime();
    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  describe('card type mapping', () => {
    it('should map creature to monster', () => {
      const privateMethods = getPrivateMembers(aggregator);
      const gameState = createMockGameState({
        hand: [{ name: 'Test Monster', type: 'creature', cardType: 'creature', handIndex: 0 }],
      } as Partial<GameStateResponse>);

      const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { hand: { cards: Array<{ type: string }> } };

      expect(snapshot.hand.cards[0].type).toBe('monster');
    });

    it('should map spell to spell', () => {
      const privateMethods = getPrivateMembers(aggregator);
      const gameState = createMockGameState({
        hand: [{ name: 'Test Spell', type: 'spell', cardType: 'spell', handIndex: 0 }],
      } as Partial<GameStateResponse>);

      const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { hand: { cards: Array<{ type: string }> } };

      expect(snapshot.hand.cards[0].type).toBe('spell');
    });

    it('should map trap to trap', () => {
      const privateMethods = getPrivateMembers(aggregator);
      const gameState = createMockGameState({
        hand: [{ name: 'Test Trap', type: 'trap', cardType: 'trap', handIndex: 0 }],
      } as Partial<GameStateResponse>);

      const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { hand: { cards: Array<{ type: string }> } };

      expect(snapshot.hand.cards[0].type).toBe('trap');
    });

    it('should map equipment to spell', () => {
      const privateMethods = getPrivateMembers(aggregator);
      const gameState = createMockGameState({
        hand: [{ name: 'Test Equipment', type: 'equipment', cardType: 'equipment', handIndex: 0 }],
      } as Partial<GameStateResponse>);

      const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { hand: { cards: Array<{ type: string }> } };

      expect(snapshot.hand.cards[0].type).toBe('spell');
    });
  });

  describe('board counting', () => {
    it('should count monsters and spell/traps correctly', () => {
      const privateMethods = getPrivateMembers(aggregator);
      const gameState = createMockGameState({
        myBoard: [
          { cardType: 'creature' },
          { cardType: 'creature' },
          { cardType: 'spell' },
          { cardType: 'trap' },
          { cardType: 'equipment' },
        ],
        opponentBoard: [
          { cardType: 'creature' },
          { cardType: 'spell' },
        ],
      } as Partial<GameStateResponse>);

      const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { board: { agentMonsters: number; agentSpellTraps: number; opponentMonsters: number; opponentSpellTraps: number } };

      expect(snapshot.board.agentMonsters).toBe(2);
      expect(snapshot.board.agentSpellTraps).toBe(3); // spell + trap + equipment
      expect(snapshot.board.opponentMonsters).toBe(1);
      expect(snapshot.board.opponentSpellTraps).toBe(1);
    });

    it('should handle empty boards', () => {
      const privateMethods = getPrivateMembers(aggregator);
      const gameState = createMockGameState({
        myBoard: [],
        opponentBoard: [],
      } as Partial<GameStateResponse>);

      const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { board: { agentMonsters: number; agentSpellTraps: number; opponentMonsters: number; opponentSpellTraps: number } };

      expect(snapshot.board.agentMonsters).toBe(0);
      expect(snapshot.board.agentSpellTraps).toBe(0);
      expect(snapshot.board.opponentMonsters).toBe(0);
      expect(snapshot.board.opponentSpellTraps).toBe(0);
    });
  });
});

// ============================================================================
// determineWinner Tests
// ============================================================================

describe('StateAggregator - determineWinner', () => {
  let aggregator: StateAggregator;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockRuntime = createMockRuntime();
    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  it('should return undefined for in-progress games', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      status: 'in_progress',
      myLifePoints: 8000,
      opponentLifePoints: 8000,
    });

    const winner = privateMethods.determineWinner(gameState);

    expect(winner).toBeUndefined();
  });

  it('should return opponent as winner when agent LP is 0', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      status: 'completed',
      myLifePoints: 0,
      opponentLifePoints: 5000,
    });

    const winner = privateMethods.determineWinner(gameState);

    expect(winner).toBe('opponent');
  });

  it('should return agent as winner when opponent LP is 0', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      status: 'completed',
      myLifePoints: 3000,
      opponentLifePoints: 0,
    });

    const winner = privateMethods.determineWinner(gameState);

    expect(winner).toBe('agent');
  });

  it('should return undefined when game is completed but neither LP is 0', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      status: 'completed',
      myLifePoints: 2000,
      opponentLifePoints: 3000,
    });

    const winner = privateMethods.determineWinner(gameState);

    // This scenario might be a surrender or timeout
    expect(winner).toBeUndefined();
  });
});

// ============================================================================
// getMetrics Tests
// ============================================================================

describe('StateAggregator - getMetrics', () => {
  let aggregator: StateAggregator;
  let mockPollingService: LTCGPollingService;
  let mockOrchestrator: TurnOrchestrator;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockPollingService = createMockPollingService({
      getCurrentGameId: mock(() => 'current-game'),
      getMatchmakingStatus: mock(() => ({
        enabled: true,
        status: 'scanning' as const,
        lobbiesScanned: 0,
        recentJoins: [],
        stats: {
          lobbiesJoined: 5,
          gamesStarted: 4,
          lastScanAt: Date.now(),
        },
        nextScanIn: 5000,
      })),
    });

    mockOrchestrator = createMockOrchestrator({
      getDecisionHistory: mock(() => [
        { executionTimeMs: 100, turnNumber: 1 },
        { executionTimeMs: 200, turnNumber: 1 },
        { executionTimeMs: 150, turnNumber: 2 },
      ]),
    });

    mockRuntime = createMockRuntime({ CONVEX_URL: undefined }, {
      'ltcg-polling': mockPollingService,
      'ltcg-turn-orchestrator': mockOrchestrator,
    });

    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  it('should return metrics structure', async () => {
    const metrics = await aggregator.getMetrics('test-agent');

    expect(metrics).toHaveProperty('lifetime');
    expect(metrics).toHaveProperty('performance');
    expect(metrics).toHaveProperty('recentGames');
  });

  it('should calculate average turn time from decisions', async () => {
    const metrics = await aggregator.getMetrics('test-agent');

    // (100 + 200 + 150) / 3 = 150
    expect(metrics.performance.avgTurnTimeMs).toBe(150);
  });

  it('should calculate average actions per turn', async () => {
    const metrics = await aggregator.getMetrics('test-agent');

    // Turn 1: 2 actions, Turn 2: 1 action, Average: 1.5
    expect(metrics.performance.avgActionsPerTurn).toBe(1.5);
  });

  it('should fallback to matchmaking stats when no Convex data', async () => {
    const metrics = await aggregator.getMetrics('test-agent');

    // Should use matchmaking stats as fallback
    expect(metrics.lifetime.gamesPlayed).toBe(4);
  });

  it('should handle errors gracefully and return default metrics', async () => {
    // Create a runtime that will cause an error
    const errorThrowingOrchestrator = createMockOrchestrator({
      getDecisionHistory: mock(() => {
        throw new Error('Orchestrator error');
      }),
    });

    const errorRuntime = createMockRuntime({ CONVEX_URL: undefined }, {
      'ltcg-polling': mockPollingService,
      'ltcg-turn-orchestrator': errorThrowingOrchestrator,
    });

    const errorAggregator = new StateAggregator(errorRuntime);
    await errorAggregator.initialize(errorRuntime);

    const metrics = await errorAggregator.getMetrics('test-agent');

    // Should return metrics even if there was an error
    expect(metrics).toBeDefined();
    expect(metrics.lifetime).toBeDefined();
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('StateAggregator - Error Handling', () => {
  let aggregator: StateAggregator;
  let mockApiClient: LTCGApiClient;
  let mockPollingService: LTCGPollingService;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockApiClient = createMockApiClient({
      getGameState: mock(() => Promise.reject(new Error('API Error'))),
    });
    mockPollingService = createMockPollingService({
      getClient: mock(() => mockApiClient),
    });

    mockRuntime = createMockRuntime({}, {
      'ltcg-polling': mockPollingService,
    });

    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  it('should propagate API errors from getGameState', async () => {
    await expect(aggregator.getGameState('test-agent', 'game-error'))
      .rejects.toThrow('API Error');
  });

  it('should handle missing polling service for getGameState', async () => {
    const runtimeWithNoServices = createMockRuntime({}, {});
    const freshAggregator = new StateAggregator(runtimeWithNoServices);
    await freshAggregator.initialize(runtimeWithNoServices);

    await expect(freshAggregator.getGameState('test-agent', 'game-123'))
      .rejects.toThrow('Game state unavailable');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('StateAggregator - Edge Cases', () => {
  let aggregator: StateAggregator;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockRuntime = createMockRuntime();
    aggregator = new StateAggregator(mockRuntime);
    await aggregator.initialize(mockRuntime);
  });

  it('should handle undefined/null board arrays', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      myBoard: undefined as unknown as [],
      opponentBoard: undefined as unknown as [],
    });

    const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { board: { agentMonsters: number; agentSpellTraps: number; opponentMonsters: number; opponentSpellTraps: number } };

    expect(snapshot.board.agentMonsters).toBe(0);
    expect(snapshot.board.agentSpellTraps).toBe(0);
    expect(snapshot.board.opponentMonsters).toBe(0);
    expect(snapshot.board.opponentSpellTraps).toBe(0);
  });

  it('should handle undefined hand', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      hand: undefined as unknown as [],
    });

    const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { hand: { count: number; cards: [] } };

    expect(snapshot.hand.count).toBe(0);
    expect(snapshot.hand.cards).toEqual([]);
  });

  it('should handle cards with missing names', () => {
    const privateMethods = getPrivateMembers(aggregator);
    const gameState = createMockGameState({
      hand: [{ cardType: 'creature', handIndex: 0 }], // No name property
    } as Partial<GameStateResponse>);

    const snapshot = privateMethods.transformGameState(gameState, 'test-game') as { hand: { cards: Array<{ name: string }> } };

    expect(snapshot.hand.cards[0].name).toBe('Unknown Card');
  });
});
