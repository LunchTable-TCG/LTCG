import { describe, it, expect } from "vitest";
import { defineCards, validateDeck } from "../cards.js";
import type { CardDefinition } from "../types/index.js";
import { EXAMPLE_CARDS } from "./fixtures/example-card-set.js";

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

describe("defineCards", () => {
  it("returns a card lookup map", () => {
    const lookup = defineCards(sampleCards);
    expect(lookup["warrior-1"]).toBeDefined();
    expect(lookup["warrior-1"].name).toBe("Test Warrior");
  });

  it("throws on duplicate card IDs", () => {
    const dupes = [sampleCards[0], { ...sampleCards[0] }];
    expect(() => defineCards(dupes)).toThrow("Duplicate card ID");
  });

  it("throws on stereotype without attack/defense", () => {
    const bad: CardDefinition[] = [
      { id: "bad", name: "Bad", type: "stereotype", description: "", rarity: "common" },
    ];
    expect(() => defineCards(bad)).toThrow("attack");
  });

  it("accepts cards with optional meta fields", () => {
    const cards = defineCards([
      {
        id: "meta-test",
        name: "Meta Card",
        type: "stereotype",
        description: "Card with metadata",
        rarity: "common",
        attack: 1000,
        defense: 1000,
        level: 4,
        viceType: "gambling",
        flavorText: "A test card",
        cost: 1,
        meta: { custom: true },
      },
    ]);
    expect(cards["meta-test"]?.viceType).toBe("gambling");
    expect(cards["meta-test"]?.meta?.custom).toBe(true);
  });
});

describe("validateDeck", () => {
  const lookup = defineCards(sampleCards);

  it("validates a legal deck", () => {
    const deck = Array(40).fill("warrior-1");
    const result = validateDeck(deck, lookup, { min: 40, max: 60 });
    expect(result.valid).toBe(true);
  });

  it("rejects a deck that is too small", () => {
    const deck = Array(10).fill("warrior-1");
    const result = validateDeck(deck, lookup, { min: 40, max: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("too few");
  });

  it("rejects unknown card IDs", () => {
    const deck = Array(40).fill("nonexistent");
    const result = validateDeck(deck, lookup, { min: 40, max: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unknown card");
  });
});

describe("card validation", () => {
  it("rejects spell without spellType", () => {
    expect(() =>
      defineCards([
        { id: "bad-spell", name: "Bad", type: "spell", description: "", rarity: "common" },
      ])
    ).toThrow('Spell "bad-spell" must have a spellType');
  });

  it("rejects trap without trapType", () => {
    expect(() =>
      defineCards([
        { id: "bad-trap", name: "Bad", type: "trap", description: "", rarity: "common" },
      ])
    ).toThrow('Trap "bad-trap" must have a trapType');
  });

  it("rejects stereotype with negative attack", () => {
    expect(() =>
      defineCards([
        {
          id: "neg-atk",
          name: "Bad",
          type: "stereotype",
          description: "",
          rarity: "common",
          attack: -100,
          defense: 1000,
          level: 4,
        },
      ])
    ).toThrow('Stereotype "neg-atk" attack must be non-negative');
  });

  it("rejects stereotype with level out of range", () => {
    expect(() =>
      defineCards([
        {
          id: "bad-level",
          name: "Bad",
          type: "stereotype",
          description: "",
          rarity: "common",
          attack: 1000,
          defense: 1000,
          level: 0,
        },
      ])
    ).toThrow('Stereotype "bad-level" level must be between 1 and 12');
  });

  it("rejects cards with empty name", () => {
    expect(() =>
      defineCards([
        { id: "no-name", name: "", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ])
    ).toThrow('Card "no-name" must have a name');
  });

  it("rejects cards with empty id", () => {
    expect(() =>
      defineCards([
        { id: "", name: "Test", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ])
    ).toThrow("Card must have an id");
  });
});

describe("example card set", () => {
  it("validates the complete example set", () => {
    const lookup = defineCards(EXAMPLE_CARDS);
    expect(Object.keys(lookup)).toHaveLength(6);
  });

  it("includes all card types", () => {
    const lookup = defineCards(EXAMPLE_CARDS);
    const types = new Set(Object.values(lookup).map((c) => c.type));
    expect(types).toEqual(new Set(["stereotype", "spell", "trap"]));
  });
});
