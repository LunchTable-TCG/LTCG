/**
 * Continuous Effects Test Suite
 *
 * Tests for JSON condition evaluation and continuous effect calculations.
 */

import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  _matchesCondition,
  _matchesLegacyCondition,
  evaluateAttribute,
  evaluateCardType,
  evaluateFieldCount,
  evaluateGraveyardContains,
  evaluateJsonCondition,
} from "./continuousEffects";
import type {
  CardOnBoard,
  ConditionContext,
  FieldCountCondition,
  GraveyardCondition,
  JsonCondition,
} from "./jsonEffectSchema";
import { convertLegacyCondition } from "./jsonEffectSchema";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Create a mock game state for testing */
function createMockGameState(overrides: Partial<Doc<"gameStates">> = {}): Doc<"gameStates"> {
  return {
    _id: "gameState123" as Id<"gameStates">,
    _creationTime: Date.now(),
    lobbyId: "lobby123" as Id<"gameLobbies">,
    gameId: "game123",
    hostId: "host123" as Id<"users">,
    opponentId: "opponent123" as Id<"users">,
    hostHand: [],
    opponentHand: [],
    hostBoard: [],
    opponentBoard: [],
    hostSpellTrapZone: [],
    opponentSpellTrapZone: [],
    hostDeck: [],
    opponentDeck: [],
    hostGraveyard: [],
    opponentGraveyard: [],
    hostBanished: [],
    opponentBanished: [],
    hostLifePoints: 8000,
    opponentLifePoints: 8000,
    hostMana: 0,
    opponentMana: 0,
    currentTurnPlayerId: "host123" as Id<"users">,
    turnNumber: 1,
    lastMoveAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  } as Doc<"gameStates">;
}

/** Create a mock card definition */
function createMockCardDef(
  overrides: Partial<Doc<"cardDefinitions">> = {}
): Doc<"cardDefinitions"> {
  return {
    _id: "card123" as Id<"cardDefinitions">,
    _creationTime: Date.now(),
    name: "Test Monster",
    rarity: "common",
    archetype: "infernal_dragons",
    cardType: "creature",
    attack: 1500,
    defense: 1200,
    cost: 4,
    isActive: true,
    createdAt: Date.now(),
    ...overrides,
  } as Doc<"cardDefinitions">;
}

/** Create a mock card on board */
function createMockCardOnBoard(overrides: Partial<CardOnBoard> = {}): CardOnBoard {
  return {
    cardId: "card123" as Id<"cardDefinitions">,
    position: 1, // Attack position
    attack: 1500,
    defense: 1200,
    hasAttacked: false,
    isFaceDown: false,
    ...overrides,
  };
}

/** Create a condition context for testing */
function createMockContext(overrides: Partial<ConditionContext> = {}): ConditionContext {
  return {
    gameState: createMockGameState(),
    sourceCard: createMockCardOnBoard(),
    playerIs: "host",
    ...overrides,
  };
}

// ============================================================================
// JSON CONDITION EVALUATION TESTS
// ============================================================================

describe("evaluateJsonCondition", () => {
  describe("basic conditions", () => {
    it("should return true for empty condition", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef(),
      });

      expect(evaluateJsonCondition({}, context)).toBe(true);
    });

    it("should match archetype condition", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({ archetype: "infernal_dragons" }),
      });

      expect(evaluateJsonCondition({ archetype: "infernal_dragons" }, context)).toBe(true);
      expect(evaluateJsonCondition({ archetype: "abyssal" }, context)).toBe(false);
    });

    it("should match archetype by name", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          name: "Dragon Knight",
          archetype: "neutral",
        }),
      });

      expect(evaluateJsonCondition({ archetype: "dragon" }, context)).toBe(true);
    });

    it("should match card type condition", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({ cardType: "creature" }),
      });

      expect(evaluateJsonCondition({ cardType: "creature" }, context)).toBe(true);
      expect(evaluateJsonCondition({ cardType: "spell" }, context)).toBe(false);
    });

    it("should match level condition (exact)", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({ cost: 4, cardType: "creature" }),
      });

      expect(evaluateJsonCondition({ level: 4 }, context)).toBe(true);
      expect(evaluateJsonCondition({ level: 5 }, context)).toBe(false);
    });

    it("should match level condition (range)", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({ cost: 4, cardType: "creature" }),
      });

      expect(evaluateJsonCondition({ level: { max: 4 } }, context)).toBe(true);
      expect(evaluateJsonCondition({ level: { max: 3 } }, context)).toBe(false);
      expect(evaluateJsonCondition({ level: { min: 4 } }, context)).toBe(true);
      expect(evaluateJsonCondition({ level: { min: 5 } }, context)).toBe(false);
      expect(evaluateJsonCondition({ level: { min: 3, max: 5 } }, context)).toBe(true);
    });

    it("should match attack condition (exact)", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          attack: 1500,
          cardType: "creature",
        }),
      });

      expect(evaluateJsonCondition({ attack: 1500 }, context)).toBe(true);
      expect(evaluateJsonCondition({ attack: 1600 }, context)).toBe(false);
    });

    it("should match attack condition (range)", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          attack: 1500,
          cardType: "creature",
        }),
      });

      expect(evaluateJsonCondition({ attack: { max: 1500 } }, context)).toBe(true);
      expect(evaluateJsonCondition({ attack: { max: 1400 } }, context)).toBe(false);
      expect(evaluateJsonCondition({ attack: { min: 1000 } }, context)).toBe(true);
    });

    it("should match defense condition", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          defense: 2000,
          cardType: "creature",
        }),
      });

      expect(evaluateJsonCondition({ defense: { min: 1500 } }, context)).toBe(true);
      expect(evaluateJsonCondition({ defense: { min: 2500 } }, context)).toBe(false);
    });

    it("should match name conditions", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({ name: "Blue-Eyes White Dragon" }),
      });

      expect(evaluateJsonCondition({ nameContains: "White Dragon" }, context)).toBe(true);
      expect(evaluateJsonCondition({ nameContains: "Red" }, context)).toBe(false);
      expect(evaluateJsonCondition({ nameEquals: "Blue-Eyes White Dragon" }, context)).toBe(true);
      expect(evaluateJsonCondition({ nameEquals: "Blue-Eyes" }, context)).toBe(false);
    });
  });

  describe("board state conditions", () => {
    it("should match position condition", () => {
      const attackContext = createMockContext({
        targetCard: createMockCardOnBoard({ position: 1 }),
        targetCardDef: createMockCardDef(),
      });

      const defenseContext = createMockContext({
        targetCard: createMockCardOnBoard({ position: -1 }),
        targetCardDef: createMockCardDef(),
      });

      expect(evaluateJsonCondition({ position: "attack" }, attackContext)).toBe(true);
      expect(evaluateJsonCondition({ position: "defense" }, attackContext)).toBe(false);
      expect(evaluateJsonCondition({ position: "defense" }, defenseContext)).toBe(true);
    });

    it("should match face-down condition", () => {
      const faceUpContext = createMockContext({
        targetCard: createMockCardOnBoard({ isFaceDown: false }),
        targetCardDef: createMockCardDef(),
      });

      const faceDownContext = createMockContext({
        targetCard: createMockCardOnBoard({ isFaceDown: true }),
        targetCardDef: createMockCardDef(),
      });

      expect(evaluateJsonCondition({ isFaceDown: false }, faceUpContext)).toBe(true);
      expect(evaluateJsonCondition({ isFaceDown: true }, faceDownContext)).toBe(true);
    });

    it("should match hasAttacked condition", () => {
      const attackedContext = createMockContext({
        targetCard: createMockCardOnBoard({ hasAttacked: true }),
        targetCardDef: createMockCardDef(),
      });

      expect(evaluateJsonCondition({ hasAttacked: true }, attackedContext)).toBe(true);
      expect(evaluateJsonCondition({ hasAttacked: false }, attackedContext)).toBe(false);
    });

    it("should match protection conditions", () => {
      const protectedContext = createMockContext({
        targetCard: createMockCardOnBoard({
          cannotBeTargeted: true,
          cannotBeDestroyedByBattle: true,
          cannotBeDestroyedByEffects: false,
        }),
        targetCardDef: createMockCardDef(),
      });

      expect(evaluateJsonCondition({ canBeTargeted: false }, protectedContext)).toBe(true);
      expect(evaluateJsonCondition({ canBeDestroyedByBattle: false }, protectedContext)).toBe(true);
      expect(evaluateJsonCondition({ canBeDestroyedByEffects: true }, protectedContext)).toBe(true);
    });
  });

  describe("player state conditions", () => {
    it("should match LP below condition", () => {
      const lowLPContext = createMockContext({
        gameState: createMockGameState({ hostLifePoints: 2000 }),
        playerIs: "host",
      });

      expect(evaluateJsonCondition({ lpBelow: 3000 }, lowLPContext)).toBe(true);
      expect(evaluateJsonCondition({ lpBelow: 1000 }, lowLPContext)).toBe(false);
    });

    it("should match LP above condition", () => {
      const highLPContext = createMockContext({
        gameState: createMockGameState({ hostLifePoints: 8000 }),
        playerIs: "host",
      });

      expect(evaluateJsonCondition({ lpAbove: 5000 }, highLPContext)).toBe(true);
      expect(evaluateJsonCondition({ lpAbove: 9000 }, highLPContext)).toBe(false);
    });

    it("should match LP equal condition", () => {
      const context = createMockContext({
        gameState: createMockGameState({ hostLifePoints: 4000 }),
        playerIs: "host",
      });

      expect(evaluateJsonCondition({ lpEqual: 4000 }, context)).toBe(true);
      expect(evaluateJsonCondition({ lpEqual: 5000 }, context)).toBe(false);
    });
  });

  describe("game state conditions", () => {
    it("should match turn number condition", () => {
      const context = createMockContext({
        gameState: createMockGameState({ turnNumber: 5 }),
      });

      expect(evaluateJsonCondition({ turnNumber: 5 }, context)).toBe(true);
      expect(evaluateJsonCondition({ turnNumber: { min: 3 } }, context)).toBe(true);
      expect(evaluateJsonCondition({ turnNumber: { min: 10 } }, context)).toBe(false);
    });

    it("should match phase condition", () => {
      const context = createMockContext({
        gameState: createMockGameState({ currentPhase: "main1" }),
      });

      expect(evaluateJsonCondition({ phase: "main1" }, context)).toBe(true);
      expect(evaluateJsonCondition({ phase: "battle" }, context)).toBe(false);
    });
  });

  describe("compound conditions", () => {
    it("should evaluate AND conditions", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          archetype: "infernal_dragons",
          cost: 4,
          cardType: "creature",
        }),
      });

      const andCondition: JsonCondition = {
        type: "and",
        conditions: [{ archetype: "infernal_dragons" }, { level: { max: 4 } }],
      };

      expect(evaluateJsonCondition(andCondition, context)).toBe(true);

      const failingAndCondition: JsonCondition = {
        type: "and",
        conditions: [{ archetype: "infernal_dragons" }, { level: { min: 5 } }],
      };

      expect(evaluateJsonCondition(failingAndCondition, context)).toBe(false);
    });

    it("should evaluate OR conditions", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          archetype: "infernal_dragons",
          cost: 4,
          cardType: "creature",
        }),
      });

      const orCondition: JsonCondition = {
        type: "or",
        conditions: [{ archetype: "abyssal" }, { level: 4 }],
      };

      expect(evaluateJsonCondition(orCondition, context)).toBe(true);

      const failingOrCondition: JsonCondition = {
        type: "or",
        conditions: [{ archetype: "abyssal" }, { level: 5 }],
      };

      expect(evaluateJsonCondition(failingOrCondition, context)).toBe(false);
    });

    it("should evaluate NOT conditions", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          archetype: "infernal_dragons",
          cardType: "creature",
        }),
      });

      const notCondition: JsonCondition = {
        type: "not",
        conditions: [{ archetype: "abyssal" }],
      };

      expect(evaluateJsonCondition(notCondition, context)).toBe(true);

      const failingNotCondition: JsonCondition = {
        type: "not",
        conditions: [{ archetype: "infernal_dragons" }],
      };

      expect(evaluateJsonCondition(failingNotCondition, context)).toBe(false);
    });

    it("should handle nested compound conditions", () => {
      const context = createMockContext({
        targetCardDef: createMockCardDef({
          archetype: "infernal_dragons",
          cost: 4,
          attack: 1500,
          cardType: "creature",
        }),
      });

      const nestedCondition: JsonCondition = {
        type: "and",
        conditions: [
          { archetype: "infernal_dragons" },
          {
            type: "or",
            conditions: [{ level: 4 }, { attack: { min: 2000 } }],
          },
        ],
      };

      expect(evaluateJsonCondition(nestedCondition, context)).toBe(true);
    });

    it("should return true for empty nested conditions", () => {
      const context = createMockContext();

      const emptyAnd: JsonCondition = { type: "and", conditions: [] };
      const emptyOr: JsonCondition = { type: "or", conditions: [] };
      const emptyNot: JsonCondition = { type: "not", conditions: [] };

      expect(evaluateJsonCondition(emptyAnd, context)).toBe(true);
      expect(evaluateJsonCondition(emptyOr, context)).toBe(false);
      expect(evaluateJsonCondition(emptyNot, context)).toBe(true);
    });
  });
});

// ============================================================================
// FIELD COUNT TESTS
// ============================================================================

describe("evaluateFieldCount", () => {
  it("should count monsters on own board", () => {
    const gameState = createMockGameState({
      hostBoard: [
        createMockCardOnBoard({ cardId: "card1" as Id<"cardDefinitions"> }),
        createMockCardOnBoard({ cardId: "card2" as Id<"cardDefinitions"> }),
      ],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: FieldCountCondition = {
      zone: "monster",
      owner: "self",
      count: 2,
    };

    expect(evaluateFieldCount(condition, context)).toBe(true);
  });

  it("should count monsters on opponent board", () => {
    const gameState = createMockGameState({
      opponentBoard: [
        createMockCardOnBoard({ cardId: "card1" as Id<"cardDefinitions"> }),
        createMockCardOnBoard({ cardId: "card2" as Id<"cardDefinitions"> }),
        createMockCardOnBoard({ cardId: "card3" as Id<"cardDefinitions"> }),
      ],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: FieldCountCondition = {
      zone: "monster",
      owner: "opponent",
      count: { min: 2 },
    };

    expect(evaluateFieldCount(condition, context)).toBe(true);
  });

  it("should count monsters on both sides", () => {
    const gameState = createMockGameState({
      hostBoard: [createMockCardOnBoard({ cardId: "card1" as Id<"cardDefinitions"> })],
      opponentBoard: [
        createMockCardOnBoard({ cardId: "card2" as Id<"cardDefinitions"> }),
        createMockCardOnBoard({ cardId: "card3" as Id<"cardDefinitions"> }),
      ],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: FieldCountCondition = {
      zone: "monster",
      owner: "both",
      count: 3,
    };

    expect(evaluateFieldCount(condition, context)).toBe(true);
  });

  it("should filter by position", () => {
    const gameState = createMockGameState({
      hostBoard: [
        createMockCardOnBoard({
          cardId: "card1" as Id<"cardDefinitions">,
          position: 1,
        }),
        createMockCardOnBoard({
          cardId: "card2" as Id<"cardDefinitions">,
          position: -1,
        }),
        createMockCardOnBoard({
          cardId: "card3" as Id<"cardDefinitions">,
          position: 1,
        }),
      ],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const attackCondition: FieldCountCondition = {
      zone: "monster",
      owner: "self",
      count: 2,
      filter: { position: "attack" },
    };

    expect(evaluateFieldCount(attackCondition, context)).toBe(true);

    const defenseCondition: FieldCountCondition = {
      zone: "monster",
      owner: "self",
      count: 1,
      filter: { position: "defense" },
    };

    expect(evaluateFieldCount(defenseCondition, context)).toBe(true);
  });

  it("should filter face-down cards", () => {
    const gameState = createMockGameState({
      hostBoard: [
        createMockCardOnBoard({
          cardId: "card1" as Id<"cardDefinitions">,
          isFaceDown: false,
        }),
        createMockCardOnBoard({
          cardId: "card2" as Id<"cardDefinitions">,
          isFaceDown: true,
        }),
      ],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const faceUpCondition: FieldCountCondition = {
      zone: "monster",
      owner: "self",
      count: 1,
      filter: { isFaceDown: false },
    };

    expect(evaluateFieldCount(faceUpCondition, context)).toBe(true);
  });
});

// ============================================================================
// GRAVEYARD TESTS
// ============================================================================

describe("evaluateGraveyardContains", () => {
  it("should check if graveyard has any cards", () => {
    const gameState = createMockGameState({
      hostGraveyard: ["card1" as Id<"cardDefinitions">, "card2" as Id<"cardDefinitions">],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: GraveyardCondition = {
      owner: "self",
    };

    expect(evaluateGraveyardContains(condition, context)).toBe(true);
  });

  it("should return false for empty graveyard", () => {
    const gameState = createMockGameState({ hostGraveyard: [] });
    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: GraveyardCondition = {
      owner: "self",
    };

    expect(evaluateGraveyardContains(condition, context)).toBe(false);
  });

  it("should check opponent graveyard", () => {
    const gameState = createMockGameState({
      opponentGraveyard: ["card1" as Id<"cardDefinitions">],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: GraveyardCondition = {
      owner: "opponent",
    };

    expect(evaluateGraveyardContains(condition, context)).toBe(true);
  });

  it("should check both graveyards", () => {
    const gameState = createMockGameState({
      hostGraveyard: [],
      opponentGraveyard: ["card1" as Id<"cardDefinitions">],
    });

    const context = createMockContext({ gameState, playerIs: "host" });

    const condition: GraveyardCondition = {
      owner: "both",
    };

    expect(evaluateGraveyardContains(condition, context)).toBe(true);
  });

  it("should filter by card type with cache", () => {
    const monsterCard = createMockCardDef({
      _id: "monster1" as Id<"cardDefinitions">,
      cardType: "creature",
    });
    const spellCard = createMockCardDef({
      _id: "spell1" as Id<"cardDefinitions">,
      cardType: "spell",
    });

    const cardDefsCache = new Map<string, Doc<"cardDefinitions">>();
    cardDefsCache.set(monsterCard._id.toString(), monsterCard);
    cardDefsCache.set(spellCard._id.toString(), spellCard);

    const gameState = createMockGameState({
      hostGraveyard: [monsterCard._id, spellCard._id],
    });

    const context = createMockContext({
      gameState,
      playerIs: "host",
      cardDefsCache,
    });

    const monsterCondition: GraveyardCondition = {
      owner: "self",
      contains: { cardType: "creature" },
    };

    expect(evaluateGraveyardContains(monsterCondition, context)).toBe(true);
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe("evaluateAttribute", () => {
  it("should map archetypes to attributes correctly", () => {
    expect(evaluateAttribute("infernal_dragons", "fire")).toBe(true);
    expect(evaluateAttribute("abyssal_horrors", "water")).toBe(true);
    expect(evaluateAttribute("nature_spirits", "earth")).toBe(true);
    expect(evaluateAttribute("storm_elementals", "wind")).toBe(true);
    expect(evaluateAttribute("shadow_assassins", "dark")).toBe(true);
    expect(evaluateAttribute("celestial_guardians", "light")).toBe(true);
  });

  it("should be case insensitive", () => {
    expect(evaluateAttribute("INFERNAL_DRAGONS", "FIRE")).toBe(true);
    expect(evaluateAttribute("Infernal_Dragons", "Fire")).toBe(true);
  });

  it("should return false for mismatched attributes", () => {
    expect(evaluateAttribute("infernal_dragons", "water")).toBe(false);
    expect(evaluateAttribute("nature_spirits", "fire")).toBe(false);
  });

  it("should return false for undefined archetype", () => {
    expect(evaluateAttribute(undefined, "fire")).toBe(false);
  });
});

describe("evaluateCardType", () => {
  it("should match card types correctly", () => {
    expect(evaluateCardType("creature", "creature")).toBe(true);
    expect(evaluateCardType("spell", "spell")).toBe(true);
    expect(evaluateCardType("trap", "trap")).toBe(true);
  });

  it("should return false for mismatched types", () => {
    expect(evaluateCardType("creature", "spell")).toBe(false);
    expect(evaluateCardType("spell", "trap")).toBe(false);
  });

  it("should return false for undefined card type", () => {
    expect(evaluateCardType(undefined, "creature")).toBe(false);
  });
});

// ============================================================================
// LEGACY CONDITION TESTS
// ============================================================================

describe("convertLegacyCondition", () => {
  it("should convert all_monsters", () => {
    const result = convertLegacyCondition("all_monsters");
    expect(result).toEqual({ cardType: "creature" });
  });

  it("should convert opponent_monsters", () => {
    const result = convertLegacyCondition("opponent_monsters");
    expect(result).toEqual({ cardType: "creature", owner: "opponent" });
  });

  it("should convert level conditions", () => {
    expect(convertLegacyCondition("level_4_or_lower")).toEqual({
      level: { max: 4 },
    });
    expect(convertLegacyCondition("level_7_or_higher")).toEqual({
      level: { min: 7 },
    });
  });

  it("should convert ATK conditions", () => {
    expect(convertLegacyCondition("atk_1500_or_less")).toEqual({
      attack: { max: 1500 },
    });
    expect(convertLegacyCondition("atk_2000_or_more")).toEqual({
      attack: { min: 2000 },
    });
  });

  it("should convert DEF conditions", () => {
    expect(convertLegacyCondition("def_1500_or_less")).toEqual({
      defense: { max: 1500 },
    });
    expect(convertLegacyCondition("def_2000_or_more")).toEqual({
      defense: { min: 2000 },
    });
  });

  it("should convert archetype conditions", () => {
    expect(convertLegacyCondition("dragon_monsters")).toEqual({
      archetype: "dragon",
    });
    expect(convertLegacyCondition("warrior_monsters")).toEqual({
      archetype: "warrior",
    });
  });

  it("should return null for unrecognized conditions", () => {
    expect(convertLegacyCondition("unknown_condition")).toBeNull();
    expect(convertLegacyCondition("")).toBeNull();
  });
});

describe("matchesLegacyCondition", () => {
  it("should match all_monsters", () => {
    const card = createMockCardDef({ cardType: "creature" });
    expect(_matchesLegacyCondition(card, "all_monsters")).toBe(true);
  });

  it("should match level conditions", () => {
    const level4Card = createMockCardDef({
      cost: 4,
      cardType: "creature",
    });

    expect(_matchesLegacyCondition(level4Card, "level_4_or_lower")).toBe(true);
    expect(_matchesLegacyCondition(level4Card, "level_3_or_lower")).toBe(false);
    expect(_matchesLegacyCondition(level4Card, "level_4_or_higher")).toBe(true);
    expect(_matchesLegacyCondition(level4Card, "level_5_or_higher")).toBe(false);
  });

  it("should match ATK conditions", () => {
    const card = createMockCardDef({
      attack: 1500,
      cardType: "creature",
    });

    expect(_matchesLegacyCondition(card, "atk_1500_or_less")).toBe(true);
    expect(_matchesLegacyCondition(card, "atk_1000_or_less")).toBe(false);
    expect(_matchesLegacyCondition(card, "atk_1500_or_more")).toBe(true);
    expect(_matchesLegacyCondition(card, "atk_2000_or_more")).toBe(false);
  });

  it("should match DEF conditions", () => {
    const card = createMockCardDef({
      defense: 2000,
      cardType: "creature",
    });

    expect(_matchesLegacyCondition(card, "def_2000_or_less")).toBe(true);
    expect(_matchesLegacyCondition(card, "def_1500_or_less")).toBe(false);
    expect(_matchesLegacyCondition(card, "def_2000_or_more")).toBe(true);
    expect(_matchesLegacyCondition(card, "def_2500_or_more")).toBe(false);
  });

  it("should match archetype conditions", () => {
    const dragonCard = createMockCardDef({
      archetype: "infernal_dragons",
      cardType: "creature",
    });

    expect(_matchesLegacyCondition(dragonCard, "dragon_monsters")).toBe(true);
    expect(_matchesLegacyCondition(dragonCard, "infernal_monsters")).toBe(true);
    expect(_matchesLegacyCondition(dragonCard, "warrior_monsters")).toBe(false);
  });

  it("should match archetype by card name", () => {
    const card = createMockCardDef({
      name: "Dragon Knight",
      archetype: "neutral",
      cardType: "creature",
    });

    expect(_matchesLegacyCondition(card, "dragon_monsters")).toBe(true);
  });
});

describe("matchesCondition (unified)", () => {
  it("should return true for no condition", () => {
    const card = createMockCardDef({ cardType: "creature" });
    expect(_matchesCondition(card, undefined)).toBe(true);
  });

  it("should return false for non-monsters", () => {
    const spellCard = createMockCardDef({ cardType: "spell" });
    expect(_matchesCondition(spellCard, "all_monsters")).toBe(false);
  });

  it("should handle string conditions (legacy)", () => {
    const card = createMockCardDef({
      archetype: "infernal_dragons",
      cardType: "creature",
    });
    expect(_matchesCondition(card, "dragon_monsters")).toBe(true);
  });

  it("should handle JSON conditions", () => {
    const card = createMockCardDef({
      archetype: "infernal_dragons",
      cost: 4,
      cardType: "creature",
    });

    const jsonCondition: JsonCondition = {
      type: "and",
      conditions: [{ archetype: "dragon" }, { level: { max: 4 } }],
    };

    expect(_matchesCondition(card, jsonCondition)).toBe(true);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration: Complex conditions", () => {
  it("should evaluate a complex field spell condition", () => {
    // Scenario: "All Dragon monsters you control with ATK less than 2000 gain 500 ATK"
    const condition: JsonCondition = {
      type: "and",
      conditions: [{ archetype: "dragon" }, { attack: { max: 1999 } }, { owner: "self" }],
    };

    const matchingCard = createMockCardDef({
      archetype: "infernal_dragons",
      attack: 1500,
      cardType: "creature",
    });

    const nonMatchingCard = createMockCardDef({
      archetype: "infernal_dragons",
      attack: 2500,
      cardType: "creature",
    });

    const gameState = createMockGameState({
      hostBoard: [
        createMockCardOnBoard({
          cardId: matchingCard._id,
          attack: matchingCard.attack || 0,
        }),
      ],
    });

    const matchingContext = createMockContext({
      gameState,
      targetCardDef: matchingCard,
      targetCard: gameState.hostBoard[0],
      playerIs: "host",
    });

    const nonMatchingContext = createMockContext({
      gameState,
      targetCardDef: nonMatchingCard,
      playerIs: "host",
    });

    expect(evaluateJsonCondition(condition, matchingContext)).toBe(true);
    expect(evaluateJsonCondition(condition, nonMatchingContext)).toBe(false);
  });

  it("should evaluate graveyard-based activation condition", () => {
    // Scenario: "Can only activate if you have 3 or more Dragon monsters in your GY"
    const dragonCard1 = createMockCardDef({
      _id: "dragon1" as Id<"cardDefinitions">,
      archetype: "infernal_dragons",
      cardType: "creature",
    });
    const dragonCard2 = createMockCardDef({
      _id: "dragon2" as Id<"cardDefinitions">,
      archetype: "infernal_dragons",
      cardType: "creature",
    });
    const dragonCard3 = createMockCardDef({
      _id: "dragon3" as Id<"cardDefinitions">,
      archetype: "infernal_dragons",
      cardType: "creature",
    });

    const cardDefsCache = new Map<string, Doc<"cardDefinitions">>();
    cardDefsCache.set(dragonCard1._id.toString(), dragonCard1);
    cardDefsCache.set(dragonCard2._id.toString(), dragonCard2);
    cardDefsCache.set(dragonCard3._id.toString(), dragonCard3);

    const gameState = createMockGameState({
      hostGraveyard: [dragonCard1._id, dragonCard2._id, dragonCard3._id],
    });

    const context = createMockContext({
      gameState,
      playerIs: "host",
      cardDefsCache,
    });

    const condition: JsonCondition = {
      graveyardContains: {
        owner: "self",
        count: { min: 3 },
        contains: {
          archetype: "dragon",
        },
      },
    };

    expect(evaluateJsonCondition(condition, context)).toBe(true);

    // Test with not enough dragons
    const insufficientContext = createMockContext({
      gameState: createMockGameState({
        hostGraveyard: [dragonCard1._id, dragonCard2._id],
      }),
      playerIs: "host",
      cardDefsCache,
    });

    expect(evaluateJsonCondition(condition, insufficientContext)).toBe(false);
  });

  it("should evaluate LP threshold condition", () => {
    // Scenario: "Gain 1000 ATK when your LP is 2000 or less"
    const condition: JsonCondition = {
      lpBelow: 2001,
    };

    const lowLPContext = createMockContext({
      gameState: createMockGameState({ hostLifePoints: 2000 }),
      playerIs: "host",
    });

    const highLPContext = createMockContext({
      gameState: createMockGameState({ hostLifePoints: 5000 }),
      playerIs: "host",
    });

    expect(evaluateJsonCondition(condition, lowLPContext)).toBe(true);
    expect(evaluateJsonCondition(condition, highLPContext)).toBe(false);
  });
});
