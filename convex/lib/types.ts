/**
 * Backend Types
 * Type definitions for Convex backend operations.
 * Eliminates `any` types and provides comprehensive type safety.
 *
 * This file lives in convex/lib/ and should only be used by backend code.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

// =============================================================================
// Core Game Types (Backend-specific)
// =============================================================================

export type Archetype =
  | "infernal_dragons"
  | "abyssal_horrors"
  | "nature_spirits"
  | "storm_elementals"
  | "shadow_assassins"
  | "celestial_guardians"
  | "undead_legion"
  | "divine_knights"
  | "arcane_mages"
  | "mechanical_constructs"
  | "neutral"
  // Old archetypes (deprecated - for migration compatibility)
  | "fire"
  | "water"
  | "earth"
  | "wind";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardType = "creature" | "agent" | "spell" | "trap" | "equipment";

// Industry-standard TCG types
export type Attribute =
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "light"
  | "dark"
  | "divine"
  | "neutral";

export type MonsterType =
  | "dragon"
  | "spellcaster"
  | "warrior"
  | "beast"
  | "fiend"
  | "zombie"
  | "machine"
  | "aqua"
  | "pyro"
  | "divine_beast";

export type SpellType =
  | "normal"
  | "quick_play"
  | "continuous"
  | "field"
  | "equip"
  | "ritual";

export type TrapType = "normal" | "continuous" | "counter";

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
  | "conversion"
  | "marketplace_fee"
  | "auction_bid"
  | "auction_refund";

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
  archetype?: Archetype;
  packType?: string;
  [key: string]: unknown; // Allow additional config properties
}

/**
 * Card result from pack opening
 */
export interface CardResult {
  cardDefinitionId: Id<"cardDefinitions">;
  name: string;
  rarity: Rarity;
  archetype: Archetype;
  cardType: "creature" | "agent" | "spell" | "trap" | "equipment";
  attack?: number;
  defense?: number;
  cost: number;
  imageUrl?: string;
  ability?: string;
  flavorText?: string;
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
