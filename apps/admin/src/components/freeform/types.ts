/**
 * Freeform Designer Types
 */

import type { Doc, Id } from "@convex/_generated/dataModel";

export type FreeformDesign = Doc<"freeformDesigns">;
export type FreeformElement = Doc<"freeformElements">;

export type ElementType = "image" | "text";

export type DesignId = Id<"freeformDesigns">;
export type ElementId = Id<"freeformElements">;

/** Design with elements loaded */
export interface DesignWithElements extends FreeformDesign {
  elements: FreeformElement[];
}

/** Design list item with element count */
export interface DesignListItem extends FreeformDesign {
  elementCount: number;
}

/** Canvas constants */
export const CANVAS_WIDTH = 750;
export const CANVAS_HEIGHT = 1050;
export const DEFAULT_ZOOM = 0.5;

export const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Impact",
  "Courier New",
] as const;

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72] as const;
