/**
 * Multi-Part Effect Parser Tests
 *
 * Tests the parsing of complex multi-clause abilities
 */

import { describe, expect, test } from "vitest";
import { parseAbility, parseMultiPartAbility } from "../gameplay/effectSystem";

describe("Multi-Part Effect Parser", () => {
  test("should parse protection + continuous effect", () => {
    const ability = "Cannot be destroyed by battle. All Dragon-Type monsters gain 500 ATK.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(true);
    expect(result.effects).toHaveLength(2);

    // First effect: protection
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.protection?.cannotBeDestroyedByBattle).toBe(true);
    expect(effect0.continuous).toBe(true);

    // Second effect: continuous ATK boost
    const effect1 = result.effects[1];
    expect(effect1).toBeDefined();
    if (!effect1) throw new Error("Effect 1 not found");
    expect(effect1.type).toBe("modifyATK");
    expect(effect1.value).toBe(500);
    expect(effect1.continuous).toBe(true);
    expect(effect1.condition).toContain("dragon");
  });

  test("should parse continuous + OPT trigger", () => {
    const ability = "All Dragon-Type monsters gain 300 ATK. Once per turn: Draw 1 card.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(true);
    expect(result.effects).toHaveLength(2);

    // First effect: continuous ATK boost
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.type).toBe("modifyATK");
    expect(effect0.value).toBe(300);
    expect(effect0.continuous).toBe(true);

    // Second effect: OPT draw
    const effect1 = result.effects[1];
    expect(effect1).toBeDefined();
    if (!effect1) throw new Error("Effect 1 not found");
    expect(effect1.type).toBe("draw");
    expect(effect1.value).toBe(1);
    expect(effect1.isOPT).toBe(true);
  });

  test("should parse protection + continuous + triggered effect", () => {
    const ability =
      "Cannot be destroyed by battle. All Dragon-Type monsters you control gain 500 ATK. When this card destroys a monster by battle: Draw 1 card.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(true);
    expect(result.effects).toHaveLength(3);

    // First effect: protection
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.protection?.cannotBeDestroyedByBattle).toBe(true);

    // Second effect: continuous ATK boost
    const effect1 = result.effects[1];
    expect(effect1).toBeDefined();
    if (!effect1) throw new Error("Effect 1 not found");
    expect(effect1.type).toBe("modifyATK");
    expect(effect1.value).toBe(500);
    expect(effect1.continuous).toBe(true);

    // Third effect: battle destroy trigger
    const effect2 = result.effects[2];
    expect(effect2).toBeDefined();
    if (!effect2) throw new Error("Effect 2 not found");
    expect(effect2.type).toBe("draw");
    expect(effect2.trigger).toBe("on_battle_destroy");
    expect(effect2.value).toBe(1);
  });

  test("should parse battle phase trigger + temporary modifier", () => {
    const ability = "At the start of the Battle Phase: This card gains 500 ATK until end of turn.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(false); // Single clause with colon
    expect(result.effects).toHaveLength(1);

    // Single triggered effect
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.type).toBe("modifyATK");
    expect(effect0.trigger).toBe("on_battle_start");
    expect(effect0.value).toBe(500);
  });

  test("should parse multi-protection", () => {
    const ability = "Cannot be destroyed by battle or card effects.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(false);
    expect(result.effects).toHaveLength(1);

    // Combined protection
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.protection?.cannotBeDestroyedByBattle).toBe(true);
    expect(effect0.protection?.cannotBeDestroyedByEffects).toBe(true);
  });

  test("should parse end phase + OPT trigger", () => {
    const ability = "During each End Phase: Deal 500 damage.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(false);
    expect(result.effects).toHaveLength(1);

    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.type).toBe("damage");
    expect(effect0.trigger).toBe("on_end");
    expect(effect0.value).toBe(500);
  });

  test("should parse complex 4-part ability", () => {
    const ability =
      "Cannot be destroyed by battle. Cannot be targeted by opponent's card effects. All Dragon-Type monsters gain 300 ATK. Once per turn: Add 1 Dragon monster from your graveyard to your hand.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(true);
    expect(result.effects).toHaveLength(4);

    // Protection 1
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.protection?.cannotBeDestroyedByBattle).toBe(true);

    // Protection 2
    const effect1 = result.effects[1];
    expect(effect1).toBeDefined();
    if (!effect1) throw new Error("Effect 1 not found");
    expect(effect1.protection?.cannotBeTargeted).toBe(true);

    // Continuous ATK
    const effect2 = result.effects[2];
    expect(effect2).toBeDefined();
    if (!effect2) throw new Error("Effect 2 not found");
    expect(effect2.type).toBe("modifyATK");
    expect(effect2.continuous).toBe(true);

    // OPT GY recursion
    const effect3 = result.effects[3];
    expect(effect3).toBeDefined();
    if (!effect3) throw new Error("Effect 3 not found");
    expect(effect3.type).toBe("toHand");
    expect(effect3.targetLocation).toBe("graveyard");
    expect(effect3.isOPT).toBe(true);
  });

  test("should handle simple single-clause ability", () => {
    const ability = "Draw 2 cards";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(false);
    expect(result.effects).toHaveLength(1);

    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.type).toBe("draw");
    expect(effect0.value).toBe(2);
  });

  test("should handle empty ability", () => {
    const ability = "";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(false);
    expect(result.effects).toHaveLength(0);
  });

  test("should parse summon trigger with multi-part effect", () => {
    const ability = "When summoned: Deal 500 damage. All Fire-Type monsters gain 200 ATK.";
    const result = parseMultiPartAbility(ability);

    expect(result.hasMultiPart).toBe(true);
    expect(result.effects).toHaveLength(2);

    // Triggered damage
    const effect0 = result.effects[0];
    expect(effect0).toBeDefined();
    if (!effect0) throw new Error("Effect 0 not found");
    expect(effect0.type).toBe("damage");
    expect(effect0.trigger).toBe("on_summon");
    expect(effect0.value).toBe(500);

    // Continuous buff
    const effect1 = result.effects[1];
    expect(effect1).toBeDefined();
    if (!effect1) throw new Error("Effect 1 not found");
    expect(effect1.type).toBe("modifyATK");
    expect(effect1.continuous).toBe(true);
    expect(effect1.value).toBe(200);
  });
});

describe("parseAbility backwards compatibility", () => {
  test("should still work for simple abilities", () => {
    const ability = "Draw 2 cards";
    const result = parseAbility(ability);

    expect(result).not.toBeNull();
    expect(result?.type).toBe("draw");
    expect(result?.value).toBe(2);
  });

  test("should parse first parseable effect from multi-part ability", () => {
    const ability = "Cannot be destroyed by battle. Draw 2 cards.";
    const result = parseAbility(ability);

    expect(result).not.toBeNull();
    // parseAbility (original function) parses the whole text and returns the first parseable action
    // In this case, it finds "draw 2 cards" as the action effect
    expect(result?.type).toBe("draw");
    expect(result?.value).toBe(2);
  });
});
