/**
 * Asset Types
 *
 * Shared type definitions for asset management components.
 */

import type { Id } from "@convex/_generated/dataModel";

export type AssetCategory =
  | "profile_picture"
  | "card_image"
  | "document"
  | "other"
  | "background"
  | "texture"
  | "ui_element"
  | "shop_asset"
  | "story_asset"
  | "logo";

export interface Asset {
  _id: Id<"fileMetadata">;
  _creationTime: number;
  userId: Id<"users">;
  storageId: string;
  fileName: string;
  contentType: string;
  size: number;
  category: AssetCategory;
  blobUrl?: string;
  blobPathname?: string;
  description?: string;
  uploadedAt: number;
}

export const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: "background", label: "Background" },
  { value: "texture", label: "Texture" },
  { value: "ui_element", label: "UI Element" },
  { value: "shop_asset", label: "Shop Asset" },
  { value: "story_asset", label: "Story Asset" },
  { value: "logo", label: "Logo" },
  { value: "card_image", label: "Card Image" },
  { value: "profile_picture", label: "Profile Picture" },
  { value: "document", label: "Document" },
  { value: "other", label: "Other" },
];
