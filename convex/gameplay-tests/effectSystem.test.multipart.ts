/**
 * Effect System Tests - JSON Only
 *
 * Tests JSON-based effect parsing exclusively.
 * Text parsing has been deprecated and removed.
 */

import { describe, expect, test } from "vitest";
import { parseJsonAbility, parseUnifiedAbility } from "../gameplay/effectSystem";
import type { JsonAbility, JsonEffect } from "../gameplay/effectSystem/types";

// ============================================================================
// JSON PARSER - SIMPLE EFFECTS
// ============================================================================

describe("JSON Effect Parser - Simple Effects", () => {
  test("should parse draw effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 2,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("draw");
    expect(result.effects[0]?.value).toBe(2);
    expect(result.effects[0]?.trigger).toBe("manual");
  });

  test("should parse damage effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "damage",
          trigger: "manual",
          value: 500,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("damage");
    expect(result.effects[0]?.value).toBe(500);
  });

  test("should parse gainLP effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "gainLP",
          trigger: "manual",
          value: 1000,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("gainLP");
    expect(result.effects[0]?.value).toBe(1000);
  });

  test("should parse mill effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "mill",
          trigger: "manual",
          value: 3,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("mill");
    expect(result.effects[0]?.value).toBe(3);
  });

  test("should parse discard effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "discard",
          trigger: "manual",
          value: 1,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("discard");
    expect(result.effects[0]?.value).toBe(1);
  });

  test("should parse negate effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "negate",
          trigger: "manual",
          negateType: "activation",
          negateAndDestroy: true,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("negate");
  });
});

// ============================================================================
// JSON PARSER - EFFECTS WITH COSTS
// ============================================================================

describe("JSON Effect Parser - Effects with Costs", () => {
  test("should parse effect with discard cost", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 2,
          cost: {
            type: "discard",
            value: 1,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.cost?.type).toBe("discard");
    expect(result.effects[0]?.cost?.value).toBe(1);
  });

  test("should parse effect with LP cost", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: {
            location: "board",
            owner: "opponent",
            count: 1,
          },
          cost: {
            type: "pay_lp",
            value: 1000,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.cost?.type).toBe("pay_lp");
    expect(result.effects[0]?.cost?.value).toBe(1000);
  });

  test("should parse effect with tribute cost", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "summon",
          trigger: "manual",
          summonFrom: "graveyard",
          cost: {
            type: "tribute",
            value: 1,
            condition: { cardType: "monster" },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.cost?.type).toBe("tribute");
    expect(result.effects[0]?.cost?.value).toBe(1);
    expect(result.effects[0]?.cost?.targetType).toBe("monster");
  });

  test("should parse effect with banish cost", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "search",
          trigger: "manual",
          targetLocation: "deck",
          cost: {
            type: "banish",
            value: 2,
            from: "graveyard",
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.cost?.type).toBe("banish");
    expect(result.effects[0]?.cost?.value).toBe(2);
  });
});

// ============================================================================
// JSON PARSER - EFFECTS WITH TARGETING
// ============================================================================

describe("JSON Effect Parser - Effects with Targeting", () => {
  test("should parse destroy effect with targeting", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: {
            location: "board",
            owner: "opponent",
            count: 1,
            condition: { cardType: "monster" },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("destroy");
    expect(result.effects[0]?.targetCount).toBe(1);
    expect(result.effects[0]?.targetLocation).toBe("board");
    expect(result.effects[0]?.targetType).toBe("monster");
  });

  test("should parse banish effect with targeting", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "banish",
          trigger: "manual",
          target: {
            location: "graveyard",
            owner: "opponent",
            count: 2,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("banish");
    expect(result.effects[0]?.targetCount).toBe(2);
    expect(result.effects[0]?.targetLocation).toBe("graveyard");
  });

  test("should parse toHand effect from graveyard", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "toHand",
          trigger: "manual",
          target: {
            location: "graveyard",
            owner: "self",
            count: 1,
            condition: { cardType: "monster" },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("toHand");
    expect(result.effects[0]?.targetLocation).toBe("graveyard");
    expect(result.effects[0]?.targetType).toBe("monster");
  });

  test("should parse search effect with archetype condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "search",
          trigger: "manual",
          target: {
            location: "deck",
            owner: "self",
            count: 1,
          },
          searchCondition: { archetype: "infernal_dragons" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("search");
    expect(result.effects[0]?.targetLocation).toBe("deck");
  });

  test("should parse destroy with player choice targeting", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: {
            location: "board",
            owner: "opponent",
            count: 2,
            selection: "player_choice",
            condition: { cardType: "spell" },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("destroy");
    expect(result.effects[0]?.targetCount).toBe(2);
    expect(result.effects[0]?.targetType).toBe("spell");
  });
});

// ============================================================================
// JSON PARSER - OPT EFFECTS
// ============================================================================

describe("JSON Effect Parser - OPT Effects", () => {
  test("should parse effect with OPT restriction", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 1,
          isOPT: true,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.isOPT).toBe(true);
  });

  test("should parse effect with HOPT restriction", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "search",
          trigger: "manual",
          targetLocation: "deck",
          isHOPT: true,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("search");
  });

  test("should parse triggered OPT effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "on_summon",
          value: 1,
          isOPT: true,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.trigger).toBe("on_summon");
    expect(result.effects[0]?.isOPT).toBe(true);
  });
});

// ============================================================================
// JSON PARSER - CONTINUOUS EFFECTS
// ============================================================================

describe("JSON Effect Parser - Continuous Effects", () => {
  test("should parse continuous ATK modifier", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 500,
          isContinuous: true,
          condition: { archetype: "infernal_dragons" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.continuous).toBe(true);
    expect(result.effects[0]?.type).toBe("modifyATK");
    expect(result.effects[0]?.value).toBe(500);
  });

  test("should parse continuous DEF modifier", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyDEF",
          trigger: "manual",
          value: 300,
          isContinuous: true,
          condition: { cardType: "monster", targetOwner: "self" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.continuous).toBe(true);
    expect(result.effects[0]?.type).toBe("modifyDEF");
    expect(result.effects[0]?.value).toBe(300);
  });

  test("should parse continuous effect with archetype restriction", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 400,
          isContinuous: true,
          condition: { archetype: "celestial_guardians" },
          statTarget: "all_matching",
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.continuous).toBe(true);
    expect(result.effects[0]?.condition).toContain("celestial_guardians");
  });

  test("should parse continuous negative modifier", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: -500,
          isContinuous: true,
          condition: { cardType: "monster", targetOwner: "opponent" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.continuous).toBe(true);
    expect(result.effects[0]?.value).toBe(-500);
  });
});

// ============================================================================
// JSON PARSER - MULTI-EFFECT ABILITIES
// ============================================================================

describe("JSON Effect Parser - Multi-Effect Abilities", () => {
  test("should parse ability with multiple effects", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 500,
          isContinuous: true,
          condition: { archetype: "infernal_dragons" },
        },
        {
          type: "draw",
          trigger: "on_battle_destroy",
          value: 1,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(2);
    expect(result.hasMultiPart).toBe(true);
    expect(result.effects[0]?.type).toBe("modifyATK");
    expect(result.effects[1]?.type).toBe("draw");
    expect(result.effects[1]?.trigger).toBe("on_battle_destroy");
  });

  test("should parse ability with three effects", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 300,
          isContinuous: true,
        },
        {
          type: "draw",
          trigger: "on_summon",
          value: 1,
          isOPT: true,
        },
        {
          type: "destroy",
          trigger: "on_destroy",
          target: { location: "board", owner: "opponent", count: 1 },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(3);
    expect(result.hasMultiPart).toBe(true);
  });

  test("should parse chained 'then' effects", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: { location: "board", owner: "opponent", count: 1 },
          then: {
            type: "draw",
            trigger: "manual",
            value: 1,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    // 'then' effects should be flattened into the effects array
    expect(result.effects.length).toBeGreaterThanOrEqual(2);
    expect(result.effects[0]?.type).toBe("destroy");
    expect(result.effects[1]?.type).toBe("draw");
  });

  test("should parse single effect as non-multipart", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 2,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.hasMultiPart).toBe(false);
  });

  test("should parse ability with continuous effect and protection", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: { cannotBeDestroyedByBattle: true },
        },
        {
          type: "modifyATK",
          trigger: "manual",
          value: 500,
          isContinuous: true,
          condition: { archetype: "infernal_dragons" },
        },
        {
          type: "draw",
          trigger: "on_battle_destroy",
          value: 1,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(3);
    expect(result.hasMultiPart).toBe(true);

    expect(result.effects[0]?.protection?.cannotBeDestroyedByBattle).toBe(true);
    expect(result.effects[1]?.type).toBe("modifyATK");
    expect(result.effects[1]?.value).toBe(500);
    expect(result.effects[2]?.type).toBe("draw");
    expect(result.effects[2]?.trigger).toBe("on_battle_destroy");
  });
});

// ============================================================================
// JSON PARSER - TRIGGERED EFFECTS
// ============================================================================

describe("JSON Effect Parser - Triggered Effects", () => {
  test("should parse on_summon trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "on_summon",
          value: 1,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_summon");
  });

  test("should parse on_destroy trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "damage",
          trigger: "on_destroy",
          value: 500,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_destroy");
  });

  test("should parse on_battle_damage trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "on_battle_damage",
          value: 1,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_battle_damage");
  });

  test("should parse on_battle_destroy trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "search",
          trigger: "on_battle_destroy",
          targetLocation: "deck",
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_battle_destroy");
  });

  test("should parse on_flip trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "on_flip",
          target: { location: "board", owner: "opponent", count: 1 },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_flip");
  });

  test("should parse on_end trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "on_end",
          value: 1,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_end");
  });

  test("should parse on_battle_attacked trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "on_battle_attacked",
          value: 500,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_battle_attacked");
  });

  test("should parse on_opponent_summon trigger", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "damage",
          trigger: "on_opponent_summon",
          value: 200,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);
    expect(result.effects[0]?.trigger).toBe("on_opponent_summon");
  });

  test("should parse all trigger types", () => {
    const triggers = [
      "on_summon",
      "on_destroy",
      "on_battle_damage",
      "on_battle_destroy",
      "on_battle_attacked",
      "on_flip",
      "on_draw",
      "on_end",
      "on_opponent_summon",
      "on_battle_start",
      "manual",
    ] as const;

    for (const trigger of triggers) {
      const jsonAbility: JsonAbility = {
        effects: [
          {
            type: "draw",
            trigger,
            value: 1,
          },
        ],
      };

      const result = parseJsonAbility(jsonAbility);
      expect(result.effects[0]?.trigger).toBe(trigger);
    }
  });
});

// ============================================================================
// JSON PARSER - PROTECTION FLAGS
// ============================================================================

describe("JSON Effect Parser - Protection Effects", () => {
  test("should parse cannotBeDestroyedByBattle protection", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: {
            cannotBeDestroyedByBattle: true,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.protection?.cannotBeDestroyedByBattle).toBe(true);
  });

  test("should parse cannotBeDestroyedByEffects protection", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: {
            cannotBeDestroyedByEffects: true,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.protection?.cannotBeDestroyedByEffects).toBe(true);
  });

  test("should parse cannotBeTargeted protection", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: {
            cannotBeTargeted: true,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.protection?.cannotBeTargeted).toBe(true);
  });

  test("should parse combined protection flags", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 0,
          isContinuous: true,
          protection: {
            cannotBeDestroyedByBattle: true,
            cannotBeDestroyedByEffects: true,
            cannotBeTargeted: true,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.protection?.cannotBeDestroyedByBattle).toBe(true);
    expect(result.effects[0]?.protection?.cannotBeDestroyedByEffects).toBe(true);
    expect(result.effects[0]?.protection?.cannotBeTargeted).toBe(true);
  });
});

// ============================================================================
// JSON PARSER - EFFECT TYPE COVERAGE
// ============================================================================

describe("JSON Effect Parser - All Effect Types", () => {
  const effectTypes: Array<{
    type: JsonEffect["type"];
    extraProps?: Partial<JsonEffect>;
  }> = [
    { type: "draw", extraProps: { value: 2 } },
    { type: "destroy", extraProps: { target: { location: "board", owner: "opponent", count: 1 } } },
    { type: "damage", extraProps: { value: 500 } },
    { type: "gainLP", extraProps: { value: 1000 } },
    { type: "modifyATK", extraProps: { value: 500 } },
    { type: "modifyDEF", extraProps: { value: 500 } },
    { type: "summon", extraProps: { summonFrom: "graveyard" } },
    { type: "search", extraProps: { targetLocation: "deck" } },
    { type: "toHand", extraProps: { targetLocation: "graveyard" } },
    { type: "toGraveyard", extraProps: { targetLocation: "board" } },
    { type: "banish", extraProps: { targetLocation: "graveyard" } },
    { type: "mill", extraProps: { value: 3 } },
    { type: "discard", extraProps: { value: 1 } },
    { type: "negate" },
    { type: "directAttack", extraProps: { condition: { opponentHasNoMonsters: true } } },
    { type: "multipleAttack", extraProps: { value: 2, isContinuous: true } },
  ];

  for (const { type, extraProps } of effectTypes) {
    test(`should parse ${type} effect`, () => {
      const jsonAbility: JsonAbility = {
        effects: [
          {
            type,
            trigger: "manual",
            ...extraProps,
          } as JsonEffect,
        ],
      };

      const result = parseJsonAbility(jsonAbility);

      expect(result.effects).toHaveLength(1);
      expect(result.effects[0]?.type).toBe(type);
    });
  }
});

// ============================================================================
// UNIFIED PARSER TESTS (JSON only)
// ============================================================================

describe("Unified Parser - JSON Format", () => {
  test("should parse JSON abilities via unified interface", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 2,
        },
      ],
    };

    const result = parseUnifiedAbility(jsonAbility);

    expect(result).not.toBeNull();
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("draw");
    expect(result.effects[0]?.value).toBe(2);
  });

  test("should handle complex JSON ability via unified interface", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "damage",
          trigger: "on_summon",
          value: 500,
        },
      ],
    };

    const result = parseUnifiedAbility(jsonAbility);

    expect(result.effects[0]?.type).toBe("damage");
    expect(result.effects[0]?.trigger).toBe("on_summon");
    expect(result.effects[0]?.value).toBe(500);
  });

  test("should parse JSON ability with spell speed", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "negate",
          trigger: "manual",
          negateType: "activation",
          spellSpeed: 2,
        },
      ],
      spellSpeed: 2,
    };

    const result = parseUnifiedAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("negate");
  });
});

// ============================================================================
// JSON PARSER - COMPLEX CONDITIONS
// ============================================================================

describe("JSON Effect Parser - Complex Conditions", () => {
  test("should parse effect with level condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "summon",
          trigger: "manual",
          summonFrom: "graveyard",
          searchCondition: {
            cardType: "monster",
            level: { max: 4 },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("summon");
  });

  test("should parse effect with attack range condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: {
            location: "board",
            owner: "opponent",
            count: 1,
            condition: {
              attack: { max: 1500 },
            },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("destroy");
  });

  test("should parse effect with graveyard count condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 300,
          isContinuous: true,
          activationCondition: {
            graveyardContains: {
              count: { min: 3 },
              cardType: "monster",
            },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.continuous).toBe(true);
  });

  test("should parse effect with LP condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 2,
          activationCondition: {
            lpBelow: 2000,
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("draw");
  });

  test("should parse effect with board count condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "damage",
          trigger: "manual",
          value: 1000,
          activationCondition: {
            boardCount: { min: 2 },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("damage");
  });

  test("should parse effect with compound AND condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "summon",
          trigger: "manual",
          summonFrom: "graveyard",
          activationCondition: {
            type: "and",
            conditions: [
              { graveyardContains: { count: { min: 2 } } },
              { lpBelow: 4000 },
            ],
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("summon");
  });

  test("should parse effect with compound OR condition", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 1,
          activationCondition: {
            type: "or",
            conditions: [
              { handSize: { max: 1 } },
              { lpBelow: 2000 },
            ],
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("draw");
  });
});

// ============================================================================
// JSON PARSER - ARCHETYPE-SPECIFIC EFFECTS
// ============================================================================

describe("JSON Effect Parser - Archetype Effects", () => {
  test("should parse effect targeting infernal_dragons archetype", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 500,
          isContinuous: true,
          condition: { archetype: "infernal_dragons" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.continuous).toBe(true);
    expect(result.effects[0]?.condition).toContain("infernal_dragons");
  });

  test("should parse effect targeting celestial_guardians archetype", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyDEF",
          trigger: "manual",
          value: 400,
          isContinuous: true,
          condition: { archetype: "celestial_guardians" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects[0]?.continuous).toBe(true);
    expect(result.effects[0]?.condition).toContain("celestial_guardians");
  });

  test("should parse search for archetype cards", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "search",
          trigger: "manual",
          target: {
            location: "deck",
            owner: "self",
            count: 1,
          },
          searchCondition: { archetype: "shadow_assassins" },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("search");
  });

  test("should parse effect targeting multiple archetypes", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 200,
          isContinuous: true,
          condition: { archetype: ["undead_legion", "abyssal_horrors"] },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.continuous).toBe(true);
  });
});

// ============================================================================
// JSON PARSER - DURATION AND SPECIAL MODIFIERS
// ============================================================================

describe("JSON Effect Parser - Duration and Modifiers", () => {
  test("should parse effect with turn duration", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyATK",
          trigger: "manual",
          value: 1000,
          duration: "turn",
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("modifyATK");
    expect(result.effects[0]?.value).toBe(1000);
  });

  test("should parse effect with phase duration", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "modifyDEF",
          trigger: "on_battle_start",
          value: 500,
          duration: "phase",
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.trigger).toBe("on_battle_start");
  });

  test("should parse chainable effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "negate",
          trigger: "manual",
          negateType: "activation",
          chainable: true,
          spellSpeed: 2,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("negate");
  });

  test("should parse negate and destroy effect", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "negate",
          trigger: "manual",
          negateType: "activation",
          negateAndDestroy: true,
          spellSpeed: 3,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("negate");
  });
});

// ============================================================================
// JSON PARSER - EMPTY AND EDGE CASES
// ============================================================================

describe("JSON Effect Parser - Edge Cases", () => {
  test("should handle empty effects array", () => {
    const jsonAbility: JsonAbility = {
      effects: [],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(0);
    expect(result.hasMultiPart).toBe(false);
  });

  test("should handle effect with minimal properties", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("draw");
    expect(result.effects[0]?.trigger).toBe("manual");
    expect(result.effects[0]?.value).toBeUndefined();
  });

  test("should handle effect with undefined optional fields", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "damage",
          trigger: "manual",
          value: 500,
          cost: undefined,
          target: undefined,
          condition: undefined,
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.cost).toBeUndefined();
    expect(result.effects[0]?.targetCount).toBeUndefined();
  });

  test("should handle effect with ability text metadata", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "draw",
          trigger: "manual",
          value: 2,
          description: "Draw 2 cards",
          effectId: "draw_2",
        },
      ],
      abilityText: "Draw 2 cards from your deck.",
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("draw");
  });

  test("should handle target with all selection", () => {
    const jsonAbility: JsonAbility = {
      effects: [
        {
          type: "destroy",
          trigger: "manual",
          target: {
            location: "board",
            owner: "opponent",
            count: "all",
            selection: "all_matching",
            condition: { cardType: "spell" },
          },
        },
      ],
    };

    const result = parseJsonAbility(jsonAbility);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]?.type).toBe("destroy");
    // count: "all" should result in targetCount of 1 (default fallback)
    expect(result.effects[0]?.targetCount).toBe(1);
  });
});
