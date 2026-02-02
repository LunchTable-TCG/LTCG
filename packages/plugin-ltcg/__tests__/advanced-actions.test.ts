/**
 * Advanced Actions Tests
 *
 * Tests for trap activation, chain response, and flip summon actions.
 */

import { describe, expect, it, spyOn } from "bun:test";
import { activateTrapAction } from "../actions/activateTrapAction";
import { chainResponseAction } from "../actions/chainResponseAction";
import { flipSummonAction } from "../actions/flipSummonAction";
import { gameStateProvider } from "../providers/gameStateProvider";
import type { GameStateResponse } from "../types/api";
import { createMockMessage, createMockRuntime, createMockState } from "./utils/core-test-utils";

// Mock game state data
const createMockGameState = (overrides?: Partial<GameStateResponse>): GameStateResponse => ({
  gameId: "test-game-123",
  status: "active",
  currentTurn: "host",
  phase: "main1",
  turnNumber: 3,
  hostPlayer: {
    playerId: "player-1",
    lifePoints: 4000,
    deckCount: 35,
    monsterZone: [],
    spellTrapZone: [],
    graveyard: [],
    banished: [],
    extraDeck: 0,
  },
  opponentPlayer: {
    playerId: "player-2",
    lifePoints: 4000,
    deckCount: 35,
    monsterZone: [],
    spellTrapZone: [],
    graveyard: [],
    banished: [],
    extraDeck: 0,
  },
  hand: [],
  hasNormalSummoned: false,
  canChangePosition: [],
  ...overrides,
});

describe("Advanced Actions", () => {
  describe("Activate Trap Action", () => {
    it("should have correct structure", () => {
      expect(activateTrapAction).toBeDefined();
      expect(activateTrapAction.name).toBe("ACTIVATE_TRAP");
      expect(activateTrapAction.similes).toContain("TRIGGER_TRAP");
      expect(activateTrapAction.similes).toContain("USE_TRAP");
      expect(activateTrapAction.similes).toContain("SPRING_TRAP");
      expect(activateTrapAction.description).toContain("trap");
      expect(typeof activateTrapAction.validate).toBe("function");
      expect(typeof activateTrapAction.handler).toBe("function");
      expect(Array.isArray(activateTrapAction.examples)).toBe(true);
    });

    it("should validate false when no traps are set", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Activate trap!");
      const state = createMockState();

      // Mock provider to return game state with no traps
      const gameState = createMockGameState({
        hostPlayer: {
          ...createMockGameState().hostPlayer,
          spellTrapZone: [],
        },
      });

      // Mock game state provider
      const originalGet = runtime.getService;
      runtime.getService = () => ({
        get: async () => ({
          data: { gameState },
        }),
      });

      const result = await activateTrapAction.validate(runtime, message, state);
      expect(result).toBe(false);

      runtime.getService = originalGet;
    });

    it("should validate true when traps are set", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Activate trap!");
      const state = createMockState();

      // Mock game state with set traps
      const gameState = createMockGameState({
        hostPlayer: {
          ...createMockGameState().hostPlayer,
          spellTrapZone: [
            {
              boardIndex: 0,
              cardId: "trap-1",
              name: "Mirror Force",
              faceUp: false,
              type: "trap",
            },
          ],
        },
      });

      // Spy on the provider's get method
      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState },
        text: "Mock game state",
        values: {},
      });

      const result = await activateTrapAction.validate(runtime, message, state);
      expect(result).toBe(true);

      // Restore original
      spy.mockRestore();
    });

    it("should have meaningful examples", () => {
      expect(activateTrapAction.examples).toBeDefined();
      expect(activateTrapAction.examples.length).toBeGreaterThan(0);

      const firstExample = activateTrapAction.examples[0];
      expect(firstExample.length).toBeGreaterThan(1);
      expect(firstExample[0].content.text).toBeTruthy();
      expect(firstExample[1].content.actions).toContain("ACTIVATE_TRAP");
    });
  });

  describe("Chain Response Action", () => {
    it("should have correct structure", () => {
      expect(chainResponseAction).toBeDefined();
      expect(chainResponseAction.name).toBe("CHAIN_RESPONSE");
      expect(chainResponseAction.similes).toContain("RESPOND_TO_CHAIN");
      expect(chainResponseAction.similes).toContain("CHAIN");
      expect(chainResponseAction.similes).toContain("COUNTER");
      expect(chainResponseAction.description).toContain("chain");
      expect(typeof chainResponseAction.validate).toBe("function");
      expect(typeof chainResponseAction.handler).toBe("function");
      expect(Array.isArray(chainResponseAction.examples)).toBe(true);
    });

    it("should validate false when not in chain window", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Chain response!");
      const state = createMockState();

      // Mock game state with no chain window open
      const gameState = createMockGameState({
        phase: "main1", // Normal phase, not chain window
      });

      const originalGet = runtime.getService;
      runtime.getService = () => ({
        get: async () => ({
          data: { gameState },
        }),
      });

      const result = await chainResponseAction.validate(runtime, message, state);
      expect(result).toBe(false);

      runtime.getService = originalGet;
    });

    it("should validate false when no chainable cards available", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Chain response!");
      const state = createMockState();

      // Mock game state with chain window but no quick-play/traps
      const gameState = createMockGameState({
        phase: "main1",
        hostPlayer: {
          ...createMockGameState().hostPlayer,
          spellTrapZone: [],
        },
        hand: [],
      });

      const originalGet = runtime.getService;
      runtime.getService = () => ({
        get: async () => ({
          data: { gameState, hand: [] },
        }),
      });

      const result = await chainResponseAction.validate(runtime, message, state);
      expect(result).toBe(false);

      runtime.getService = originalGet;
    });

    it("should have meaningful examples", () => {
      expect(chainResponseAction.examples).toBeDefined();
      expect(chainResponseAction.examples.length).toBeGreaterThan(0);

      const firstExample = chainResponseAction.examples[0];
      expect(firstExample.length).toBeGreaterThan(1);
      expect(firstExample[0].content.text).toBeTruthy();
      expect(firstExample[1].content.actions).toContain("CHAIN_RESPONSE");
    });
  });

  describe("Flip Summon Action", () => {
    it("should have correct structure", () => {
      expect(flipSummonAction).toBeDefined();
      expect(flipSummonAction.name).toBe("FLIP_SUMMON");
      expect(flipSummonAction.similes).toContain("FLIP");
      expect(flipSummonAction.similes).toContain("FLIP_UP");
      expect(flipSummonAction.similes).toContain("REVEAL_MONSTER");
      expect(flipSummonAction.description.toLowerCase()).toContain("flip");
      expect(typeof flipSummonAction.validate).toBe("function");
      expect(typeof flipSummonAction.handler).toBe("function");
      expect(Array.isArray(flipSummonAction.examples)).toBe(true);
    });

    it("should validate false when not in Main Phase", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Flip summon!");
      const state = createMockState();

      // Mock game state in wrong phase
      const gameState = createMockGameState({
        phase: "battle", // Not main phase
      });

      const originalGet = runtime.getService;
      runtime.getService = () => ({
        get: async () => ({
          data: { gameState },
        }),
      });

      const result = await flipSummonAction.validate(runtime, message, state);
      expect(result).toBe(false);

      runtime.getService = originalGet;
    });

    it("should validate false when no face-down monsters", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Flip summon!");
      const state = createMockState();

      // Mock game state with no face-down monsters
      const gameState = createMockGameState({
        phase: "main1",
        hostPlayer: {
          ...createMockGameState().hostPlayer,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "monster-1",
              name: "Blue-Eyes White Dragon",
              position: "attack",
              atk: 3000,
              def: 2500,
              level: 8,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
        },
      });

      const originalGet = runtime.getService;
      runtime.getService = () => ({
        get: async () => ({
          data: { gameState },
        }),
      });

      const result = await flipSummonAction.validate(runtime, message, state);
      expect(result).toBe(false);

      runtime.getService = originalGet;
    });

    it("should validate true when face-down monster available", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("Flip summon!");
      const state = createMockState();

      // Mock game state with face-down monster
      const gameState = createMockGameState({
        phase: "main1",
        hostPlayer: {
          ...createMockGameState().hostPlayer,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "monster-1",
              name: "Man-Eater Bug",
              position: "facedown",
              atk: 450,
              def: 600,
              level: 2,
              canAttack: false,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
        },
      });

      // Spy on the provider's get method
      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState },
        text: "Mock game state",
        values: {},
      });

      const result = await flipSummonAction.validate(runtime, message, state);
      expect(result).toBe(true);

      // Restore original
      spy.mockRestore();
    });

    it("should have meaningful examples", () => {
      expect(flipSummonAction.examples).toBeDefined();
      expect(flipSummonAction.examples.length).toBeGreaterThan(0);

      const firstExample = flipSummonAction.examples[0];
      expect(firstExample.length).toBeGreaterThan(1);
      expect(firstExample[0].content.text).toBeTruthy();
      expect(firstExample[1].content.actions).toContain("FLIP_SUMMON");
    });
  });
});
