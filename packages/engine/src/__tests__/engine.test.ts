import { describe, it, expect } from "vitest";
import { createEngine } from "../engine.js";
import { defineCards } from "../cards.js";
import type { CardDefinition } from "../types/index.js";

const sampleCards: CardDefinition[] = [
  {
    id: "warrior-1",
    name: "Test Warrior",
    type: "stereotype",
    description: "A test warrior",
    rarity: "common",
    attack: 1500,
    defense: 1200,
    level: 4,
    attribute: "fire",
  },
  {
    id: "spell-1",
    name: "Test Spell",
    type: "spell",
    description: "A test spell",
    rarity: "common",
    spellType: "normal",
  },
];

const cardLookup = defineCards(sampleCards);

function createTestDeck(count: number): string[] {
  return Array(count)
    .fill(null)
    .map((_, i) => (i % 2 === 0 ? "warrior-1" : "spell-1"));
}

describe("createEngine", () => {
  it("creates an engine with initial state", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    const state = engine.getState();
    expect(state.hostId).toBe("player1");
    expect(state.awayId).toBe("player2");
    expect(state.hostLifePoints).toBe(8000);
    expect(state.awayLifePoints).toBe(8000);
    expect(state.hostHand).toHaveLength(5);
    expect(state.awayHand).toHaveLength(5);
    expect(state.hostDeck).toHaveLength(35);
    expect(state.awayDeck).toHaveLength(35);
    expect(state.currentPhase).toBe("draw");
    expect(state.turnNumber).toBe(1);
    expect(state.currentTurnPlayer).toBe("host");
    expect(state.gameOver).toBe(false);
  });

  it("respects custom first player", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
      firstPlayer: "away",
    });

    const state = engine.getState();
    expect(state.currentTurnPlayer).toBe("away");
  });

  it("respects custom config", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
      config: {
        startingLP: 10000,
        startingHandSize: 6,
      },
    });

    const state = engine.getState();
    expect(state.hostLifePoints).toBe(10000);
    expect(state.awayLifePoints).toBe(10000);
    expect(state.hostHand).toHaveLength(6);
    expect(state.awayHand).toHaveLength(6);
  });
});

describe("mask", () => {
  it("hides opponent hand contents", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    const hostView = engine.mask("host");
    expect(hostView.hand).toHaveLength(5);
    expect(hostView.opponentHandCount).toBe(5);
    expect(hostView.hand[0]).toBeTruthy(); // Can see own hand
  });

  it("shows life points for both players", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    const hostView = engine.mask("host");
    expect(hostView.lifePoints).toBe(8000);
    expect(hostView.opponentLifePoints).toBe(8000);
  });

  it("shows correct seat information", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    const hostView = engine.mask("host");
    expect(hostView.mySeat).toBe("host");
    expect(hostView.currentTurnPlayer).toBe("host");

    const awayView = engine.mask("away");
    expect(awayView.mySeat).toBe("away");
    expect(awayView.currentTurnPlayer).toBe("host");
  });

  it("masks opponent face-down cards", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    // Manually add a face-down card to opponent board for testing
    const state = engine.getState();
    state.awayBoard.push({
      cardId: "card-123",
      definitionId: "warrior-1",
      position: "defense",
      faceDown: true,
      canAttack: false,
      hasAttackedThisTurn: false,
      changedPositionThisTurn: false,
      viceCounters: 0,
      temporaryBoosts: { attack: 0, defense: 0 },
      equippedCards: [],
      turnSummoned: 1,
    });

    const hostView = engine.mask("host");
    expect(hostView.opponentBoard[0].definitionId).toBe("hidden");
    expect(hostView.opponentBoard[0].faceDown).toBe(true);
  });
});

describe("legalMoves", () => {
  it("returns moves for current turn player", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    const moves = engine.legalMoves("host");
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.some((m) => m.type === "ADVANCE_PHASE")).toBe(true);
    expect(moves.some((m) => m.type === "END_TURN")).toBe(true);
    expect(moves.some((m) => m.type === "SURRENDER")).toBe(true);
  });

  it("returns empty for non-current player", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    const moves = engine.legalMoves("away");
    expect(moves).toEqual([]);
  });

  it("returns empty when game is over", () => {
    const engine = createEngine({
      cardLookup,
      hostId: "player1",
      awayId: "player2",
      hostDeck: createTestDeck(40),
      awayDeck: createTestDeck(40),
    });

    // Manually set game over
    const state = engine.getState();
    state.gameOver = true;

    const moves = engine.legalMoves("host");
    expect(moves).toEqual([]);
  });
});
