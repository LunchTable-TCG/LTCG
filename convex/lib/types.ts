/**
 * Backend Types
 * Type definitions for Convex backend operations.
 * Eliminates `any` types and provides comprehensive type safety.
 *
 * This file lives in convex/lib/ and should only be used by backend code.
 */

import { GAME_CONFIG } from "@ltcg/core";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// =============================================================================
// Core Game Types (Backend-specific)
// =============================================================================

export type Archetype = (typeof GAME_CONFIG.ARCHETYPES)[number];
export type Rarity = (typeof GAME_CONFIG.RARITIES)[number];
export type CardType = (typeof GAME_CONFIG.CARD_TYPES)[number];

// Industry-standard TCG types
export type Attribute = (typeof GAME_CONFIG.ATTRIBUTES)[number];

export type MonsterType = (typeof GAME_CONFIG.MONSTER_TYPES)[number];

export type SpellType = (typeof GAME_CONFIG.SPELL_TYPES)[number];

export type TrapType = (typeof GAME_CONFIG.TRAP_TYPES)[number];

// =============================================================================
// User & Session Types
// =============================================================================

export type UserStatus = "online" | "in_game" | "idle";

/**
 * Authenticated session information
 */
export interface AuthenticatedUser {
  userId: Id<"users">;
  username: string;
}

// =============================================================================
// Currency & Transaction Types
// =============================================================================

export type CurrencyType = "gold" | "gems";

export type TransactionType =
  | "purchase"
  | "reward"
  | "sale"
  | "gift"
  | "refund"
  | "admin_refund"
  | "conversion"
  | "marketplace_fee"
  | "auction_bid"
  | "auction_refund"
  | "wager"
  | "wager_payout"
  | "wager_refund"
  | "tournament_entry"
  | "tournament_refund"
  | "tournament_prize";

/**
 * Transaction metadata with discriminated union for type safety
 */
export type TransactionMetadata =
  | { type: "purchase"; productId: string; quantity: number }
  | { type: "reward"; source: string; details?: string }
  | { type: "sale"; itemId: string; buyerId?: string }
  | { type: "gift"; recipientId: string; message?: string }
  | { type: "refund"; originalTransactionId: string; reason: string }
  | { type: "conversion"; fromCurrency: CurrencyType; rate: number }
  | { type: "marketplace_fee"; transactionId: string; feePercentage: number }
  | { type: "auction"; auctionId: string; bidAmount?: number }
  | { [key: string]: unknown }; // Fallback for generic metadata

// =============================================================================
// Shop & Product Types
// =============================================================================

export type ProductType = "pack" | "box" | "currency";

/**
 * Pack configuration for card pack opening
 */
export interface PackConfig {
  cardCount: number;
  guaranteedRarity?: Rarity;
  guaranteedCount?: number; // How many guaranteed slots
  archetype?: Archetype;
  packType?: string;
  allRareOrBetter?: boolean; // For collector packs
  variantMultipliers?: {
    foil?: number; // e.g., 1.5 = 150% of base foil rate
    altArt?: number;
    fullArt?: number;
  };
  [key: string]: unknown; // Allow additional config properties
}

/** Card variants for collectible scarcity */
export type CardVariant =
  | "standard"
  | "foil"
  | "alt_art"
  | "full_art"
  | "numbered"
  | "first_edition";

/**
 * Card result from pack opening
 */
export interface CardResult {
  cardDefinitionId: Id<"cardDefinitions">;
  name: string;
  rarity: Rarity;
  archetype: Archetype;
  cardType: "creature" | "spell" | "trap" | "equipment";
  attack?: number;
  defense?: number;
  cost: number;
  imageUrl?: string;
  ability?: string;
  flavorText?: string;
  variant: CardVariant;
}

/**
 * Shop product with full configuration
 */
export interface ShopProductData extends Doc<"shopProducts"> {
  config: PackConfig | Record<string, unknown>;
}

// =============================================================================
// Query Builder Types
// =============================================================================

/**
 * Type-safe index query builder
 * Note: Removed as Convex provides its own query builder types
 */

// =============================================================================
// Context Types
// =============================================================================

/**
 * Shared context type for query and mutation functions
 */
export type SharedCtx = QueryCtx | MutationCtx;

// =============================================================================
// Admin & System Types
// =============================================================================

/**
 * Admin action result
 */
export interface AdminActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// =============================================================================
// Event & Analytics Types
// =============================================================================

export type EventCategory = "user_action" | "game_event" | "system" | "error" | "performance";

/**
 * Event properties with type-safe structure
 */
export type EventProperties =
  | { category: "user_action"; action: string; [key: string]: unknown }
  | { category: "game_event"; gameId: string; [key: string]: unknown }
  | { category: "system"; component: string; [key: string]: unknown }
  | {
      category: "error";
      errorType: string;
      message: string;
      stack?: string;
      [key: string]: unknown;
    }
  | {
      category: "performance";
      metric: string;
      value: number;
      [key: string]: unknown;
    };

// =============================================================================
// Utility Types
// =============================================================================

/**
 * JSON-serializable value type
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

/**
 * Partial update helper (excludes system fields)
 */
export type PartialUpdate<T> = Partial<Omit<T, "_id" | "_creationTime" | "createdAt">>;

/**
 * Database record with system fields
 */
export type DbRecord<T> = T & {
  _id: string;
  _creationTime: number;
};

// =============================================================================
// File & Storage Types
// =============================================================================

export type FileCategory = "profile_picture" | "card_image" | "document" | "other";

export type SupportedImageFormat = "image/png" | "image/jpeg" | "image/webp";

/**
 * File metadata with storage reference
 */
export interface FileMetadataRecord extends Doc<"fileMetadata"> {
  storageId: string;
  contentType: string;
}

// =============================================================================
// Card & Inventory Types
// =============================================================================

/**
 * Full card definition from database
 */
export type CardDefinition = Doc<"cardDefinitions">;

/**
 * Player card inventory record
 */
export type PlayerCard = Doc<"playerCards">;

/**
 * Update object for dynamic property updates
 */
export interface DynamicUpdate {
  [key: string]: string | number | boolean | null | undefined;
}
