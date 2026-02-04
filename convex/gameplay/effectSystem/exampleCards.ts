/**
 * Example Card Definitions
 *
 * Demonstrates how to use the effect library to define card abilities.
 * These examples cover common card patterns inspired by trading card games.
 *
 * Note: These are reference implementations for developers creating new cards.
 * Actual card data is stored in the cardDefinitions table.
 */

import {
  CONDITIONS,
  COSTS,
  EFFECT_TEMPLATES,
  TARGETS,
  buildAbility,
  simpleAbility,
} from "./effectLibrary";
import type { JsonAbility, JsonEffect } from "./types";

// ============================================================================
// ICONIC SPELL CARDS
// ============================================================================

/**
 * Pot of Greed - Draw 2 cards
 * Classic draw power card
 */
export const POT_OF_GREED: JsonAbility = simpleAbility(EFFECT_TEMPLATES.draw(2), "Draw 2 cards.");

/**
 * Raigeki - Destroy all opponent's monsters
 * Board wipe for opponent's monsters only
 */
export const RAIGEKI: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.destroyAllOpponentMonsters(),
  "Destroy all monsters your opponent controls."
);

/**
 * Dark Hole - Destroy all monsters on the field
 * Symmetric board wipe
 */
export const DARK_HOLE: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.destroyAllMonsters(),
  "Destroy all monsters on the field."
);

/**
 * Monster Reborn - Special summon from either graveyard
 */
export const MONSTER_REBORN: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.specialSummon("graveyard", CONDITIONS.cardType("monster")),
  "Target 1 monster in either player's Graveyard; Special Summon it."
);

/**
 * Card Destruction - Both players discard and draw
 */
export const CARD_DESTRUCTION: JsonAbility = buildAbility(
  [
    EFFECT_TEMPLATES.forceDiscard(5), // Simplified: opponent discards full hand
    EFFECT_TEMPLATES.discardSelf(5),
    EFFECT_TEMPLATES.draw(5),
    { ...EFFECT_TEMPLATES.draw(5), targetOwner: "opponent" } as JsonEffect,
  ],
  "Both players discard their entire hands, then draw the same number of cards."
);

/**
 * Mystical Space Typhoon - Destroy 1 spell/trap
 */
export const MYSTICAL_SPACE_TYPHOON: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.destroyTarget(1, CONDITIONS.spellOrTrap()),
  "Target 1 Spell/Trap on the field; destroy it."
);

/**
 * Foolish Burial - Send 1 monster from deck to GY
 */
export const FOOLISH_BURIAL: JsonAbility = simpleAbility(
  {
    type: "toGraveyard",
    trigger: "manual",
    target: TARGETS.self(1, CONDITIONS.cardType("monster"), "deck"),
  },
  "Send 1 monster from your Deck to the GY."
);

/**
 * Upstart Goblin - Draw 1, opponent gains 1000 LP
 */
export const UPSTART_GOBLIN: JsonAbility = buildAbility(
  [
    EFFECT_TEMPLATES.draw(1),
    { ...EFFECT_TEMPLATES.gainLP(1000), targetOwner: "opponent" } as JsonEffect,
  ],
  "Draw 1 card, then your opponent gains 1000 LP."
);

/**
 * Pot of Desires - Banish 10, draw 2
 */
export const POT_OF_DESIRES: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.withCost(EFFECT_TEMPLATES.draw(2), COSTS.banish(10, "deck")),
  "Banish 10 cards from the top of your Deck, face-down; draw 2 cards."
);

// ============================================================================
// ICONIC TRAP CARDS
// ============================================================================

/**
 * Mirror Force - Destroy all opponent's attack position monsters when attacked
 */
export const MIRROR_FORCE: JsonAbility = simpleAbility(
  {
    type: "destroy",
    trigger: "on_battle_attacked",
    target: TARGETS.all(
      CONDITIONS.and(CONDITIONS.opponentMonster(), CONDITIONS.inAttackPosition()),
      "board"
    ),
    spellSpeed: 2,
  },
  "When an opponent's monster declares an attack: Destroy all your opponent's Attack Position monsters."
);

/**
 * Solemn Judgment - Negate summon or spell/trap, pay half LP
 */
export const SOLEMN_JUDGMENT: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.withCost(
    EFFECT_TEMPLATES.counterTrap(),
    { type: "pay_lp", value: 4000 } // Simplified from "half LP"
  ),
  "When a monster would be Summoned, OR when a Spell/Trap Card is activated: Pay half your LP; negate the Summon or activation, and destroy that card."
);

/**
 * Torrential Tribute - Destroy all monsters when something is summoned
 */
export const TORRENTIAL_TRIBUTE: JsonAbility = simpleAbility(
  {
    type: "destroy",
    trigger: "on_summon",
    target: TARGETS.all(CONDITIONS.cardType("monster"), "board"),
    spellSpeed: 2,
  },
  "When a monster is Summoned: Destroy all monsters on the field."
);

/**
 * Compulsory Evacuation Device - Return 1 monster to hand
 */
export const COMPULSORY_EVACUATION_DEVICE: JsonAbility = simpleAbility(
  {
    type: "toHand",
    trigger: "manual",
    target: TARGETS.count(1, CONDITIONS.cardType("monster"), "board"),
    spellSpeed: 2,
  },
  "Target 1 monster on the field; return it to the hand."
);

/**
 * Magic Cylinder - Negate attack and burn opponent
 */
export const MAGIC_CYLINDER: JsonAbility = buildAbility(
  [
    {
      type: "negate",
      trigger: "on_battle_attacked",
      negateType: "effect", // Negates the attack
      spellSpeed: 2,
    },
    {
      type: "damage",
      trigger: "on_battle_attacked",
      value: 0, // Would need to reference attacker's ATK
      targetOwner: "opponent",
      description: "Inflict damage equal to attacker's ATK",
    },
  ],
  "When an opponent's monster declares an attack: Target the attacking monster; negate the attack, and inflict damage to your opponent equal to its ATK."
);

// ============================================================================
// MONSTER EFFECTS - Trigger Effects
// ============================================================================

/**
 * Sangan - Search when destroyed
 * Classic searcher for low-ATK monsters
 */
export const SANGAN: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.searchOnDestroy(
    CONDITIONS.and(CONDITIONS.cardType("monster"), CONDITIONS.attackAtMost(1500))
  ),
  "If this card is sent from the field to the GY: Add 1 monster with 1500 or less ATK from your Deck to your hand."
);

/**
 * Witch of the Black Forest - Search when destroyed (by DEF)
 */
export const WITCH_OF_THE_BLACK_FOREST: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.searchOnDestroy(
    CONDITIONS.and(CONDITIONS.cardType("monster"), CONDITIONS.defenseAtMost(1500))
  ),
  "If this card is sent from the field to the GY: Add 1 monster with 1500 or less DEF from your Deck to your hand."
);

/**
 * Card Trooper - Mill on summon, draw on destroy
 */
export const CARD_TROOPER: JsonAbility = buildAbility(
  [
    {
      type: "mill",
      trigger: "on_summon",
      value: 3,
      targetOwner: "self",
      then: EFFECT_TEMPLATES.boostATK(1500, "turn"),
    },
    EFFECT_TEMPLATES.draw(1, "on_destroy"),
  ],
  "Once per turn: You can send up to 3 cards from the top of your Deck to the GY, then this card gains 500 ATK for each card sent, until the End Phase. If this card is destroyed: Draw 1 card."
);

/**
 * Mystic Tomato - Summon from deck when destroyed by battle
 */
export const MYSTIC_TOMATO: JsonAbility = simpleAbility(
  {
    type: "summon",
    trigger: "on_battle_destroy",
    summonFrom: "deck",
    searchCondition: CONDITIONS.and(
      CONDITIONS.cardType("monster"),
      CONDITIONS.attackAtMost(1500),
      CONDITIONS.archetype("shadow_assassins") // Dark attribute equivalent
    ),
  },
  "When this card is destroyed by battle and sent to the GY: Special Summon 1 DARK monster with 1500 or less ATK from your Deck, in Attack Position."
);

// ============================================================================
// MONSTER EFFECTS - Continuous/Passive Effects
// ============================================================================

/**
 * Jinzo - Negate all traps
 */
export const JINZO: JsonAbility = simpleAbility(
  {
    type: "negate",
    trigger: "manual",
    negateType: "effect",
    isContinuous: true,
    target: TARGETS.all(CONDITIONS.cardType("trap")),
    description: "Trap Cards cannot be activated. Negate all Trap effects.",
  },
  "Trap Cards cannot be activated. Negate all Trap effects on the field."
);

/**
 * Marauding Captain - Cannot be targeted, summon on summon
 */
export const MARAUDING_CAPTAIN: JsonAbility = buildAbility(
  [
    {
      type: "summon",
      trigger: "on_summon",
      summonFrom: "hand",
      searchCondition: CONDITIONS.and(CONDITIONS.cardType("monster"), CONDITIONS.levelAtMost(4)),
    },
    EFFECT_TEMPLATES.grantProtection({ cannotBeTargeted: true }),
  ],
  "When this card is Summoned: Special Summon 1 Level 4 or lower monster from your hand. Cannot be targeted by opponent's effects."
);

/**
 * Spirit Reaper - Cannot be destroyed by battle, can attack directly
 */
export const SPIRIT_REAPER: JsonAbility = buildAbility(
  [
    EFFECT_TEMPLATES.battleImmune(),
    EFFECT_TEMPLATES.directAttack(),
    {
      type: "discard",
      trigger: "on_battle_damage",
      value: 1,
      targetOwner: "opponent",
      description: "Random discard when dealing battle damage",
    },
  ],
  "Cannot be destroyed by battle. Can attack directly. When this card inflicts Battle Damage: Your opponent discards 1 random card."
);

/**
 * Marshmallon - Cannot be destroyed by battle, burn when attacked
 */
export const MARSHMALLON: JsonAbility = buildAbility(
  [EFFECT_TEMPLATES.battleImmune(), EFFECT_TEMPLATES.burnOnTrigger(1000, "on_battle_attacked")],
  "Cannot be destroyed by battle. When this card is attacked while face-down: Inflict 1000 damage to the attacking player."
);

// ============================================================================
// ARCHETYPE SUPPORT CARDS
// ============================================================================

/**
 * Dragon's Rage - Piercing damage for dragons
 */
export const DRAGONS_RAGE: JsonAbility = simpleAbility(
  {
    type: "damage",
    trigger: "manual",
    isContinuous: true,
    statCondition: CONDITIONS.archetype("infernal_dragons"),
    description: "Dragon monsters inflict piercing damage",
  },
  "All Dragon-Type monsters you control inflict piercing battle damage."
);

/**
 * Infernal Dragon Field Spell - ATK boost for archetype
 */
export const INFERNAL_DRAGON_SANCTUARY: JsonAbility = buildAbility(
  [
    EFFECT_TEMPLATES.archetypeATKBoost("infernal_dragons", 500),
    EFFECT_TEMPLATES.oncePerTurn(
      EFFECT_TEMPLATES.searchDeck(CONDITIONS.archetypeMonster("infernal_dragons"))
    ),
  ],
  "All 'Infernal Dragon' monsters you control gain 500 ATK. Once per turn: Add 1 'Infernal Dragon' monster from your Deck to your hand."
);

/**
 * Celestial Guardian's Blessing - Protection for archetype
 */
export const CELESTIAL_GUARDIANS_BLESSING: JsonAbility = simpleAbility(
  {
    type: "modifyATK",
    trigger: "manual",
    value: 0,
    isContinuous: true,
    statCondition: CONDITIONS.archetype("celestial_guardians"),
    protection: {
      cannotBeDestroyedByEffects: true,
    },
    description: "Celestial Guardian monsters cannot be destroyed by effects",
  },
  "All 'Celestial Guardian' monsters you control cannot be destroyed by card effects."
);

/**
 * Shadow Assassin's Strike - Quick effect destroy
 */
export const SHADOW_ASSASSINS_STRIKE: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.withCost(
    {
      ...EFFECT_TEMPLATES.destroyTarget(1),
      spellSpeed: 2,
      isOPT: true,
    },
    COSTS.tribute(1, CONDITIONS.archetype("shadow_assassins"))
  ),
  "Quick Effect: Tribute 1 'Shadow Assassin' monster; destroy 1 card your opponent controls."
);

// ============================================================================
// COMPLEX MULTI-EFFECT CARDS
// ============================================================================

/**
 * Dark Armed Dragon - Banish to destroy
 * Can only be summoned with exactly 3 DARK monsters in GY
 */
export const DARK_ARMED_DRAGON: JsonAbility = buildAbility(
  [
    {
      type: "summon",
      trigger: "manual",
      activationCondition: CONDITIONS.hasCardsInGraveyard(3, {
        cardType: "monster",
        archetype: "shadow_assassins",
      }),
      description: "Can only be Special Summoned with exactly 3 DARK monsters in your GY",
    },
    EFFECT_TEMPLATES.withCost(
      EFFECT_TEMPLATES.destroyTarget(1),
      COSTS.banish(1, "graveyard", CONDITIONS.archetype("shadow_assassins"))
    ),
  ],
  "Cannot be Normal Summoned/Set. Must be Special Summoned while you have exactly 3 DARK monsters in your GY. You can banish 1 DARK monster from your GY; destroy 1 card on the field."
);

/**
 * Judgment Dragon - Pay 1000 LP to destroy everything
 */
export const JUDGMENT_DRAGON: JsonAbility = buildAbility(
  [
    {
      type: "summon",
      trigger: "manual",
      activationCondition: CONDITIONS.hasCardsInGraveyard(4, { archetype: "celestial_guardians" }),
      description: "Requires 4 Lightsworn monsters in GY to summon",
    },
    EFFECT_TEMPLATES.withCost(
      {
        type: "destroy",
        trigger: "manual",
        target: TARGETS.all(undefined, "board"), // Destroy everything
      },
      COSTS.payLP(1000)
    ),
  ],
  "Cannot be Normal Summoned/Set. Must be Special Summoned while you have 4 or more 'Celestial Guardian' monsters in your GY. Pay 1000 LP: Destroy all other cards on the field."
);

/**
 * Chaos Emperor Dragon - Envoy of the End
 * Send all cards to GY, burn for each
 */
export const CHAOS_EMPEROR_DRAGON: JsonAbility = buildAbility(
  [
    {
      type: "summon",
      trigger: "manual",
      activationCondition: CONDITIONS.and(
        CONDITIONS.hasCardsInGraveyard(1, { archetype: "celestial_guardians" }),
        CONDITIONS.hasCardsInGraveyard(1, { archetype: "shadow_assassins" })
      ),
      description: "Banish 1 LIGHT and 1 DARK monster from GY to summon",
    },
    EFFECT_TEMPLATES.withCost(
      EFFECT_TEMPLATES.chain(
        {
          type: "toGraveyard",
          trigger: "manual",
          target: TARGETS.all(), // Send all cards to GY
        },
        {
          type: "damage",
          trigger: "manual",
          value: 0, // Would calculate based on cards sent
          targetOwner: "opponent",
          description: "Damage based on cards sent",
        }
      ),
      COSTS.payLP(1000)
    ),
  ],
  "Pay 1000 LP: Send all cards in both players' hands and on the field to the GY, then inflict 300 damage to your opponent for each card sent."
);

// ============================================================================
// UTILITY / HAND TRAP STYLE CARDS
// ============================================================================

/**
 * Effect Veiler - Negate monster effect
 */
export const EFFECT_VEILER: JsonAbility = simpleAbility(
  EFFECT_TEMPLATES.withCost(
    {
      type: "negate",
      trigger: "manual",
      negateType: "effect",
      target: TARGETS.opponent(1, CONDITIONS.cardType("monster")),
      duration: "turn",
      spellSpeed: 2,
    },
    COSTS.discard(1, CONDITIONS.nameExact("Effect Veiler")) // Discard itself
  ),
  "During your opponent's Main Phase: You can send this card from your hand to the GY, then target 1 Effect Monster your opponent controls; negate that monster's effects until the End Phase."
);

/**
 * Honest - Battle trick ATK boost
 */
export const HONEST: JsonAbility = simpleAbility(
  {
    type: "modifyATK",
    trigger: "on_battle_start",
    value: 0, // Would need to reference opponent's ATK
    duration: "until_end_of_battle",
    statTarget: "self",
    spellSpeed: 2,
    description: "Boost ATK equal to opponent's ATK during damage calculation",
    cost: COSTS.discard(1, CONDITIONS.nameExact("Honest")),
  },
  "During the Damage Step: You can send this card from your hand to the GY; target 1 LIGHT monster you control that is battling; it gains ATK equal to the attacking monster's ATK."
);

/**
 * Kuriboh - Negate battle damage
 */
export const KURIBOH: JsonAbility = simpleAbility(
  {
    type: "negate",
    trigger: "on_battle_attacked",
    negateType: "effect", // Negates battle damage
    spellSpeed: 2,
    cost: COSTS.discard(1, CONDITIONS.nameExact("Kuriboh")),
    description: "Negate battle damage this turn",
  },
  "When an opponent's monster declares a direct attack while this card is in your hand: You can discard this card; you take no Battle Damage this turn."
);

// ============================================================================
// EXPORT ALL EXAMPLE CARDS
// ============================================================================

export const EXAMPLE_CARDS = {
  // Spells
  POT_OF_GREED,
  RAIGEKI,
  DARK_HOLE,
  MONSTER_REBORN,
  CARD_DESTRUCTION,
  MYSTICAL_SPACE_TYPHOON,
  FOOLISH_BURIAL,
  UPSTART_GOBLIN,
  POT_OF_DESIRES,

  // Traps
  MIRROR_FORCE,
  SOLEMN_JUDGMENT,
  TORRENTIAL_TRIBUTE,
  COMPULSORY_EVACUATION_DEVICE,
  MAGIC_CYLINDER,

  // Monster Effects - Triggers
  SANGAN,
  WITCH_OF_THE_BLACK_FOREST,
  CARD_TROOPER,
  MYSTIC_TOMATO,

  // Monster Effects - Continuous
  JINZO,
  MARAUDING_CAPTAIN,
  SPIRIT_REAPER,
  MARSHMALLON,

  // Archetype Support
  DRAGONS_RAGE,
  INFERNAL_DRAGON_SANCTUARY,
  CELESTIAL_GUARDIANS_BLESSING,
  SHADOW_ASSASSINS_STRIKE,

  // Complex Multi-Effect
  DARK_ARMED_DRAGON,
  JUDGMENT_DRAGON,
  CHAOS_EMPEROR_DRAGON,

  // Hand Traps
  EFFECT_VEILER,
  HONEST,
  KURIBOH,
} as const;

/**
 * Get example card by name (case-insensitive)
 */
export function getExampleCard(name: string): JsonAbility | undefined {
  const normalizedName = name.toUpperCase().replace(/[^A-Z]/g, "_");
  return EXAMPLE_CARDS[normalizedName as keyof typeof EXAMPLE_CARDS];
}

/**
 * List all available example card names
 */
export function listExampleCards(): string[] {
  return Object.keys(EXAMPLE_CARDS);
}
