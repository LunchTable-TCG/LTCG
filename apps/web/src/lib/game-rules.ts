/**
 * Game Rules - Single Source of Truth
 *
 * All educational content for LunchTable Card Game.
 * Used by: Rules Page, Tutorial, Tooltips
 */

// =============================================================================
// CORE GAME CONSTANTS
// =============================================================================

export const GAME_CONSTANTS = {
  STARTING_LIFE_POINTS: 8000,
  MIN_DECK_SIZE: 30,
  MAX_DECK_SIZE: 60,
  MAX_HAND_SIZE: 7,
  MAX_FIELD_CREATURES: 5,
  MAX_SPELL_TRAP_ZONES: 5,
  CARDS_DRAWN_PER_TURN: 1,
  NORMAL_SUMMONS_PER_TURN: 1,
  TRIBUTE_LEVEL_5_6: 1,
  TRIBUTE_LEVEL_7_PLUS: 2,
} as const;

// =============================================================================
// TURN PHASES
// =============================================================================

export type PhaseId = "draw" | "main1" | "battle" | "main2" | "end";

export interface PhaseInfo {
  id: PhaseId;
  name: string;
  shortDescription: string;
  fullDescription: string;
  allowedActions: string[];
  tips: string[];
}

export const TURN_PHASES: PhaseInfo[] = [
  {
    id: "draw",
    name: "Draw Phase",
    shortDescription: "Draw 1 card from your deck.",
    fullDescription:
      "At the start of your turn, draw 1 card from the top of your deck. The player going first skips their Draw Phase on their first turn.",
    allowedActions: ["Draw 1 card (automatic)"],
    tips: [
      "If your deck is empty and you need to draw, you lose the game.",
      "Some card effects can let you draw additional cards.",
    ],
  },
  {
    id: "main1",
    name: "Main Phase 1",
    shortDescription: "Summon creatures, activate spells, set cards.",
    fullDescription:
      "Your primary phase for playing cards. You can Normal Summon 1 creature, activate Spell cards, set Traps, change creature positions, and use card effects.",
    allowedActions: [
      "Normal Summon 1 creature",
      "Special Summon creatures (no limit)",
      "Activate Spell cards",
      "Set Spell/Trap cards face-down",
      "Change creature positions (once per creature)",
      "Activate card effects",
    ],
    tips: [
      "You can only Normal Summon once per turn, but Special Summons are unlimited.",
      "Set your Traps before the Battle Phase so they can be activated.",
    ],
  },
  {
    id: "battle",
    name: "Battle Phase",
    shortDescription: "Attack with your creatures.",
    fullDescription:
      "Declare attacks with your creatures in Attack Position. Each creature can attack once per turn. You can skip this phase if you don't want to attack.",
    allowedActions: [
      "Declare attacks with creatures",
      "Activate Quick-Play Spells",
      "Activate Trap cards",
    ],
    tips: [
      "Creatures summoned this turn can attack (no summoning sickness).",
      "The turn player cannot conduct a Battle Phase on the very first turn of the game.",
    ],
  },
  {
    id: "main2",
    name: "Main Phase 2",
    shortDescription: "Additional opportunity to play cards.",
    fullDescription:
      "A second Main Phase after battle. You can do anything you could do in Main Phase 1, except Normal Summon if you already did.",
    allowedActions: [
      "Normal Summon (if you haven't yet)",
      "Special Summon creatures",
      "Activate Spell cards",
      "Set Spell/Trap cards",
      "Change creature positions",
    ],
    tips: [
      "Use this phase to set up defenses after attacking.",
      "Good for playing cards you drew during battle.",
    ],
  },
  {
    id: "end",
    name: "End Phase",
    shortDescription: "End your turn, resolve effects.",
    fullDescription:
      "Concludes your turn. Some effects activate or resolve during the End Phase. If you have more than 7 cards in hand, discard down to 7.",
    allowedActions: [
      "Resolve End Phase effects",
      "Discard to hand limit (7 cards)",
    ],
    tips: [
      "Many temporary effects wear off at the End Phase.",
      "Your opponent's turn begins after your End Phase.",
    ],
  },
];

// =============================================================================
// CARD TYPES
// =============================================================================

export type CardTypeId = "creature" | "spell" | "trap" | "equipment";

export interface CardTypeInfo {
  id: CardTypeId;
  name: string;
  icon: string;
  shortDescription: string;
  fullDescription: string;
  howToPlay: string[];
  subtypes?: { name: string; description: string }[];
}

export const CARD_TYPES: CardTypeInfo[] = [
  {
    id: "creature",
    name: "Creature",
    icon: "👹",
    shortDescription: "Your fighters. Attack and defend with ATK/DEF stats.",
    fullDescription:
      "Creatures are the backbone of your deck. They have ATK (Attack) and DEF (Defense) stats. Summon them to the field to battle your opponent's creatures or attack directly.",
    howToPlay: [
      "Normal Summon: Once per turn, summon a creature from your hand.",
      "Level 1-4: No tribute required.",
      "Level 5-6: Tribute 1 creature you control.",
      "Level 7+: Tribute 2 creatures you control.",
      "Attack Position: Vertical, uses ATK for battle.",
      "Defense Position: Horizontal, uses DEF for battle.",
    ],
    subtypes: [
      { name: "Dragon", description: "Powerful flying creatures, often high ATK." },
      { name: "Spellcaster", description: "Magic users with effect-focused abilities." },
      { name: "Warrior", description: "Battle-hardened fighters, balanced stats." },
      { name: "Beast", description: "Wild creatures, often aggressive effects." },
      { name: "Fiend", description: "Dark creatures with disruptive abilities." },
      { name: "Zombie", description: "Undead that can return from the graveyard." },
      { name: "Machine", description: "Mechanical beings with combo potential." },
      { name: "Aqua", description: "Water-dwelling creatures." },
      { name: "Pyro", description: "Fire-based creatures with burn effects." },
    ],
  },
  {
    id: "spell",
    name: "Spell",
    icon: "✨",
    shortDescription: "Powerful one-time effects. Activate from your hand.",
    fullDescription:
      "Spell cards provide powerful effects that can turn the tide of battle. Most Spells can only be activated during your Main Phase, but Quick-Play Spells can be used anytime.",
    howToPlay: [
      "Activate from your hand during Main Phase.",
      "Most Spells go to the Graveyard after resolving.",
      "Continuous Spells stay on the field.",
      "Field Spells affect the entire game state.",
      "Quick-Play Spells can be activated during either player's turn.",
    ],
    subtypes: [
      { name: "Normal", description: "Standard spell, activate during your Main Phase." },
      { name: "Quick-Play", description: "Can be activated anytime, even during battle." },
      { name: "Continuous", description: "Stays on field with ongoing effects." },
      { name: "Field", description: "Affects the entire battlefield for both players." },
      { name: "Equip", description: "Attaches to a creature to boost it." },
      { name: "Ritual", description: "Used to summon special Ritual creatures." },
    ],
  },
  {
    id: "trap",
    name: "Trap",
    icon: "⚡",
    shortDescription: "Surprise cards. Set face-down, activate on triggers.",
    fullDescription:
      "Trap cards must be Set face-down first and cannot be activated the same turn they were set. They surprise your opponent by activating in response to their actions.",
    howToPlay: [
      "Set face-down during your Main Phase.",
      "Cannot activate the turn it was set.",
      "Activate when conditions are met (your turn or opponent's).",
      "Counter Traps are the fastest card type.",
    ],
    subtypes: [
      { name: "Normal", description: "Standard trap with specific activation timing." },
      { name: "Continuous", description: "Stays on field after activation." },
      { name: "Counter", description: "Negates card activations. Fastest speed." },
    ],
  },
  {
    id: "equipment",
    name: "Equipment",
    icon: "⚔️",
    shortDescription: "Attach to creatures to boost their power.",
    fullDescription:
      "Equipment cards enhance your creatures by boosting their ATK, DEF, or granting special abilities. When the equipped creature leaves the field, the equipment is destroyed.",
    howToPlay: [
      "Activate and target a creature you control.",
      "Provides stat boosts or special abilities.",
      "Destroyed when the equipped creature leaves the field.",
      "Some equipment can be moved to different creatures.",
    ],
  },
];

// =============================================================================
// COMBAT SYSTEM
// =============================================================================

export interface CombatScenario {
  name: string;
  description: string;
  attackerPosition: "attack" | "defense";
  defenderPosition: "attack" | "defense";
  outcome: string;
  damageFormula: string;
}

export const COMBAT_SCENARIOS: CombatScenario[] = [
  {
    name: "ATK vs ATK (Attacker Wins)",
    description: "Your creature attacks an opponent's creature in Attack Position.",
    attackerPosition: "attack",
    defenderPosition: "attack",
    outcome: "Defender destroyed. Opponent takes damage.",
    damageFormula: "Damage = Attacker ATK - Defender ATK",
  },
  {
    name: "ATK vs ATK (Defender Wins)",
    description: "Your creature attacks but has lower ATK.",
    attackerPosition: "attack",
    defenderPosition: "attack",
    outcome: "Attacker destroyed. You take damage.",
    damageFormula: "Damage = Defender ATK - Attacker ATK",
  },
  {
    name: "ATK vs ATK (Tie)",
    description: "Both creatures have equal ATK.",
    attackerPosition: "attack",
    defenderPosition: "attack",
    outcome: "Both creatures destroyed. No damage.",
    damageFormula: "No damage dealt",
  },
  {
    name: "ATK vs DEF (Attacker Wins)",
    description: "Your creature attacks a creature in Defense Position.",
    attackerPosition: "attack",
    defenderPosition: "defense",
    outcome: "Defender destroyed. No damage to opponent.",
    damageFormula: "No battle damage when attacking DEF position",
  },
  {
    name: "ATK vs DEF (Defender Wins)",
    description: "Your creature's ATK is lower than defender's DEF.",
    attackerPosition: "attack",
    defenderPosition: "defense",
    outcome: "No creatures destroyed. You take damage.",
    damageFormula: "Damage = Defender DEF - Attacker ATK",
  },
  {
    name: "Direct Attack",
    description: "No creatures on opponent's field.",
    attackerPosition: "attack",
    defenderPosition: "attack",
    outcome: "Attack opponent directly. They take full ATK as damage.",
    damageFormula: "Damage = Attacker ATK",
  },
];

// =============================================================================
// GAME ZONES
// =============================================================================

export interface ZoneInfo {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  capacity?: number;
}

export const GAME_ZONES: ZoneInfo[] = [
  {
    id: "deck",
    name: "Deck",
    shortDescription: "Your draw pile. Cards are drawn from here.",
    fullDescription:
      "Your main deck of 30-60 cards. You draw from the top at the start of each turn. If you need to draw but your deck is empty, you lose.",
    capacity: 60,
  },
  {
    id: "hand",
    name: "Hand",
    shortDescription: "Cards you can play. Max 7 at end of turn.",
    fullDescription:
      "Cards in your hand are private and can be played when conditions allow. At the end of your turn, if you have more than 7 cards, you must discard down to 7.",
    capacity: 7,
  },
  {
    id: "field_creatures",
    name: "Creature Zones",
    shortDescription: "Where your creatures are summoned.",
    fullDescription:
      "You can control up to 5 creatures at once. Creatures in Attack Position are placed vertically, Defense Position horizontally.",
    capacity: 5,
  },
  {
    id: "field_spells",
    name: "Spell/Trap Zones",
    shortDescription: "Where you set Spells and Traps.",
    fullDescription:
      "Up to 5 Spell/Trap cards can be in these zones. Continuous Spells and face-down Traps occupy these zones until removed.",
    capacity: 5,
  },
  {
    id: "graveyard",
    name: "Graveyard",
    shortDescription: "Destroyed and used cards go here.",
    fullDescription:
      "When creatures are destroyed or Spell/Trap cards are used, they go to the Graveyard. Both players can view either Graveyard at any time. Some effects can retrieve cards from here.",
  },
  {
    id: "banished",
    name: "Banished Zone",
    shortDescription: "Cards removed from play entirely.",
    fullDescription:
      "Banished cards are removed from the game. They're harder to retrieve than cards in the Graveyard. Some powerful effects banish cards as a cost or consequence.",
  },
];

// =============================================================================
// GLOSSARY
// =============================================================================

export interface GlossaryTerm {
  term: string;
  definition: string;
  relatedTerms?: string[];
  category: "stats" | "actions" | "zones" | "mechanics" | "card_types";
}

export const GLOSSARY: GlossaryTerm[] = [
  // Stats
  {
    term: "ATK",
    definition: "Attack points. Used when battling in Attack Position. Higher ATK wins the battle.",
    relatedTerms: ["DEF", "Battle"],
    category: "stats",
  },
  {
    term: "DEF",
    definition: "Defense points. Used when battling in Defense Position. Protects your Life Points.",
    relatedTerms: ["ATK", "Defense Position"],
    category: "stats",
  },
  {
    term: "LP",
    definition: "Life Points. You start with 8000. Reach 0 and you lose the game.",
    relatedTerms: ["Battle Damage", "Effect Damage"],
    category: "stats",
  },
  {
    term: "Level",
    definition: "Creature's star level (1-12). Determines tribute requirements for summoning.",
    relatedTerms: ["Tribute", "Normal Summon"],
    category: "stats",
  },

  // Actions
  {
    term: "Normal Summon",
    definition: "Summoning a creature from your hand. Limited to once per turn.",
    relatedTerms: ["Special Summon", "Tribute"],
    category: "actions",
  },
  {
    term: "Special Summon",
    definition: "Summoning through card effects. No limit per turn.",
    relatedTerms: ["Normal Summon"],
    category: "actions",
  },
  {
    term: "Tribute",
    definition: "Sending your creature to the Graveyard to summon a higher-level creature.",
    relatedTerms: ["Normal Summon", "Level"],
    category: "actions",
  },
  {
    term: "Set",
    definition: "Placing a card face-down. Creatures set in Defense Position, Spells/Traps in Spell Zone.",
    relatedTerms: ["Face-down", "Flip"],
    category: "actions",
  },
  {
    term: "Flip",
    definition: "Turning a face-down creature face-up. Triggers Flip Effects.",
    relatedTerms: ["Set", "Flip Effect"],
    category: "actions",
  },
  {
    term: "Activate",
    definition: "Using a Spell, Trap, or creature effect.",
    relatedTerms: ["Chain", "Negate"],
    category: "actions",
  },
  {
    term: "Chain",
    definition: "When multiple effects activate in response to each other. Resolves last-to-first.",
    relatedTerms: ["Activate", "Spell Speed"],
    category: "actions",
  },
  {
    term: "Negate",
    definition: "Canceling a card's activation or effect. The negated card usually still goes to Graveyard.",
    relatedTerms: ["Counter Trap", "Chain"],
    category: "actions",
  },

  // Zones
  {
    term: "Graveyard",
    definition: "Where destroyed and used cards go. Can be viewed by both players.",
    relatedTerms: ["Banish", "Send"],
    category: "zones",
  },
  {
    term: "Banish",
    definition: "Remove a card from play entirely. Harder to retrieve than Graveyard.",
    relatedTerms: ["Graveyard", "Remove from play"],
    category: "zones",
  },
  {
    term: "Field",
    definition: "The play area where creatures and Spell/Traps are placed.",
    relatedTerms: ["Creature Zone", "Spell/Trap Zone"],
    category: "zones",
  },

  // Mechanics
  {
    term: "Battle Damage",
    definition: "Damage dealt to LP through combat. Calculated from ATK/DEF differences.",
    relatedTerms: ["Effect Damage", "Direct Attack"],
    category: "mechanics",
  },
  {
    term: "Effect Damage",
    definition: "Damage dealt by card effects, not battle. Sometimes called 'burn' damage.",
    relatedTerms: ["Battle Damage"],
    category: "mechanics",
  },
  {
    term: "Direct Attack",
    definition: "Attacking the opponent directly when they have no creatures. Deals full ATK as damage.",
    relatedTerms: ["Battle Damage", "ATK"],
    category: "mechanics",
  },
  {
    term: "Piercing",
    definition: "Ability to deal battle damage even when attacking Defense Position creatures.",
    relatedTerms: ["Battle Damage", "Defense Position"],
    category: "mechanics",
  },
  {
    term: "Spell Speed",
    definition: "Determines what can respond to what in a Chain. Speed 1 < Speed 2 < Speed 3.",
    relatedTerms: ["Chain", "Quick-Play", "Counter Trap"],
    category: "mechanics",
  },
  {
    term: "OPT",
    definition: "Once Per Turn. An effect that can only be used once each turn.",
    relatedTerms: ["Hard OPT"],
    category: "mechanics",
  },
  {
    term: "Hard OPT",
    definition: "Once Per Turn restriction tied to the card name, not the individual copy.",
    relatedTerms: ["OPT"],
    category: "mechanics",
  },

  // Card Types
  {
    term: "Quick-Play Spell",
    definition: "A Spell that can be activated during either player's turn, even during Battle Phase.",
    relatedTerms: ["Spell", "Spell Speed"],
    category: "card_types",
  },
  {
    term: "Counter Trap",
    definition: "The fastest Trap type (Spell Speed 3). Can only be responded to by other Counter Traps.",
    relatedTerms: ["Trap", "Chain", "Spell Speed"],
    category: "card_types",
  },
  {
    term: "Continuous",
    definition: "A Spell or Trap that remains on the field with ongoing effects.",
    relatedTerms: ["Field Spell"],
    category: "card_types",
  },
  {
    term: "Equip",
    definition: "A card that attaches to a creature, boosting its stats or granting abilities.",
    relatedTerms: ["ATK", "DEF"],
    category: "card_types",
  },
];

// =============================================================================
// ELEMENTS (ARCHETYPES)
// =============================================================================

export interface ElementInfo {
  id: string;
  name: string;
  color: string;
  description: string;
  playstyle: string;
  strengths: string[];
  starterDeck?: string;
}

export const ELEMENTS: ElementInfo[] = [
  {
    id: "fire",
    name: "Fire",
    color: "#ef4444",
    description: "Aggressive element focused on dealing damage quickly.",
    playstyle: "Aggro / Beatdown",
    strengths: ["High ATK creatures", "Burn damage effects", "Fast wins"],
    starterDeck: "Infernal Dragons",
  },
  {
    id: "water",
    name: "Water",
    color: "#3b82f6",
    description: "Control element that disrupts opponent's strategy.",
    playstyle: "Control",
    strengths: ["Bounce effects", "Freeze/stun abilities", "Card advantage"],
    starterDeck: "Abyssal Depths",
  },
  {
    id: "earth",
    name: "Earth",
    color: "#84cc16",
    description: "Defensive element with sturdy creatures.",
    playstyle: "Midrange / Defense",
    strengths: ["High DEF creatures", "Protection effects", "Resource generation"],
    starterDeck: "Iron Legion",
  },
  {
    id: "wind",
    name: "Wind",
    color: "#a855f7",
    description: "Tempo element with card draw and speed.",
    playstyle: "Tempo / Combo",
    strengths: ["Card draw", "Multiple attacks", "Evasion abilities"],
    starterDeck: "Storm Riders",
  },
  {
    id: "neutral",
    name: "Neutral",
    color: "#6b7280",
    description: "Versatile cards that work in any deck.",
    playstyle: "Flexible",
    strengths: ["No elemental restrictions", "Generic support", "Tech options"],
  },
];

// =============================================================================
// TUTORIAL MOMENTS
// =============================================================================

export interface TutorialMoment {
  id: number;
  phase: PhaseId | "any";
  trigger: string;
  title: string;
  message: string;
  highlightElement?: string;
  action?: string;
}

export const TUTORIAL_MOMENTS: TutorialMoment[] = [
  {
    id: 1,
    phase: "draw",
    trigger: "turn_start",
    title: "Draw Phase",
    message:
      "Each turn begins by drawing 1 card from your deck. This happens automatically at the start of your turn.",
    highlightElement: "deck",
  },
  {
    id: 2,
    phase: "main1",
    trigger: "creature_in_hand",
    title: "Summoning Creatures",
    message:
      "You have a creature in your hand! Tap it to summon it to the field. You can Normal Summon 1 creature per turn.",
    highlightElement: "hand_creature",
    action: "summon_creature",
  },
  {
    id: 3,
    phase: "battle",
    trigger: "creature_on_field",
    title: "Battle Phase",
    message:
      "Now you can attack! Tap your creature, then tap the enemy you want to attack. If they have no creatures, attack them directly!",
    highlightElement: "field_creature",
    action: "declare_attack",
  },
  {
    id: 4,
    phase: "main1",
    trigger: "spell_in_hand",
    title: "Using Spells",
    message:
      "You drew a Spell card! Spells have powerful effects. Tap it to activate and read what it does.",
    highlightElement: "hand_spell",
    action: "activate_spell",
  },
  {
    id: 5,
    phase: "any",
    trigger: "opponent_lp_zero",
    title: "Victory!",
    message:
      "You reduced your opponent's Life Points to 0! That's how you win in LunchTable. Great job completing the tutorial!",
    highlightElement: "opponent_lp",
  },
];

// =============================================================================
// TOOLTIP DEFINITIONS
// =============================================================================

export interface TooltipDefinition {
  id: string;
  target: string;
  title: string;
  body: string;
  learnMoreAnchor?: string;
}

export const TOOLTIPS: Record<string, TooltipDefinition> = {
  // Game Board
  deck: {
    id: "deck",
    target: "deck",
    title: "Your Deck",
    body: "Draw 1 card from here at the start of each turn. If it's empty when you need to draw, you lose!",
    learnMoreAnchor: "deck",
  },
  graveyard: {
    id: "graveyard",
    target: "graveyard",
    title: "Graveyard",
    body: "Cards sent here after being destroyed or used. Some effects can retrieve cards from here.",
    learnMoreAnchor: "graveyard",
  },
  banished: {
    id: "banished",
    target: "banished",
    title: "Banished Zone",
    body: "Cards removed from play entirely. Much harder to retrieve than the Graveyard.",
    learnMoreAnchor: "banished",
  },
  life_points: {
    id: "life_points",
    target: "life_points",
    title: "Life Points (LP)",
    body: "You start with 8000 LP. Reach 0 and you lose. Protect them!",
    learnMoreAnchor: "lp",
  },
  phase_indicator: {
    id: "phase_indicator",
    target: "phase_indicator",
    title: "Current Phase",
    body: "Shows which phase of the turn you're in: Draw → Main → Battle → Main 2 → End.",
    learnMoreAnchor: "turn-phases",
  },
  creature_zone: {
    id: "creature_zone",
    target: "creature_zone",
    title: "Creature Zone",
    body: "Summon creatures here. You can have up to 5 creatures on your field.",
    learnMoreAnchor: "creature-zones",
  },
  spell_trap_zone: {
    id: "spell_trap_zone",
    target: "spell_trap_zone",
    title: "Spell/Trap Zone",
    body: "Set Traps face-down here, or play Continuous Spells. Up to 5 cards.",
    learnMoreAnchor: "spell-trap-zones",
  },
  hand: {
    id: "hand",
    target: "hand",
    title: "Your Hand",
    body: "Cards you can play. Glowing cards are playable this turn. Tap to select, then choose where to play.",
    learnMoreAnchor: "hand",
  },
  turn_indicator: {
    id: "turn_indicator",
    target: "turn_indicator",
    title: "Turn Number",
    body: "Shows the current turn of the game. Each player takes alternating turns.",
    learnMoreAnchor: "turn-phases",
  },
  field_zone: {
    id: "field_zone",
    target: "field_zone",
    title: "Field Zone",
    body: "Play Field Spell cards here. Field Spells affect the entire battlefield for both players.",
    learnMoreAnchor: "field-spells",
  },

  // Card Stats
  atk: {
    id: "atk",
    target: "atk",
    title: "ATK (Attack)",
    body: "Attack power. Used when battling in Attack Position. Higher ATK wins!",
    learnMoreAnchor: "atk",
  },
  def: {
    id: "def",
    target: "def",
    title: "DEF (Defense)",
    body: "Defense power. Used when in Defense Position. Protects your Life Points.",
    learnMoreAnchor: "def",
  },
  level: {
    id: "level",
    target: "level",
    title: "Level",
    body: "Star level (1-12). Level 5-6 needs 1 tribute, Level 7+ needs 2 tributes to summon.",
    learnMoreAnchor: "level",
  },
  cost: {
    id: "cost",
    target: "cost",
    title: "Cost",
    body: "Mana cost to play this card. Make sure you have enough resources!",
  },

  // Card Types
  creature_card: {
    id: "creature_card",
    target: "creature_card",
    title: "Creature Card",
    body: "Your fighters! Summon them to attack and defend. Has ATK and DEF stats.",
    learnMoreAnchor: "creatures",
  },
  spell_card: {
    id: "spell_card",
    target: "spell_card",
    title: "Spell Card",
    body: "Powerful one-time effects. Activate during your Main Phase (Quick-Play anytime).",
    learnMoreAnchor: "spells",
  },
  trap_card: {
    id: "trap_card",
    target: "trap_card",
    title: "Trap Card",
    body: "Surprise cards! Set face-down first, then activate when conditions are met.",
    learnMoreAnchor: "traps",
  },
  equipment_card: {
    id: "equipment_card",
    target: "equipment_card",
    title: "Equipment Card",
    body: "Attach to your creatures to boost their stats or grant abilities.",
    learnMoreAnchor: "equipment",
  },

  // Rarities
  rarity_common: {
    id: "rarity_common",
    target: "rarity_common",
    title: "Common",
    body: "Basic cards. Easy to collect, form the foundation of most decks.",
  },
  rarity_uncommon: {
    id: "rarity_uncommon",
    target: "rarity_uncommon",
    title: "Uncommon",
    body: "Slightly rarer cards with useful effects.",
  },
  rarity_rare: {
    id: "rarity_rare",
    target: "rarity_rare",
    title: "Rare",
    body: "Valuable cards with strong effects. Blue gem indicator.",
  },
  rarity_epic: {
    id: "rarity_epic",
    target: "rarity_epic",
    title: "Epic",
    body: "Powerful cards that can define a deck's strategy. Purple gem.",
  },
  rarity_legendary: {
    id: "rarity_legendary",
    target: "rarity_legendary",
    title: "Legendary",
    body: "The rarest and most powerful cards. Gold gem, limited to 1 per deck.",
  },

  // Lobby/Matchmaking
  ranked_match: {
    id: "ranked_match",
    target: "ranked_match",
    title: "Ranked Match",
    body: "Competitive matches that affect your rating. Win to climb the ladder!",
  },
  casual_match: {
    id: "casual_match",
    target: "casual_match",
    title: "Casual Match",
    body: "Relaxed matches with no rating changes. Great for practice or fun.",
  },
  rating: {
    id: "rating",
    target: "rating",
    title: "Your Rating",
    body: "Your skill rating starting at 1000. Win ranked matches to increase it.",
  },

  // Deck Builder
  deck_size: {
    id: "deck_size",
    target: "deck_size",
    title: "Deck Size",
    body: "Your deck needs 30-60 cards. Smaller decks are more consistent.",
  },
  card_limit: {
    id: "card_limit",
    target: "card_limit",
    title: "Card Limit",
    body: "You can have up to 3 copies of most cards. Legendaries are limited to 1.",
  },

  // Shop
  gold: {
    id: "gold",
    target: "gold",
    title: "Gold",
    body: "Earned by playing matches and completing quests. Used to buy packs.",
  },
  gems: {
    id: "gems",
    target: "gems",
    title: "Gems",
    body: "Premium currency. Can be purchased or earned from special events.",
  },
  card_pack: {
    id: "card_pack",
    target: "card_pack",
    title: "Card Pack",
    body: "Contains random cards. Each pack guarantees at least 1 Rare or better.",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPhaseById(id: PhaseId): PhaseInfo | undefined {
  return TURN_PHASES.find((p) => p.id === id);
}

export function getCardTypeById(id: CardTypeId): CardTypeInfo | undefined {
  return CARD_TYPES.find((t) => t.id === id);
}

export function getZoneById(id: string): ZoneInfo | undefined {
  return GAME_ZONES.find((z) => z.id === id);
}

export function getGlossaryTerm(term: string): GlossaryTerm | undefined {
  return GLOSSARY.find((g) => g.term.toLowerCase() === term.toLowerCase());
}

export function searchGlossary(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return GLOSSARY.filter(
    (g) =>
      g.term.toLowerCase().includes(lowerQuery) ||
      g.definition.toLowerCase().includes(lowerQuery)
  );
}

export function getTooltip(id: string): TooltipDefinition | undefined {
  return TOOLTIPS[id];
}

export function getTutorialMoment(id: number): TutorialMoment | undefined {
  return TUTORIAL_MOMENTS.find((m) => m.id === id);
}

export function getElementById(id: string): ElementInfo | undefined {
  return ELEMENTS.find((e) => e.id === id);
}
