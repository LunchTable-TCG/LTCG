/**
 * Effect Library - Pre-defined JSON effect templates
 *
 * Provides type-safe builder functions for creating card effects.
 * These templates standardize effect creation and ensure consistency
 * across all card definitions.
 *
 * Usage:
 * ```typescript
 * import { EFFECT_TEMPLATES, CONDITIONS, COSTS } from "./effectLibrary";
 *
 * const myCardEffects = [
 *   EFFECT_TEMPLATES.draw(2),
 *   EFFECT_TEMPLATES.destroyTarget(1, CONDITIONS.cardType("stereotype")),
 * ];
 * ```
 */

import type {
  ArchetypeId,
  CardRarity,
  CardTypeFilter,
  EffectDuration,
  JsonAbility,
  JsonCondition,
  JsonCost,
  JsonEffect,
  JsonProtection,
  JsonTarget,
  NumericRange,
  TargetOwner,
  TriggerCondition,
  ZoneLocation,
} from "./types";

// ============================================================================
// CONDITION HELPERS - Build conditions for targeting and filtering
// ============================================================================

export const CONDITIONS = {
  // -------------------------------------------------------------------------
  // Card Attribute Conditions
  // -------------------------------------------------------------------------

  /**
   * Match cards by archetype
   * @example CONDITIONS.archetype("dropout")
   */
  archetype: (archetype: ArchetypeId | ArchetypeId[]): JsonCondition => ({
    archetype: Array.isArray(archetype) ? archetype : archetype,
  }),

  /**
   * Match cards by card type
   * @example CONDITIONS.cardType("stereotype")
   */
  cardType: (cardType: CardTypeFilter | CardTypeFilter[]): JsonCondition => ({
    cardType,
  }),

  /**
   * Match cards by rarity
   * @example CONDITIONS.rarity("legendary")
   */
  rarity: (rarity: CardRarity | CardRarity[]): JsonCondition => ({
    rarity,
  }),

  // -------------------------------------------------------------------------
  // Stat-Based Conditions
  // -------------------------------------------------------------------------

  /**
   * Match cards with level/cost in range
   * @example CONDITIONS.levelRange(1, 4) // Levels 1-4
   */
  levelRange: (min: number, max: number): JsonCondition => ({
    level: { min, max },
  }),

  /**
   * Match cards with exact level/cost
   * @example CONDITIONS.levelExact(4)
   */
  levelExact: (level: number): JsonCondition => ({
    level: { exact: level },
  }),

  /**
   * Match cards with level/cost at most
   * @example CONDITIONS.levelAtMost(4) // Level 4 or lower
   */
  levelAtMost: (max: number): JsonCondition => ({
    level: { max },
  }),

  /**
   * Match cards with level/cost at least
   * @example CONDITIONS.levelAtLeast(5) // Level 5 or higher
   */
  levelAtLeast: (min: number): JsonCondition => ({
    level: { min },
  }),

  /**
   * Match cards with ATK in range
   * @example CONDITIONS.attackRange(0, 1500)
   */
  attackRange: (min: number, max: number): JsonCondition => ({
    attack: { min, max },
  }),

  /**
   * Match cards with ATK at most
   * @example CONDITIONS.attackAtMost(1500) // 1500 ATK or less
   */
  attackAtMost: (max: number): JsonCondition => ({
    attack: { max },
  }),

  /**
   * Match cards with ATK at least
   * @example CONDITIONS.attackAtLeast(2000) // 2000 ATK or more
   */
  attackAtLeast: (min: number): JsonCondition => ({
    attack: { min },
  }),

  /**
   * Match cards with DEF in range
   * @example CONDITIONS.defenseRange(0, 1000)
   */
  defenseRange: (min: number, max: number): JsonCondition => ({
    defense: { min, max },
  }),

  /**
   * Match cards with DEF at most
   * @example CONDITIONS.defenseAtMost(1000)
   */
  defenseAtMost: (max: number): JsonCondition => ({
    defense: { max },
  }),

  /**
   * Match cards with DEF at least
   * @example CONDITIONS.defenseAtLeast(2000)
   */
  defenseAtLeast: (min: number): JsonCondition => ({
    defense: { min },
  }),

  // -------------------------------------------------------------------------
  // Ownership & Location Conditions
  // -------------------------------------------------------------------------

  /**
   * Match cards owned by specific player
   * @example CONDITIONS.ownedBy("opponent")
   */
  ownedBy: (owner: TargetOwner): JsonCondition => ({
    targetOwner: owner,
  }),

  /**
   * Match cards in specific location
   * @example CONDITIONS.inLocation("graveyard")
   */
  inLocation: (location: ZoneLocation | ZoneLocation[]): JsonCondition => ({
    location,
  }),

  /**
   * Match face-down cards
   */
  faceDown: (): JsonCondition => ({
    isFaceDown: true,
  }),

  /**
   * Match face-up cards
   */
  faceUp: (): JsonCondition => ({
    isFaceDown: false,
  }),

  /**
   * Match stereotypes in attack position
   */
  inAttackPosition: (): JsonCondition => ({
    position: "attack",
  }),

  /**
   * Match stereotypes in defense position
   */
  inDefensePosition: (): JsonCondition => ({
    position: "defense",
  }),

  // -------------------------------------------------------------------------
  // Game State Conditions
  // -------------------------------------------------------------------------

  /**
   * Check if LP is below threshold
   * @example CONDITIONS.lpBelow(2000)
   */
  lpBelow: (value: number): JsonCondition => ({
    lpBelow: value,
  }),

  /**
   * Check if LP is above threshold
   * @example CONDITIONS.lpAbove(4000)
   */
  lpAbove: (value: number): JsonCondition => ({
    lpAbove: value,
  }),

  /**
   * Check graveyard contents
   * @example CONDITIONS.hasCardsInGraveyard(3) // At least 3 cards
   */
  hasCardsInGraveyard: (count: number, filter?: Partial<JsonCondition>): JsonCondition => ({
    graveyardContains: {
      count: { min: count },
      ...(filter?.cardType && { cardType: filter.cardType as CardTypeFilter }),
      ...(filter?.archetype && {
        archetype: (Array.isArray(filter.archetype) ? filter.archetype[0] : filter.archetype) as
          | ArchetypeId
          | undefined,
      }),
    },
  }),

  /**
   * Check hand size
   * @example CONDITIONS.handSize({ min: 0, max: 2 })
   */
  handSize: (range: NumericRange): JsonCondition => ({
    handSize: range,
  }),

  /**
   * Check board count
   * @example CONDITIONS.boardCount({ min: 3 })
   */
  boardCount: (range: NumericRange): JsonCondition => ({
    boardCount: range,
  }),

  /**
   * Opponent has no stereotypes on board
   */
  opponentHasNoMonsters: (): JsonCondition => ({
    opponentHasNoMonsters: true,
  }),

  /**
   * You control no stereotypes
   */
  controlsNoMonsters: (): JsonCondition => ({
    controlsNoMonsters: true,
  }),

  /**
   * No stereotypes in attack position (for direct attack conditions)
   */
  noMonstersInAttackPosition: (): JsonCondition => ({
    hasNoMonstersInAttackPosition: true,
  }),

  // -------------------------------------------------------------------------
  // Name-Based Conditions
  // -------------------------------------------------------------------------

  /**
   * Match cards with name containing text
   * @example CONDITIONS.nameContains("Dragon")
   */
  nameContains: (text: string): JsonCondition => ({
    nameContains: text,
  }),

  /**
   * Match cards with exact name
   * @example CONDITIONS.nameExact("Blue-Eyes White Dragon")
   */
  nameExact: (name: string): JsonCondition => ({
    nameExact: name,
  }),

  // -------------------------------------------------------------------------
  // Logical Operators
  // -------------------------------------------------------------------------

  /**
   * Combine conditions with AND logic
   * @example CONDITIONS.and(CONDITIONS.cardType("stereotype"), CONDITIONS.attackAtMost(1500))
   */
  and: (...conditions: JsonCondition[]): JsonCondition => ({
    type: "and",
    conditions,
  }),

  /**
   * Combine conditions with OR logic
   * @example CONDITIONS.or(CONDITIONS.cardType("spell"), CONDITIONS.cardType("trap"))
   */
  or: (...conditions: JsonCondition[]): JsonCondition => ({
    type: "or",
    conditions,
  }),

  // -------------------------------------------------------------------------
  // Composite Conditions (Common Patterns)
  // -------------------------------------------------------------------------

  /**
   * Match opponent's stereotypes on board
   */
  opponentMonster: (): JsonCondition =>
    CONDITIONS.and(CONDITIONS.cardType("stereotype"), CONDITIONS.ownedBy("opponent")),

  /**
   * Match your stereotypes on board
   */
  yourMonster: (): JsonCondition =>
    CONDITIONS.and(CONDITIONS.cardType("stereotype"), CONDITIONS.ownedBy("self")),

  /**
   * Match any stereotype on board
   */
  anyMonster: (): JsonCondition => CONDITIONS.cardType("stereotype"),

  /**
   * Match low-level stereotypes (commonly used for searching)
   * @example CONDITIONS.lowLevelMonster(4) // Level 4 or lower
   */
  lowLevelMonster: (maxLevel = 4): JsonCondition =>
    CONDITIONS.and(CONDITIONS.cardType("stereotype"), CONDITIONS.levelAtMost(maxLevel)),

  /**
   * Match high-level stereotypes
   * @example CONDITIONS.highLevelMonster(7) // Level 7 or higher
   */
  highLevelMonster: (minLevel = 7): JsonCondition =>
    CONDITIONS.and(CONDITIONS.cardType("stereotype"), CONDITIONS.levelAtLeast(minLevel)),

  /**
   * Match archetype stereotypes
   * @example CONDITIONS.archetypeMonster("dropout")
   */
  archetypeMonster: (archetype: ArchetypeId): JsonCondition =>
    CONDITIONS.and(CONDITIONS.cardType("stereotype"), CONDITIONS.archetype(archetype)),

  /**
   * Match spell/trap cards
   */
  spellOrTrap: (): JsonCondition => CONDITIONS.cardType(["spell", "trap"]),
} as const;

// ============================================================================
// COST HELPERS - Build activation costs for effects
// ============================================================================

export const COSTS = {
  /**
   * Discard card(s) from hand
   * @example COSTS.discard(1) // Discard 1 card
   * @example COSTS.discard(2, CONDITIONS.cardType("stereotype")) // Discard 2 stereotypes
   */
  discard: (count: number, condition?: JsonCondition): JsonCost => ({
    type: "discard",
    value: count,
    ...(condition && { condition }),
    from: "hand",
  }),

  /**
   * Pay life points
   * @example COSTS.payLP(1000)
   */
  payLP: (amount: number): JsonCost => ({
    type: "pay_lp",
    value: amount,
  }),

  /**
   * Tribute stereotype(s) from board
   * @example COSTS.tribute(1) // Tribute 1 stereotype
   * @example COSTS.tribute(2, CONDITIONS.archetype("dropout"))
   */
  tribute: (count: number, condition?: JsonCondition): JsonCost => ({
    type: "tribute",
    value: count,
    ...(condition && { condition }),
    from: "board",
  }),

  /**
   * Banish card(s) from specified location
   * @example COSTS.banish(1, "graveyard") // Banish 1 from GY
   * @example COSTS.banish(2, "hand", CONDITIONS.cardType("spell"))
   */
  banish: (count: number, from: ZoneLocation, condition?: JsonCondition): JsonCost => ({
    type: "banish",
    value: count,
    from,
    ...(condition && { condition }),
  }),

  /**
   * Send card(s) to graveyard from specified location
   * @example COSTS.sendToGY(1, "deck")
   */
  sendToGY: (count: number, from: ZoneLocation, condition?: JsonCondition): JsonCost => ({
    type: "send_to_gy",
    value: count,
    from,
    ...(condition && { condition }),
  }),

  /**
   * Return card(s) to deck
   * @example COSTS.returnToDeck(1, "hand")
   */
  returnToDeck: (count: number, from: ZoneLocation, condition?: JsonCondition): JsonCost => ({
    type: "return_to_deck",
    value: count,
    from,
    ...(condition && { condition }),
  }),
} as const;

// ============================================================================
// TARGET HELPERS - Build target specifications for effects
// ============================================================================

export const TARGETS = {
  /**
   * Target specific number of cards
   * @example TARGETS.count(1, CONDITIONS.opponentMonster())
   */
  count: (count: number, condition?: JsonCondition, location?: ZoneLocation): JsonTarget => ({
    count,
    ...(condition && { condition }),
    ...(location && { location }),
    selection: "player_choice",
  }),

  /**
   * Target all cards matching condition
   * @example TARGETS.all(CONDITIONS.opponentMonster())
   */
  all: (condition?: JsonCondition, location?: ZoneLocation): JsonTarget => ({
    count: "all",
    selection: "all_matching",
    ...(condition && { condition }),
    ...(location && { location }),
  }),

  /**
   * Random targets matching condition
   * @example TARGETS.random(1, CONDITIONS.cardType("stereotype"))
   */
  random: (count: number, condition?: JsonCondition, location?: ZoneLocation): JsonTarget => ({
    count,
    selection: "random",
    ...(condition && { condition }),
    ...(location && { location }),
  }),

  /**
   * Target with min/max range
   * @example TARGETS.range(1, 3, CONDITIONS.cardType("stereotype"))
   */
  range: (
    min: number,
    max: number,
    condition?: JsonCondition,
    location?: ZoneLocation
  ): JsonTarget => ({
    min,
    max,
    selection: "player_choice",
    ...(condition && { condition }),
    ...(location && { location }),
  }),

  /**
   * Target opponent's cards
   * @example TARGETS.opponent(1, CONDITIONS.cardType("stereotype"))
   */
  opponent: (count: number, condition?: JsonCondition): JsonTarget => ({
    count,
    owner: "opponent",
    location: "board",
    selection: "player_choice",
    ...(condition && { condition }),
  }),

  /**
   * Target your own cards
   * @example TARGETS.self(1, CONDITIONS.cardType("stereotype"))
   */
  self: (count: number, condition?: JsonCondition, location?: ZoneLocation): JsonTarget => ({
    count,
    owner: "self",
    location: location ?? "board",
    selection: "player_choice",
    ...(condition && { condition }),
  }),
} as const;

// ============================================================================
// EFFECT TEMPLATES - Pre-defined effect builders
// ============================================================================

export const EFFECT_TEMPLATES = {
  // -------------------------------------------------------------------------
  // DRAW EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Draw cards
   * @example EFFECT_TEMPLATES.draw(2) // Draw 2 cards
   * @example EFFECT_TEMPLATES.draw(1, "on_summon") // Draw 1 when summoned
   */
  draw: (count: number, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "draw",
    trigger,
    value: count,
  }),

  /**
   * Draw cards with a cost
   * @example EFFECT_TEMPLATES.drawWithCost(2, COSTS.discard(1))
   */
  drawWithCost: (
    count: number,
    cost: JsonCost,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "draw",
    trigger,
    value: count,
    cost,
  }),

  /**
   * Conditional draw (only if condition is met)
   * @example EFFECT_TEMPLATES.drawConditional(2, CONDITIONS.lpBelow(2000))
   */
  drawConditional: (
    count: number,
    condition: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "draw",
    trigger,
    value: count,
    activationCondition: condition,
  }),

  // -------------------------------------------------------------------------
  // DESTROY EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Destroy target card(s)
   * @example EFFECT_TEMPLATES.destroyTarget(1) // Destroy 1 card
   * @example EFFECT_TEMPLATES.destroyTarget(2, CONDITIONS.opponentMonster())
   */
  destroyTarget: (
    count: number,
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "destroy",
    trigger,
    target: TARGETS.count(count, condition, "board"),
  }),

  /**
   * Destroy all cards matching condition
   * @example EFFECT_TEMPLATES.destroyAll(CONDITIONS.cardType("stereotype"))
   */
  destroyAll: (condition?: JsonCondition, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "destroy",
    trigger,
    target: TARGETS.all(condition, "board"),
  }),

  /**
   * Destroy all opponent's stereotypes
   */
  destroyAllOpponentMonsters: (trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "destroy",
    trigger,
    target: TARGETS.all(CONDITIONS.opponentMonster(), "board"),
  }),

  /**
   * Destroy all stereotypes
   */
  destroyAllMonsters: (trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "destroy",
    trigger,
    target: TARGETS.all(CONDITIONS.cardType("stereotype"), "board"),
  }),

  /**
   * Destroy with cost
   * @example EFFECT_TEMPLATES.destroyWithCost(1, COSTS.tribute(1))
   */
  destroyWithCost: (
    count: number,
    cost: JsonCost,
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "destroy",
    trigger,
    target: TARGETS.count(count, condition, "board"),
    cost,
  }),

  // -------------------------------------------------------------------------
  // DAMAGE EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Deal damage to opponent
   * @example EFFECT_TEMPLATES.dealDamage(500)
   */
  dealDamage: (amount: number, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "damage",
    trigger,
    value: amount,
    targetOwner: "opponent",
  }),

  /**
   * Deal damage to self
   * @example EFFECT_TEMPLATES.dealDamageToSelf(1000)
   */
  dealDamageToSelf: (amount: number, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "damage",
    trigger,
    value: amount,
    targetOwner: "self",
  }),

  /**
   * Burn damage on trigger
   * @example EFFECT_TEMPLATES.burnOnTrigger(200, "on_opponent_summon")
   */
  burnOnTrigger: (amount: number, trigger: TriggerCondition): JsonEffect => ({
    type: "damage",
    trigger,
    value: amount,
    targetOwner: "opponent",
    isContinuous: true,
  }),

  // -------------------------------------------------------------------------
  // LIFE POINT EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Gain life points
   * @example EFFECT_TEMPLATES.gainLP(1000)
   */
  gainLP: (amount: number, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "gainLP",
    trigger,
    value: amount,
  }),

  /**
   * Gain LP on trigger (continuous)
   * @example EFFECT_TEMPLATES.gainLPOnTrigger(500, "on_end")
   */
  gainLPOnTrigger: (amount: number, trigger: TriggerCondition): JsonEffect => ({
    type: "gainLP",
    trigger,
    value: amount,
    isContinuous: true,
  }),

  // -------------------------------------------------------------------------
  // STAT MODIFICATION EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Boost ATK of target(s)
   * @example EFFECT_TEMPLATES.boostATK(500, "turn") // Boost 500 ATK until end of turn
   */
  boostATK: (
    amount: number,
    duration: EffectDuration = "turn",
    target?: JsonTarget,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "modifyATK",
    trigger,
    value: amount,
    duration,
    ...(target && { target }),
  }),

  /**
   * Reduce ATK of target(s)
   * @example EFFECT_TEMPLATES.reduceATK(500, TARGETS.opponent(1))
   */
  reduceATK: (
    amount: number,
    target?: JsonTarget,
    duration: EffectDuration = "turn",
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "modifyATK",
    trigger,
    value: -amount,
    duration,
    ...(target && { target }),
  }),

  /**
   * Boost DEF of target(s)
   * @example EFFECT_TEMPLATES.boostDEF(500, "turn")
   */
  boostDEF: (
    amount: number,
    duration: EffectDuration = "turn",
    target?: JsonTarget,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "modifyDEF",
    trigger,
    value: amount,
    duration,
    ...(target && { target }),
  }),

  /**
   * Continuous ATK boost for archetype
   * @example EFFECT_TEMPLATES.archetypeATKBoost("dropout", 300)
   */
  archetypeATKBoost: (archetype: ArchetypeId, amount: number): JsonEffect => ({
    type: "modifyATK",
    trigger: "manual",
    value: amount,
    isContinuous: true,
    statCondition: CONDITIONS.archetypeMonster(archetype),
    statTarget: "all_matching",
    duration: "permanent",
  }),

  /**
   * Field spell style ATK boost
   * @example EFFECT_TEMPLATES.fieldBoostATK(500, CONDITIONS.archetype("dropout"))
   */
  fieldBoostATK: (amount: number, condition: JsonCondition): JsonEffect => ({
    type: "modifyATK",
    trigger: "manual",
    value: amount,
    isContinuous: true,
    statCondition: condition,
    statTarget: "all_matching",
    duration: "permanent",
  }),

  // -------------------------------------------------------------------------
  // SEARCH EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Search deck for card matching condition
   * @example EFFECT_TEMPLATES.searchDeck(CONDITIONS.archetypeMonster("dropout"))
   */
  searchDeck: (condition: JsonCondition, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "search",
    trigger,
    targetLocation: "deck",
    searchCondition: condition,
    sendTo: "hand",
  }),

  /**
   * Search with cost
   * @example EFFECT_TEMPLATES.searchWithCost(CONDITIONS.cardType("stereotype"), COSTS.discard(1))
   */
  searchWithCost: (
    condition: JsonCondition,
    cost: JsonCost,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "search",
    trigger,
    targetLocation: "deck",
    searchCondition: condition,
    sendTo: "hand",
    cost,
  }),

  /**
   * On-destroy search effect (Sangan-style)
   * @example EFFECT_TEMPLATES.searchOnDestroy(CONDITIONS.attackAtMost(1500))
   */
  searchOnDestroy: (condition: JsonCondition): JsonEffect => ({
    type: "search",
    trigger: "on_destroy",
    targetLocation: "deck",
    searchCondition: condition,
    sendTo: "hand",
  }),

  // -------------------------------------------------------------------------
  // SUMMON EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Special summon from location
   * @example EFFECT_TEMPLATES.specialSummon("graveyard")
   */
  specialSummon: (
    from: ZoneLocation,
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "summon",
    trigger,
    summonFrom: from,
    ...(condition && { searchCondition: condition }),
  }),

  /**
   * Special summon from hand
   * @example EFFECT_TEMPLATES.summonFromHand(CONDITIONS.levelAtMost(4))
   */
  summonFromHand: (
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "summon",
    trigger,
    summonFrom: "hand",
    ...(condition && { searchCondition: condition }),
  }),

  /**
   * Special summon from graveyard
   * @example EFFECT_TEMPLATES.summonFromGraveyard(CONDITIONS.cardType("stereotype"))
   */
  summonFromGraveyard: (
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "summon",
    trigger,
    summonFrom: "graveyard",
    ...(condition && { searchCondition: condition }),
  }),

  /**
   * Special summon from deck
   * @example EFFECT_TEMPLATES.summonFromDeck(CONDITIONS.levelAtMost(3))
   */
  summonFromDeck: (
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "summon",
    trigger,
    summonFrom: "deck",
    ...(condition && { searchCondition: condition }),
  }),

  // -------------------------------------------------------------------------
  // CARD MOVEMENT EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Add card from graveyard to hand
   * @example EFFECT_TEMPLATES.toHand("graveyard", CONDITIONS.cardType("spell"))
   */
  toHand: (
    from: ZoneLocation,
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "toHand",
    trigger,
    targetLocation: from,
    ...(condition && { searchCondition: condition }),
  }),

  /**
   * Send card to graveyard
   * @example EFFECT_TEMPLATES.toGraveyard(TARGETS.opponent(1, CONDITIONS.cardType("stereotype")))
   */
  toGraveyard: (target: JsonTarget, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "toGraveyard",
    trigger,
    target,
  }),

  /**
   * Banish card(s)
   * @example EFFECT_TEMPLATES.banish(TARGETS.count(1), "graveyard")
   */
  banish: (
    target: JsonTarget,
    from?: ZoneLocation,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "banish",
    trigger,
    target,
    ...(from && { targetLocation: from }),
  }),

  /**
   * Banish from graveyard
   * @example EFFECT_TEMPLATES.banishFromGraveyard(1, CONDITIONS.cardType("stereotype"))
   */
  banishFromGraveyard: (
    count: number,
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "banish",
    trigger,
    target: TARGETS.count(count, condition, "graveyard"),
  }),

  // -------------------------------------------------------------------------
  // MILL/DISCARD EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Mill cards from deck to graveyard
   * @example EFFECT_TEMPLATES.mill(3) // Mill 3 cards
   */
  mill: (
    count: number,
    targetOwner: TargetOwner = "self",
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "mill",
    trigger,
    value: count,
    targetOwner,
  }),

  /**
   * Force opponent to discard
   * @example EFFECT_TEMPLATES.forceDiscard(1)
   */
  forceDiscard: (count: number, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "discard",
    trigger,
    value: count,
    targetOwner: "opponent",
  }),

  /**
   * Discard from own hand (usually as effect, not cost)
   * @example EFFECT_TEMPLATES.discardSelf(1, "on_end")
   */
  discardSelf: (count: number, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "discard",
    trigger,
    value: count,
    targetOwner: "self",
  }),

  // -------------------------------------------------------------------------
  // NEGATION EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Negate activation of a card
   * @example EFFECT_TEMPLATES.negateActivation(CONDITIONS.cardType("spell"))
   */
  negateActivation: (
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "negate",
    trigger,
    negateType: "activation",
    spellSpeed: 2,
    ...(condition && { target: TARGETS.count(1, condition) }),
  }),

  /**
   * Negate activation and destroy
   * @example EFFECT_TEMPLATES.negateAndDestroy(CONDITIONS.spellOrTrap())
   */
  negateAndDestroy: (
    condition?: JsonCondition,
    trigger: TriggerCondition = "manual"
  ): JsonEffect => ({
    type: "negate",
    trigger,
    negateType: "activation",
    negateAndDestroy: true,
    spellSpeed: 2,
    ...(condition && { target: TARGETS.count(1, condition) }),
  }),

  /**
   * Negate effect only (not activation)
   * @example EFFECT_TEMPLATES.negateEffect(CONDITIONS.cardType("stereotype"))
   */
  negateEffect: (condition?: JsonCondition, trigger: TriggerCondition = "manual"): JsonEffect => ({
    type: "negate",
    trigger,
    negateType: "effect",
    spellSpeed: 2,
    ...(condition && { target: TARGETS.count(1, condition) }),
  }),

  /**
   * Counter trap - negate anything (spell speed 3)
   */
  counterTrap: (condition?: JsonCondition): JsonEffect => ({
    type: "negate",
    trigger: "manual",
    negateType: "activation",
    negateAndDestroy: true,
    spellSpeed: 3,
    ...(condition && { target: TARGETS.count(1, condition) }),
  }),

  // -------------------------------------------------------------------------
  // PASSIVE/CONTINUOUS EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Direct attack ability (conditional)
   * @example EFFECT_TEMPLATES.directAttack(CONDITIONS.opponentHasNoMonsters())
   */
  directAttack: (condition?: JsonCondition): JsonEffect => ({
    type: "directAttack",
    trigger: "manual",
    isContinuous: true,
    ...(condition && { activationCondition: condition }),
  }),

  /**
   * Multiple attacks per turn
   * @example EFFECT_TEMPLATES.multipleAttacks(2)
   */
  multipleAttacks: (attackCount = 2): JsonEffect => ({
    type: "multipleAttack",
    trigger: "manual",
    value: attackCount,
    isContinuous: true,
  }),

  /**
   * Grant protection to this card
   * @example EFFECT_TEMPLATES.grantProtection({ cannotBeDestroyedByBattle: true })
   */
  grantProtection: (protection: JsonProtection): JsonEffect => ({
    type: "modifyATK", // Placeholder type for protection-only effects
    trigger: "manual",
    value: 0,
    isContinuous: true,
    protection,
  }),

  /**
   * Cannot be destroyed by battle
   */
  battleImmune: (): JsonEffect =>
    EFFECT_TEMPLATES.grantProtection({ cannotBeDestroyedByBattle: true }),

  /**
   * Cannot be destroyed by effects
   */
  effectImmune: (): JsonEffect =>
    EFFECT_TEMPLATES.grantProtection({ cannotBeDestroyedByEffects: true }),

  /**
   * Cannot be targeted by opponent's effects
   */
  untargetable: (): JsonEffect => EFFECT_TEMPLATES.grantProtection({ cannotBeTargeted: true }),

  /**
   * Full protection (battle + effect immune)
   */
  fullProtection: (): JsonEffect =>
    EFFECT_TEMPLATES.grantProtection({
      cannotBeDestroyedByBattle: true,
      cannotBeDestroyedByEffects: true,
    }),

  // -------------------------------------------------------------------------
  // UTILITY / COMPLEX EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Once per turn effect wrapper
   * @example EFFECT_TEMPLATES.oncePerTurn(EFFECT_TEMPLATES.draw(1))
   */
  oncePerTurn: (effect: JsonEffect): JsonEffect => ({
    ...effect,
    isOPT: true,
  }),

  /**
   * Hard once per turn (by card name)
   * @example EFFECT_TEMPLATES.hardOPT(EFFECT_TEMPLATES.searchDeck(CONDITIONS.cardType("stereotype")))
   */
  hardOPT: (effect: JsonEffect): JsonEffect => ({
    ...effect,
    isHOPT: true,
  }),

  /**
   * Add cost to existing effect
   * @example EFFECT_TEMPLATES.withCost(EFFECT_TEMPLATES.draw(2), COSTS.discard(1))
   */
  withCost: (effect: JsonEffect, cost: JsonCost): JsonEffect => ({
    ...effect,
    cost,
  }),

  /**
   * Add multiple costs to existing effect
   * @example EFFECT_TEMPLATES.withCosts(effect, [COSTS.discard(1), COSTS.payLP(500)])
   */
  withCosts: (effect: JsonEffect, costs: JsonCost[]): JsonEffect => ({
    ...effect,
    costs,
  }),

  /**
   * Add activation condition to effect
   * @example EFFECT_TEMPLATES.withCondition(EFFECT_TEMPLATES.draw(3), CONDITIONS.lpBelow(1000))
   */
  withCondition: (effect: JsonEffect, condition: JsonCondition): JsonEffect => ({
    ...effect,
    activationCondition: condition,
  }),

  /**
   * Chain effects (do A, then B)
   * @example EFFECT_TEMPLATES.chain(EFFECT_TEMPLATES.destroyTarget(1), EFFECT_TEMPLATES.draw(1))
   */
  chain: (first: JsonEffect, then: JsonEffect): JsonEffect => ({
    ...first,
    then,
  }),
} as const;

// ============================================================================
// ABILITY BUILDER - Combine multiple effects into a complete ability
// ============================================================================

/**
 * Build a complete JSON ability from effects
 *
 * @example
 * const ability = buildAbility([
 *   EFFECT_TEMPLATES.draw(2),
 *   EFFECT_TEMPLATES.grantProtection({ cannotBeDestroyedByBattle: true }),
 * ], "Draw 2 cards. Cannot be destroyed by battle.");
 */
export function buildAbility(effects: JsonEffect[], abilityText?: string): JsonAbility {
  // Determine overall spell speed from effects
  const spellSpeeds = effects
    .map((e) => e.spellSpeed)
    .filter((s): s is 1 | 2 | 3 => s !== undefined);
  const maxSpellSpeed = spellSpeeds.length > 0 ? Math.max(...spellSpeeds) : undefined;

  return {
    effects,
    ...(abilityText && { abilityText }),
    ...(maxSpellSpeed && { spellSpeed: maxSpellSpeed as 1 | 2 | 3 }),
  };
}

/**
 * Create a simple single-effect ability
 *
 * @example
 * const ability = simpleAbility(EFFECT_TEMPLATES.draw(2), "Draw 2 cards.");
 */
export function simpleAbility(effect: JsonEffect, abilityText?: string): JsonAbility {
  return buildAbility([effect], abilityText);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { JsonAbility, JsonCondition, JsonCost, JsonEffect, JsonProtection, JsonTarget };
