import { describe, expect, it, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { logger } from '@elizaos/core';
import { LTCGPollingService, type PollingConfig } from '../LTCGPollingService';
import type { LTCGApiClient } from '../../client/LTCGApiClient';
import type { IAgentRuntime } from '@elizaos/core';

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
function createMockRuntime(settings: Record<string, string | undefined> = {}): IAgentRuntime {
  const defaultSettings: Record<string, string | undefined> = {
    LTCG_API_KEY: 'test-api-key',
    LTCG_API_URL: 'https://api.test.com',
    LTCG_DEBUG_MODE: 'false',
    LTCG_AUTO_MATCHMAKING: 'false',
    LTCG_CALLBACK_URL: undefined,
    LTCG_AGENT_ID: 'test-agent-id',
    ...settings,
  };

  return {
    getSetting: (key: string) => defaultSettings[key],
    getService: () => null,
  } as unknown as IAgentRuntime;
}

/**
 * Create a mock LTCGApiClient
 */
function createMockApiClient(overrides: Partial<LTCGApiClient> = {}): LTCGApiClient {
  return {
    getPendingTurns: mock(() => Promise.resolve([])),
    getLobbies: mock(() => Promise.resolve([])),
    getGameState: mock(() => Promise.resolve({
      status: 'in_progress',
      phase: 'main1',
      turnNumber: 1,
      currentTurn: 'host',
      hostPlayer: { playerId: 'host-id', lifePoints: 8000 },
      opponentPlayer: { playerId: 'opp-id', lifePoints: 8000 },
      hand: [],
    })),
    joinLobby: mock(() => Promise.resolve({ gameId: 'test-game-id' })),
    getDecks: mock(() => Promise.resolve([{ deckId: 'test-deck-id', name: 'Test Deck' }])),
    ...overrides,
  } as unknown as LTCGApiClient;
}

/**
 * Access private members for testing using type assertion
 */
function getPrivateMembers(service: LTCGPollingService) {
  return service as unknown as {
    client: LTCGApiClient | null;
    circuitBreakers: Map<string, {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      lastFailureTime: number;
      successCount: number;
    }>;
    retryDelays: Map<string, number>;
    errorRecovery: {
      maxRetries: number;
      baseDelayMs: number;
      maxDelayMs: number;
      circuitBreakerThreshold: number;
      circuitBreakerResetMs: number;
    };
    getCircuitBreaker(name: string): {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      lastFailureTime: number;
      successCount: number;
    };
    isCircuitOpen(name: string): boolean;
    recordSuccess(name: string): void;
    recordFailure(name: string): void;
    getRetryDelay(name: string): number;
    executeWithRecovery<T>(
      name: string,
      operation: () => Promise<T>,
      options?: { silent?: boolean }
    ): Promise<T | null>;
  };
}

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

describe('LTCGPollingService - Circuit Breaker', () => {
  let service: LTCGPollingService;
  let privateMethods: ReturnType<typeof getPrivateMembers>;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new LTCGPollingService(mockRuntime, { debug: false });
    privateMethods = getPrivateMembers(service);
  });

  afterEach(() => {
    service.stop();
  });

  describe('getCircuitBreaker', () => {
    it('should create a new circuit breaker in closed state', () => {
      const breaker = privateMethods.getCircuitBreaker('test-operation');

      expect(breaker).toBeDefined();
      expect(breaker.state).toBe('closed');
      expect(breaker.failureCount).toBe(0);
      expect(breaker.successCount).toBe(0);
      expect(breaker.lastFailureTime).toBe(0);
    });

    it('should return same circuit breaker for same operation name', () => {
      const breaker1 = privateMethods.getCircuitBreaker('test-operation');
      breaker1.failureCount = 3;

      const breaker2 = privateMethods.getCircuitBreaker('test-operation');

      expect(breaker2.failureCount).toBe(3);
      expect(breaker1).toBe(breaker2);
    });

    it('should create separate circuit breakers for different operations', () => {
      const breaker1 = privateMethods.getCircuitBreaker('operation-a');
      const breaker2 = privateMethods.getCircuitBreaker('operation-b');

      breaker1.failureCount = 5;

      expect(breaker2.failureCount).toBe(0);
    });
  });

  describe('Circuit state transitions: closed -> open -> half-open -> closed', () => {
    it('should open circuit breaker after reaching failure threshold', () => {
      const operationName = 'test-threshold-operation';
      const threshold = privateMethods.errorRecovery.circuitBreakerThreshold;

      // Record failures up to threshold
      for (let i = 0; i < threshold; i++) {
        privateMethods.recordFailure(operationName);
      }

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.state).toBe('open');
      expect(breaker.failureCount).toBe(threshold);
    });

    it('should transition from open to half-open after reset time', () => {
      const operationName = 'test-halfopen-operation';
      const breaker = privateMethods.getCircuitBreaker(operationName);

      // Open the circuit
      breaker.state = 'open';
      // Set lastFailureTime to past the reset time
      breaker.lastFailureTime = Date.now() - privateMethods.errorRecovery.circuitBreakerResetMs - 1000;

      // This should trigger the half-open transition check
      const isOpen = privateMethods.isCircuitOpen(operationName);

      expect(isOpen).toBe(false);
      expect(breaker.state).toBe('half-open');
    });

    it('should keep circuit open if reset time has not passed', () => {
      const operationName = 'test-still-open';
      const breaker = privateMethods.getCircuitBreaker(operationName);

      // Open the circuit
      breaker.state = 'open';
      breaker.lastFailureTime = Date.now();

      const isOpen = privateMethods.isCircuitOpen(operationName);

      expect(isOpen).toBe(true);
      expect(breaker.state).toBe('open');
    });

    it('should close circuit after 3 successful calls in half-open state', () => {
      const operationName = 'test-recovery';
      const breaker = privateMethods.getCircuitBreaker(operationName);

      // Set to half-open state
      breaker.state = 'half-open';
      breaker.successCount = 0;

      // Record 3 successes
      privateMethods.recordSuccess(operationName);
      expect(breaker.state).toBe('half-open');
      expect(breaker.successCount).toBe(1);

      privateMethods.recordSuccess(operationName);
      expect(breaker.state).toBe('half-open');
      expect(breaker.successCount).toBe(2);

      privateMethods.recordSuccess(operationName);
      expect(breaker.state).toBe('closed');
      expect(breaker.failureCount).toBe(0);
    });

    it('should re-open circuit on failure during half-open state', () => {
      const operationName = 'test-reopen';
      const breaker = privateMethods.getCircuitBreaker(operationName);

      // Set to half-open state with some successes
      breaker.state = 'half-open';
      breaker.successCount = 2;

      // Record failure
      privateMethods.recordFailure(operationName);

      expect(breaker.state).toBe('open');
    });
  });

  describe('recordSuccess', () => {
    it('should reset failure count on success in closed state', () => {
      const operationName = 'test-success-reset';
      const breaker = privateMethods.getCircuitBreaker(operationName);

      breaker.failureCount = 3;
      breaker.state = 'closed';

      privateMethods.recordSuccess(operationName);

      expect(breaker.failureCount).toBe(0);
    });

    it('should clear retry delay on success', () => {
      const operationName = 'test-delay-clear';

      // Set a retry delay
      privateMethods.retryDelays.set(operationName, 5000);

      privateMethods.recordSuccess(operationName);

      expect(privateMethods.retryDelays.has(operationName)).toBe(false);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      const operationName = 'test-failure-count';

      privateMethods.recordFailure(operationName);
      privateMethods.recordFailure(operationName);

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.failureCount).toBe(2);
    });

    it('should update lastFailureTime', () => {
      const operationName = 'test-failure-time';
      const beforeTime = Date.now();

      privateMethods.recordFailure(operationName);

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
      expect(breaker.lastFailureTime).toBeLessThanOrEqual(Date.now());
    });
  });
});

// ============================================================================
// Exponential Backoff Tests
// ============================================================================

describe('LTCGPollingService - Exponential Backoff', () => {
  let service: LTCGPollingService;
  let privateMethods: ReturnType<typeof getPrivateMembers>;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new LTCGPollingService(mockRuntime, { debug: false });
    privateMethods = getPrivateMembers(service);
  });

  afterEach(() => {
    service.stop();
  });

  describe('getRetryDelay', () => {
    it('should return base delay for first retry', () => {
      const operationName = 'test-base-delay';
      const baseDelay = privateMethods.errorRecovery.baseDelayMs;

      const delay = privateMethods.getRetryDelay(operationName);

      expect(delay).toBe(baseDelay);
    });

    it('should double delay with each subsequent call (exponential backoff)', () => {
      const operationName = 'test-exponential';
      const baseDelay = privateMethods.errorRecovery.baseDelayMs;

      // First call returns base delay
      const delay1 = privateMethods.getRetryDelay(operationName);
      expect(delay1).toBe(baseDelay);

      // Second call should return approximately double (with jitter)
      const delay2 = privateMethods.getRetryDelay(operationName);
      // The next delay is stored in the map, so delay2 is the stored value from delay1
      // The formula is: currentDelay * 2 + random(0-500)
      expect(delay2).toBeGreaterThanOrEqual(baseDelay * 2);
      expect(delay2).toBeLessThanOrEqual(baseDelay * 2 + 500);
    });

    it('should cap delay at maxDelayMs', () => {
      const operationName = 'test-max-delay';
      const maxDelay = privateMethods.errorRecovery.maxDelayMs;

      // Set a very high current delay to test cap
      privateMethods.retryDelays.set(operationName, maxDelay * 10);

      const delay = privateMethods.getRetryDelay(operationName);

      // The stored delay should be capped at maxDelay
      const storedDelay = privateMethods.retryDelays.get(operationName);
      expect(storedDelay).toBeLessThanOrEqual(maxDelay);
    });

    it('should add jitter to delay', () => {
      const operationName1 = 'test-jitter-1';
      const operationName2 = 'test-jitter-2';

      // Set same initial delay for both
      privateMethods.retryDelays.set(operationName1, 1000);
      privateMethods.retryDelays.set(operationName2, 1000);

      // Get delays - they should likely differ due to jitter
      privateMethods.getRetryDelay(operationName1);
      privateMethods.getRetryDelay(operationName2);

      const stored1 = privateMethods.retryDelays.get(operationName1);
      const stored2 = privateMethods.retryDelays.get(operationName2);

      // Both should be roughly 2000 + jitter, but likely different
      expect(stored1).toBeGreaterThanOrEqual(2000);
      expect(stored2).toBeGreaterThanOrEqual(2000);
      // Note: There's a small chance they could be equal, but statistically unlikely
    });
  });
});

// ============================================================================
// executeWithRecovery Tests
// ============================================================================

describe('LTCGPollingService - executeWithRecovery', () => {
  let service: LTCGPollingService;
  let privateMethods: ReturnType<typeof getPrivateMembers>;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new LTCGPollingService(mockRuntime, { debug: false });
    privateMethods = getPrivateMembers(service);
  });

  afterEach(() => {
    service.stop();
  });

  describe('successful operations', () => {
    it('should return result on successful operation', async () => {
      const operation = async () => ({ data: 'test-value' });

      const result = await privateMethods.executeWithRecovery('test-success', operation);

      expect(result).toEqual({ data: 'test-value' });
    });

    it('should record success after successful operation', async () => {
      const operationName = 'test-success-record';
      const breaker = privateMethods.getCircuitBreaker(operationName);
      breaker.failureCount = 3; // Simulate previous failures

      await privateMethods.executeWithRecovery(operationName, async () => 'success');

      expect(breaker.failureCount).toBe(0);
    });
  });

  describe('failed operations', () => {
    it('should return null on failed operation', async () => {
      const operation = async () => {
        throw new Error('Test error');
      };

      const result = await privateMethods.executeWithRecovery('test-failure', operation);

      expect(result).toBe(null);
    });

    it('should record failure after failed operation', async () => {
      const operationName = 'test-failure-record';

      await privateMethods.executeWithRecovery(operationName, async () => {
        throw new Error('Test error');
      });

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.failureCount).toBe(1);
    });

    it('should not log operation-specific warnings when silent option is true', async () => {
      // Reset the mock to clear any previous calls
      const warnMock = mock(() => {});
      spyOn(logger, 'warn').mockImplementation(warnMock);

      await privateMethods.executeWithRecovery(
        'test-silent',
        async () => { throw new Error('Test error'); },
        { silent: true }
      );

      // When silent is true, the operation failure warning should not include the specific message
      // Check that the call pattern matches silent behavior (debug instead of warn)
      // The implementation skips the warn call when silent is true
      const calls = warnMock.mock.calls;
      // Filter for calls that would be the "Operation failed" message
      const operationFailedCalls = calls.filter((call: unknown[]) =>
        typeof call[0] === 'object' && 'operationName' in (call[0] as object) && call[0] !== null
      );
      expect(operationFailedCalls.length).toBe(0);
    });
  });

  describe('circuit breaker integration', () => {
    it('should skip operation when circuit is open', async () => {
      const operationName = 'test-open-circuit';
      const breaker = privateMethods.getCircuitBreaker(operationName);
      breaker.state = 'open';
      breaker.lastFailureTime = Date.now();

      const operationMock = mock(() => Promise.resolve('should-not-run'));

      const result = await privateMethods.executeWithRecovery(operationName, operationMock);

      expect(result).toBe(null);
      expect(operationMock).not.toHaveBeenCalled();
    });

    it('should execute operation when circuit is closed', async () => {
      const operationName = 'test-closed-circuit';
      const breaker = privateMethods.getCircuitBreaker(operationName);
      breaker.state = 'closed';

      const operationMock = mock(() => Promise.resolve('executed'));

      const result = await privateMethods.executeWithRecovery(operationName, operationMock);

      expect(result).toBe('executed');
      expect(operationMock).toHaveBeenCalled();
    });

    it('should execute operation when circuit transitions to half-open', async () => {
      const operationName = 'test-halfopen-circuit';
      const breaker = privateMethods.getCircuitBreaker(operationName);
      breaker.state = 'open';
      // Set failure time in the past to trigger half-open
      breaker.lastFailureTime = Date.now() - privateMethods.errorRecovery.circuitBreakerResetMs - 1000;

      const operationMock = mock(() => Promise.resolve('executed-in-halfopen'));

      const result = await privateMethods.executeWithRecovery(operationName, operationMock);

      expect(result).toBe('executed-in-halfopen');
      expect(operationMock).toHaveBeenCalled();
      expect(breaker.state).toBe('half-open');
    });
  });
});

// ============================================================================
// getHealthStatus Tests
// ============================================================================

describe('LTCGPollingService - getHealthStatus', () => {
  let service: LTCGPollingService;
  let privateMethods: ReturnType<typeof getPrivateMembers>;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new LTCGPollingService(mockRuntime, { debug: false });
    privateMethods = getPrivateMembers(service);
  });

  afterEach(() => {
    service.stop();
  });

  it('should return healthy status when no circuits are open', () => {
    const status = service.getHealthStatus();

    expect(status.isHealthy).toBe(true);
    expect(status.isPolling).toBe(false);
    expect(status.currentGameId).toBe(null);
    expect(Object.keys(status.circuitBreakers).length).toBe(0);
  });

  it('should return unhealthy status when a circuit is open', () => {
    const breaker = privateMethods.getCircuitBreaker('unhealthy-operation');
    breaker.state = 'open';
    breaker.failureCount = 5;

    const status = service.getHealthStatus();

    expect(status.isHealthy).toBe(false);
    expect(status.circuitBreakers['unhealthy-operation']).toEqual({
      state: 'open',
      failureCount: 5,
    });
  });

  it('should report multiple circuit breaker states', () => {
    const breaker1 = privateMethods.getCircuitBreaker('op1');
    breaker1.state = 'closed';
    breaker1.failureCount = 1;

    const breaker2 = privateMethods.getCircuitBreaker('op2');
    breaker2.state = 'open';
    breaker2.failureCount = 5;

    const breaker3 = privateMethods.getCircuitBreaker('op3');
    breaker3.state = 'half-open';
    breaker3.failureCount = 3;

    const status = service.getHealthStatus();

    expect(status.isHealthy).toBe(false); // Because op2 is open
    expect(status.circuitBreakers['op1']).toEqual({ state: 'closed', failureCount: 1 });
    expect(status.circuitBreakers['op2']).toEqual({ state: 'open', failureCount: 5 });
    expect(status.circuitBreakers['op3']).toEqual({ state: 'half-open', failureCount: 3 });
  });

  it('should return healthy when circuits are in half-open state', () => {
    const breaker = privateMethods.getCircuitBreaker('half-open-op');
    breaker.state = 'half-open';
    breaker.failureCount = 3;

    const status = service.getHealthStatus();

    expect(status.isHealthy).toBe(true);
  });
});

// ============================================================================
// Public API Tests
// ============================================================================

describe('LTCGPollingService - Public API', () => {
  let service: LTCGPollingService;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });

  afterEach(() => {
    if (service) {
      service.stop();
    }
  });

  describe('constructor and configuration', () => {
    it('should use default config values when not provided', () => {
      service = new LTCGPollingService(mockRuntime);

      expect(service.isActive()).toBe(false);
      expect(service.getCurrentGameId()).toBe(null);
    });

    it('should respect provided config values', () => {
      const config: PollingConfig = {
        intervalMs: 2000,
        discoveryIntervalMs: 10000,
        matchmakingIntervalMs: 20000,
        autoMatchmaking: true,
        debug: true,
      };

      service = new LTCGPollingService(mockRuntime, config);

      expect(service.isMatchmakingEnabled()).toBe(true);
    });
  });

  describe('isActive', () => {
    it('should return false when not polling', () => {
      service = new LTCGPollingService(mockRuntime);

      expect(service.isActive()).toBe(false);
    });
  });

  describe('getCurrentGameId', () => {
    it('should return null when no game is being polled', () => {
      service = new LTCGPollingService(mockRuntime);

      expect(service.getCurrentGameId()).toBe(null);
    });
  });

  describe('isMatchmakingEnabled', () => {
    it('should return false when autoMatchmaking is not enabled', () => {
      service = new LTCGPollingService(mockRuntime, { autoMatchmaking: false });

      expect(service.isMatchmakingEnabled()).toBe(false);
    });

    it('should return true when autoMatchmaking is enabled', () => {
      service = new LTCGPollingService(mockRuntime, { autoMatchmaking: true });

      expect(service.isMatchmakingEnabled()).toBe(true);
    });
  });

  describe('getClient', () => {
    it('should return null when client is not initialized', () => {
      service = new LTCGPollingService(mockRuntime);

      expect(service.getClient()).toBe(null);
    });
  });

  describe('getMatchmakingStatus', () => {
    it('should return idle status when not in game and matchmaking disabled', () => {
      service = new LTCGPollingService(mockRuntime, { autoMatchmaking: false });

      const status = service.getMatchmakingStatus();

      expect(status.enabled).toBe(false);
      expect(status.status).toBe('idle');
      expect(status.stats.lobbiesJoined).toBe(0);
      expect(status.stats.gamesStarted).toBe(0);
    });

    it('should return scanning status when matchmaking is enabled', () => {
      service = new LTCGPollingService(mockRuntime, { autoMatchmaking: true });

      const status = service.getMatchmakingStatus();

      expect(status.enabled).toBe(true);
      expect(status.status).toBe('scanning');
    });
  });

  describe('stop', () => {
    it('should stop all intervals and reset state', async () => {
      service = new LTCGPollingService(mockRuntime);

      await service.stop();

      expect(service.isActive()).toBe(false);
      expect(service.getCurrentGameId()).toBe(null);
      expect(service.getClient()).toBe(null);
    });
  });

  describe('stopPolling', () => {
    it('should stop polling and reset state', () => {
      service = new LTCGPollingService(mockRuntime);

      service.stopPolling();

      expect(service.isActive()).toBe(false);
      expect(service.getCurrentGameId()).toBe(null);
    });
  });
});

// ============================================================================
// Edge Cases and Integration Tests
// ============================================================================

describe('LTCGPollingService - Edge Cases', () => {
  let service: LTCGPollingService;
  let privateMethods: ReturnType<typeof getPrivateMembers>;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new LTCGPollingService(mockRuntime, { debug: false });
    privateMethods = getPrivateMembers(service);
  });

  afterEach(() => {
    service.stop();
  });

  describe('rapid failure/success sequences', () => {
    it('should handle rapid failures correctly', () => {
      const operationName = 'rapid-failures';
      const threshold = privateMethods.errorRecovery.circuitBreakerThreshold;

      // Rapid failures
      for (let i = 0; i < threshold * 2; i++) {
        privateMethods.recordFailure(operationName);
      }

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.state).toBe('open');
      expect(breaker.failureCount).toBe(threshold * 2);
    });

    it('should handle interleaved success and failure', () => {
      const operationName = 'interleaved';

      privateMethods.recordFailure(operationName);
      privateMethods.recordFailure(operationName);
      privateMethods.recordSuccess(operationName); // Should reset failure count
      privateMethods.recordFailure(operationName);

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.failureCount).toBe(1);
      expect(breaker.state).toBe('closed');
    });
  });

  describe('multiple operations isolation', () => {
    it('should isolate circuit breakers between different operations', async () => {
      // Fail operation A
      const threshold = privateMethods.errorRecovery.circuitBreakerThreshold;
      for (let i = 0; i < threshold; i++) {
        privateMethods.recordFailure('operation-a');
      }

      // Operation B should still work
      const resultB = await privateMethods.executeWithRecovery('operation-b', async () => 'success');

      const breakerA = privateMethods.getCircuitBreaker('operation-a');
      const breakerB = privateMethods.getCircuitBreaker('operation-b');

      expect(breakerA.state).toBe('open');
      expect(breakerB.state).toBe('closed');
      expect(resultB).toBe('success');
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent successful operations', async () => {
      const operationName = 'concurrent-success';
      const operations = Array.from({ length: 5 }, () =>
        privateMethods.executeWithRecovery(operationName, async () => 'result')
      );

      const results = await Promise.all(operations);

      results.forEach((result) => {
        expect(result).toBe('result');
      });

      const breaker = privateMethods.getCircuitBreaker(operationName);
      expect(breaker.state).toBe('closed');
    });
  });
});
