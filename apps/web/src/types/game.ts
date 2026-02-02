/**
 * Game system types (cards, decks, game state).
 *
 * This module defines types for in-game card representations across different zones:
 * - Hand: Cards held by the player
 * - Board: Creature cards on the field
 * - Backrow: Spell/Trap cards set on the field
 * - Graveyard: Discarded cards
 */

import type { Id } from "@convex/_generated/dataModel";
import type { JsonAbility } from "../lib/cardHelpers";

/**
 * Card representation in the player's hand.
 *
 * Valid card types (matching Convex schema):
 * - `"creature"` - Creature card that can attack/defend
 * - `"spell"` - Instant effect card
 * - `"trap"` - Reactive card set face-down
 * - `"equipment"` - Equipment card that enhances creatures
 *
 * @example
 * ```typescript
 * const handCard: HandCard = {
 *   _id: "jc8s9d0..." as Id<"cardDefinitions">,
 *   name: "Dark Magician",
 *   imageUrl: "/cards/dark-magician.png",
 *   cardType: "creature",
 *   attack: 2500,
 *   defense: 2100,
 *   level: 7,
 *   rarity: "rare",
 *   archetype: "Spellcaster",
 *   ability: {
 *     effects: [{
 *       type: "summon",
 *       trigger: "on_summon",
 *       description: "Special Summon 1 'Dark Magician Girl' from your hand"
 *     }],
 *     abilityText: "When this card is Normal Summoned: You can Special Summon 1 'Dark Magician Girl' from your hand."
 *   },
 *   abilityText: "When this card is Normal Summoned: You can Special Summon 1 'Dark Magician Girl' from your hand.",
 *   effectType: "trigger"
 * };
 * ```
 *
 * @see BoardCard - For cards played on the field
 */
export interface HandCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Type of card (matches Convex schema) */
  cardType: "creature" | "spell" | "trap" | "equipment";
  /** Attack points (creature cards only) */
  attack?: number;
  /** Defense points (creature cards only) */
  defense?: number;
  /** Level/rank of the card (creature cards only) */
  level?: number;
  /** Rarity tier (common, rare, legendary, etc.) */
  rarity: string;
  /** Deck archetype (optional) */
  archetype?: string;
  /** Card ability as JSON structure (optional) */
  ability?: JsonAbility;
  /** Human-readable ability text for display (optional) */
  abilityText?: string;
  /** Effect category (trigger, continuous, etc.) */
  effectType?: string;
}

/**
 * Card representation on the game board (monster zone).
 *
 * Valid positions:
 * - `"attack"` - Face-up attack position
 * - `"defense"` - Face-up or face-down defense position
 *
 * @example
 * ```typescript
 * const boardCard: BoardCard = {
 *   _id: "jc8s9d0..." as Id<"cardDefinitions">,
 *   name: "Blue-Eyes White Dragon",
 *   imageUrl: "/cards/blue-eyes.png",
 *   cardType: "creature",
 *   attack: 3000,
 *   defense: 2500,
 *   level: 8,
 *   rarity: "legendary",
 *   archetype: "Dragon",
 *   position: "attack",
 *   isFaceDown: false,
 *   ability: {
 *     effects: [{
 *       type: "damage",
 *       trigger: "on_battle_destroy",
 *       value: 500,
 *       description: "Deal 500 damage when destroying a monster by battle"
 *     }],
 *     abilityText: "When this card destroys a monster by battle: Inflict 500 damage to your opponent."
 *   },
 *   abilityText: "When this card destroys a monster by battle: Inflict 500 damage to your opponent.",
 *   effectType: "trigger"
 * };
 * ```
 *
 * @see HandCard - For cards in hand before playing
 * @see BackrowCard - For spell/trap cards on the field
 */
export interface BoardCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Type of card (matches Convex schema) */
  cardType: "creature" | "spell" | "trap" | "equipment";
  /** Attack points (creature cards only) */
  attack?: number;
  /** Defense points (creature cards only) */
  defense?: number;
  /** Level/rank of the card (creature cards only) */
  level?: number;
  /** Rarity tier */
  rarity: string;
  /** Deck archetype (optional) */
  archetype?: string;
  /** Card position on the board (optional) */
  position?: "attack" | "defense";
  /** Whether the card is face-down */
  isFaceDown: boolean;
  /** Card ability as JSON structure (optional) */
  ability?: JsonAbility;
  /** Human-readable ability text for display (optional) */
  abilityText?: string;
  /** Effect category */
  effectType?: string;
}

/**
 * Spell or trap card in the backrow (spell/trap zone).
 *
 * Valid card types:
 * - `"spell"` - Spell card with immediate or continuous effect
 * - `"trap"` - Trap card activated in response to opponent actions
 *
 * @example
 * ```typescript
 * const backrowCard: BackrowCard = {
 *   _id: "jc9t0e1..." as Id<"cardDefinitions">,
 *   name: "Mirror Force",
 *   imageUrl: "/cards/mirror-force.png",
 *   cardType: "trap",
 *   rarity: "rare",
 *   archetype: "Trap",
 *   isFaceDown: true,
 *   ability: {
 *     effects: [{
 *       type: "destroy",
 *       trigger: "on_battle_attacked",
 *       target: { count: "all", owner: "opponent" },
 *       description: "Destroy all opponent's Attack Position monsters"
 *     }],
 *     abilityText: "When an opponent's monster declares an attack: Destroy all your opponent's Attack Position monsters.",
 *     spellSpeed: 2
 *   },
 *   abilityText: "When an opponent's monster declares an attack: Destroy all your opponent's Attack Position monsters.",
 *   effectType: "normal"
 * };
 * ```
 *
 * @see BoardCard - For creature cards on the field
 */
export interface BackrowCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Type of card (spell or trap only) */
  cardType: "spell" | "trap";
  /** Rarity tier */
  rarity: string;
  /** Deck archetype (optional) */
  archetype?: string;
  /** Whether the card is face-down (set) */
  isFaceDown: boolean;
  /** Card ability as JSON structure (optional) */
  ability?: JsonAbility;
  /** Human-readable ability text for display (optional) */
  abilityText?: string;
  /** Effect category */
  effectType?: string;
}

/**
 * Card representation in the graveyard.
 *
 * Minimal representation showing only essential info since cards in graveyard
 * are typically not interactive until retrieved by effect.
 *
 * @example
 * ```typescript
 * const graveyardCard: GraveyardCard = {
 *   _id: "jc8s9d0..." as Id<"cardDefinitions">,
 *   name: "Goblin Attack Force",
 *   imageUrl: "/cards/goblin-attack-force.png",
 *   isFaceDown: false
 * };
 * ```
 */
export interface GraveyardCard {
  /** Unique card definition ID */
  _id: Id<"cardDefinitions">;
  /** Card name */
  name: string;
  /** URL to card artwork (optional) */
  imageUrl?: string;
  /** Whether the card is face-down (rarely used in graveyard) */
  isFaceDown: boolean;
}

// CardDisplay and DeckDisplay moved to ui.ts for better organization
