/**
 * Card Template Designer Types
 *
 * TypeScript interfaces for the template designer components.
 */

import type { Id, Doc } from "@convex/_generated/dataModel";

// =============================================================================
// Convex Document Types
// =============================================================================

export type CardTemplate = Doc<"cardTemplates">;
export type CardTemplateBlock = Doc<"cardTemplateBlocks">;

// =============================================================================
// Block Types
// =============================================================================

export type BlockType =
  | "name"
  | "level"
  | "attribute"
  | "attack"
  | "defense"
  | "cost"
  | "cardType"
  | "monsterType"
  | "effect"
  | "flavorText"
  | "custom"
  // Image block types
  | "image"
  | "icon";

/** Block types that render text content */
export type TextBlockType = Exclude<BlockType, "image" | "icon">;

/** Block types that render images */
export type ImageBlockType = "image" | "icon";

/** Image fit options for image blocks */
export type ImageFit = "fill" | "contain" | "cover" | "none";

export type CardType = "creature" | "spell" | "trap" | "equipment" | "universal";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * Template rendering mode:
 * - "frame_artwork": Traditional mode with separate frame image + artwork placement
 * - "full_card_image": Card's own image is the full background (frame + art baked in)
 */
export type TemplateMode = "frame_artwork" | "full_card_image";

// =============================================================================
// Editor State Types
// =============================================================================

/** Template with block count for gallery views */
export interface TemplateListItem extends CardTemplate {
  blockCount: number;
}

export interface TemplateWithBlocks extends CardTemplate {
  blocks: CardTemplateBlock[];
}

export interface EditorState {
  template: TemplateWithBlocks | null;
  selectedBlockId: Id<"cardTemplateBlocks"> | null;
  zoom: number;
  isDirty: boolean;
  isSaving: boolean;
  previewRarity: Rarity;
}

// =============================================================================
// Block Configuration
// =============================================================================

export interface BlockConfig {
  type: BlockType;
  label: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultFontSize: number;
  defaultFontWeight: "normal" | "bold";
  defaultTextAlign: "left" | "center" | "right";
  /** Which card types this block applies to (null = all) */
  applicableTypes: CardType[] | null;
  /** Whether this is an image block type */
  isImageBlock?: boolean;
  /** Default image fit for image blocks */
  defaultImageFit?: ImageFit;
}

export const BLOCK_CONFIGS: Record<BlockType, BlockConfig> = {
  name: {
    type: "name",
    label: "Card Name",
    description: "The name of the card",
    defaultWidth: 70,
    defaultHeight: 8,
    defaultFontSize: 24,
    defaultFontWeight: "bold",
    defaultTextAlign: "left",
    applicableTypes: null,
  },
  level: {
    type: "level",
    label: "Level",
    description: "Monster level (1-12)",
    defaultWidth: 10,
    defaultHeight: 6,
    defaultFontSize: 20,
    defaultFontWeight: "bold",
    defaultTextAlign: "center",
    applicableTypes: ["creature"],
  },
  attribute: {
    type: "attribute",
    label: "Attribute",
    description: "Element/attribute icon",
    defaultWidth: 10,
    defaultHeight: 6,
    defaultFontSize: 12,
    defaultFontWeight: "normal",
    defaultTextAlign: "center",
    applicableTypes: ["creature"],
  },
  attack: {
    type: "attack",
    label: "ATK",
    description: "Attack power",
    defaultWidth: 15,
    defaultHeight: 6,
    defaultFontSize: 20,
    defaultFontWeight: "bold",
    defaultTextAlign: "center",
    applicableTypes: ["creature"],
  },
  defense: {
    type: "defense",
    label: "DEF",
    description: "Defense power",
    defaultWidth: 15,
    defaultHeight: 6,
    defaultFontSize: 20,
    defaultFontWeight: "bold",
    defaultTextAlign: "center",
    applicableTypes: ["creature"],
  },
  cost: {
    type: "cost",
    label: "Cost",
    description: "Mana/resource cost",
    defaultWidth: 10,
    defaultHeight: 6,
    defaultFontSize: 18,
    defaultFontWeight: "bold",
    defaultTextAlign: "center",
    applicableTypes: null,
  },
  cardType: {
    type: "cardType",
    label: "Card Type",
    description: "Type line (Creature - Dragon, Spell, etc.)",
    defaultWidth: 80,
    defaultHeight: 5,
    defaultFontSize: 14,
    defaultFontWeight: "normal",
    defaultTextAlign: "center",
    applicableTypes: null,
  },
  monsterType: {
    type: "monsterType",
    label: "Monster Type",
    description: "Creature subtype (Dragon, Warrior, etc.)",
    defaultWidth: 40,
    defaultHeight: 5,
    defaultFontSize: 12,
    defaultFontWeight: "normal",
    defaultTextAlign: "center",
    applicableTypes: ["creature"],
  },
  effect: {
    type: "effect",
    label: "Effect Text",
    description: "Card abilities and effects",
    defaultWidth: 84,
    defaultHeight: 20,
    defaultFontSize: 12,
    defaultFontWeight: "normal",
    defaultTextAlign: "left",
    applicableTypes: null,
  },
  flavorText: {
    type: "flavorText",
    label: "Flavor Text",
    description: "Lore and flavor description",
    defaultWidth: 84,
    defaultHeight: 8,
    defaultFontSize: 11,
    defaultFontWeight: "normal",
    defaultTextAlign: "center",
    applicableTypes: null,
  },
  custom: {
    type: "custom",
    label: "Custom",
    description: "Custom text or content",
    defaultWidth: 50,
    defaultHeight: 10,
    defaultFontSize: 14,
    defaultFontWeight: "normal",
    defaultTextAlign: "left",
    applicableTypes: null,
  },
  // Image block types
  image: {
    type: "image",
    label: "Image",
    description: "Custom image element",
    defaultWidth: 30,
    defaultHeight: 30,
    defaultFontSize: 14,
    defaultFontWeight: "normal",
    defaultTextAlign: "center",
    applicableTypes: null,
    isImageBlock: true,
    defaultImageFit: "contain",
  },
  icon: {
    type: "icon",
    label: "Icon",
    description: "Small icon or symbol",
    defaultWidth: 8,
    defaultHeight: 8,
    defaultFontSize: 14,
    defaultFontWeight: "normal",
    defaultTextAlign: "center",
    applicableTypes: null,
    isImageBlock: true,
    defaultImageFit: "contain",
  },
};

// =============================================================================
// Preview Data (for rendering cards)
// =============================================================================

export interface CardPreviewData {
  name: string;
  rarity: Rarity;
  cardType: "creature" | "spell" | "trap" | "equipment";
  archetype?: string;
  level?: number;
  attribute?: string;
  monsterType?: string;
  spellType?: string;
  trapType?: string;
  attack?: number;
  defense?: number;
  cost: number;
  effect?: string;
  flavorText?: string;
  imageUrl?: string;
}

/** Sample card data for preview */
export const SAMPLE_CARD_DATA: CardPreviewData = {
  name: "Ancient Dragon",
  rarity: "legendary",
  cardType: "creature",
  archetype: "infernal_dragons",
  level: 8,
  attribute: "fire",
  monsterType: "dragon",
  attack: 3000,
  defense: 2500,
  cost: 8,
  effect:
    "When this card is summoned, you may destroy one card on the field. Once per turn, you can deal 500 damage to your opponent.",
  flavorText:
    "From the depths of the volcanic mountains, this ancient beast awakens to bring destruction upon its foes.",
  imageUrl: undefined,
};

// =============================================================================
// Font Options
// =============================================================================

export const FONT_FAMILIES = [
  { value: "Geist Sans", label: "Geist Sans" },
  { value: "Geist Mono", label: "Geist Mono" },
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Impact", label: "Impact" },
] as const;

export const FONT_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48] as const;

// =============================================================================
// Canvas Constants
// =============================================================================

export const CANVAS_WIDTH = 750;
export const CANVAS_HEIGHT = 1050;
export const CANVAS_ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT;

export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const DEFAULT_ZOOM = 0.5;

// =============================================================================
// Rarity Colors
// =============================================================================

export const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  common: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/50" },
  uncommon: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50" },
  rare: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
  epic: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/50" },
  legendary: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50" },
};

// =============================================================================
// Konva Canvas Types
// =============================================================================

/** Layer types in the Konva canvas (bottom to top) */
export type LayerType = "background" | "artwork" | "content" | "overlay" | "selection";

/** Canvas export format */
export type ExportFormat = "png" | "jpeg";

/** Canvas export options */
export interface ExportOptions {
  format: ExportFormat;
  quality?: number; // 0-1 for JPEG
  pixelRatio?: number; // For high-DPI exports
  width?: number; // Override width
  height?: number; // Override height
}

/** Snap guide for alignment */
export interface SnapGuide {
  orientation: "horizontal" | "vertical";
  position: number;
  type: "center" | "edge";
}

/** Selection state for multi-select */
export interface SelectionState {
  selectedIds: Id<"cardTemplateBlocks">[];
  selectionRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

/** Drag state for tracking movement */
export interface DragState {
  isDragging: boolean;
  startPosition: { x: number; y: number } | null;
  currentPosition: { x: number; y: number } | null;
}

/** Helper to check if block type is an image type */
export function isImageBlockType(type: BlockType): type is ImageBlockType {
  return type === "image" || type === "icon";
}

/** Helper to check if block type is a text type */
export function isTextBlockType(type: BlockType): type is TextBlockType {
  return !isImageBlockType(type);
}

// =============================================================================
// Block ID Type Alias (for consistent usage)
// =============================================================================

/** Block ID type alias for easier use */
export type BlockId = Id<"cardTemplateBlocks">;

/** Template ID type alias for easier use */
export type TemplateId = Id<"cardTemplates">;

// =============================================================================
// Transform Types (unified for all draggable elements)
// =============================================================================

/** Position update from drag operations */
export interface BlockPosition {
  x: number;
  y: number;
}

/** Transform attributes from resize/rotate operations */
export interface BlockTransformAttrs {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

// =============================================================================
// Asset Picker Types
// =============================================================================

/** Asset categories available in the system */
export const ASSET_CATEGORIES = [
  "all",
  "profile_picture",
  "card_image",
  "document",
  "other",
  "background",
  "texture",
  "ui_element",
  "shop_asset",
  "story_asset",
  "logo",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/** Type guard to check if a string is a valid asset category */
export function isValidAssetCategory(value: string): value is AssetCategory {
  return ASSET_CATEGORIES.includes(value as AssetCategory);
}

/** Asset object shape from the API */
export interface Asset {
  _id: string;
  fileName: string;
  blobUrl: string;
  category: string;
  contentType: string;
  size: number;
  description?: string;
}

/** Selected asset passed from picker */
export interface SelectedAsset {
  url: string;
  id: string;
  name: string;
}

// =============================================================================
// Canvas MIME Types
// =============================================================================

/** MIME types for canvas export */
export type CanvasMimeType = "image/png" | "image/jpeg";

/** Get MIME type for export format */
export function getCanvasMimeType(format: ExportFormat): CanvasMimeType {
  return format === "jpeg" ? "image/jpeg" : "image/png";
}

// =============================================================================
// Bounds/Rectangle Types
// =============================================================================

/** Rectangle bounds in percentage */
export interface PercentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Rectangle bounds in pixels */
export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
