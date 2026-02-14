/**
 * Advanced Actions Tests
 *
 * Tests for trap activation, chain response, and flip summon actions.
 * Uses real LTCG card names and correct API schema.
 */

import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { activateTrapAction } from "../src/actions/activateTrapAction";
import { chainResponseAction } from "../src/actions/chainResponseAction";
import { flipSummonAction } from "../src/actions/flipSummonAction";
import { gameStateProvider } from "../src/providers/gameStateProvider";
import { handProvider } from "../src/providers/handProvider";
import type { GameStateResponse } from "../src/types/api";

describe("Advanced Actions", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        return null;
      }),
      getService: mock(),
    } as IAgentRuntime;

    mockMessage = {
      id: "test-message-id",
      visibleTo: [],
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "Test action",
        source: "test",
        gameId: "test-game-123",
      },
    } as Memory;

    mockState = {
      values: {},
      data: {},
      text: "",
    };
  });

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
      // Mock game state with no traps
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [],
          spellTrapZone: [], // No traps
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
      };

      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      const result = await activateTrapAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);

      spy.mockRestore();
    });

    it("should validate true when traps are set", async () => {
      // Mock game state with set trap
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [],
          spellTrapZone: [
            {
              boardIndex: 0,
              cardId: "trap-1",
              name: "Ring of Fire",
              faceUp: false,
              type: "trap",
            },
          ],
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
      };

      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      const result = await activateTrapAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);

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

    it("should validate false when no chainable cards available", async () => {
      // Mock game state with no quick-play spells or traps
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: false,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [],
          spellTrapZone: [], // No traps
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
      };

      const gameStateSpy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      // Mock hand provider with empty hand
      const handSpy = spyOn(handProvider, "get").mockResolvedValue({
        data: { hand: [] },
        text: "",
        values: {},
      });

      const result = await chainResponseAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);

      gameStateSpy.mockRestore();
      handSpy.mockRestore();
    });

    it("should validate true when chainable cards available", async () => {
      // Mock game state with set trap
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: false,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [],
          spellTrapZone: [
            {
              boardIndex: 0,
              cardId: "trap-1",
              name: "Ring of Fire",
              faceUp: false,
              type: "trap",
            },
          ],
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
      };

      const gameStateSpy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      // Mock hand provider with no spells
      const handSpy = spyOn(handProvider, "get").mockResolvedValue({
        data: { hand: [] },
        text: "",
        values: {},
      });

      const result = await chainResponseAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);

      gameStateSpy.mockRestore();
      handSpy.mockRestore();
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
      // Mock game state in battle phase
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "combat", // Not main phase
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "monster-1",
              name: "Flame Whelp",
              position: "facedown",
              atk: 600,
              def: 400,
              level: 1,
              canAttack: false,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
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
      };

      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      const result = await flipSummonAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);

      spy.mockRestore();
    });

    it("should validate false when no face-down monsters", async () => {
      // Mock game state with only face-up monsters
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [
          {
            _id: "card-1",
            name: "Infernal God Dragon",
            cardType: "stereotype",
            attack: 4000,
            defense: 3500,
            currentAttack: 4000,
            currentDefense: 3500,
            position: 1, // Attack position
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: true,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "monster-1",
              name: "Infernal God Dragon",
              position: "attack", // Face-up attack position
              atk: 4000,
              def: 3500,
              level: 10,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
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
      };

      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      const result = await flipSummonAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);

      spy.mockRestore();
    });

    it("should validate true when face-down monster available", async () => {
      // Mock game state with face-down monster
      const mockGameState: GameStateResponse = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 4000,
        opponentLifePoints: 4000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [
          {
            _id: "card-1",
            name: "Flame Whelp",
            cardType: "stereotype",
            attack: 600,
            defense: 400,
            currentAttack: 600,
            currentDefense: 400,
            position: 0, // Defense position
            hasAttacked: false,
            isFaceDown: true,
          },
        ],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
        hostPlayer: {
          playerId: "player-1",
          lifePoints: 4000,
          deckCount: 35,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "monster-1",
              name: "Flame Whelp",
              position: "facedown", // Face-down position
              atk: 600,
              def: 400,
              level: 1,
              canAttack: false,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
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
      };

      const spy = spyOn(gameStateProvider, "get").mockResolvedValue({
        data: { gameState: mockGameState },
        text: "",
        values: {},
      });

      const result = await flipSummonAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);

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
