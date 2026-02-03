/**
 * Branding System Types
 *
 * TypeScript interfaces for folders, assets, guidelines, and component props.
 */

import type { Id } from "@convex/_generated/dataModel";

// =============================================================================
// Data Types
// =============================================================================

export interface BrandingFolder {
  _id: Id<"brandingFolders">;
  _creationTime: number;
  name: string;
  parentId?: Id<"brandingFolders">;
  section: string;
  path: string;
  description?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  createdBy: Id<"users">;
}

export interface FileMetadata {
  _id: Id<"fileMetadata">;
  fileName: string;
  contentType: string;
  size: number;
  blobUrl: string;
  blobPathname?: string;
  category?: string;
  description?: string;
}

export interface BrandingAsset {
  _id: Id<"brandingAssets">;
  _creationTime: number;
  folderId: Id<"brandingFolders">;
  fileMetadataId: Id<"fileMetadata">;
  name: string;
  tags: string[];
  usageContext: string[];
  variants?: {
    theme?: string;
    orientation?: string;
    size?: string;
    custom?: Record<string, unknown>;
  };
  fileSpecs?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    transparent?: boolean;
    format?: string;
    custom?: Record<string, unknown>;
  };
  aiDescription: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface EnrichedBrandingAsset extends BrandingAsset {
  fileMetadata: FileMetadata | null;
  folder?: BrandingFolder | null;
  url?: string;
  fileName?: string;
  folderPath?: string;
}

export interface ColorSpec {
  name: string;
  hex: string;
  usage?: string;
}

export interface FontSpec {
  name: string;
  weights: number[];
  usage?: string;
}

export interface BrandVoice {
  tone: string;
  formality: number;
  keywords?: string[];
  avoid?: string[];
}

export interface StructuredData {
  colors?: ColorSpec[];
  fonts?: FontSpec[];
  brandVoice?: BrandVoice;
  customFields?: Record<string, unknown>;
}

export interface BrandingGuidelines {
  _id: Id<"brandingGuidelines">;
  _creationTime: number;
  section: string;
  structuredData: StructuredData;
  richTextContent: string;
  updatedAt: number;
  updatedBy: Id<"users">;
}

export interface FolderTreeNode {
  _id: string;
  name: string;
  section: string;
  path: string;
  description?: string;
  parentId?: string;
  children: FolderTreeNode[];
}

// =============================================================================
// Constants
// =============================================================================

export const BRANDING_SECTIONS = [
  { name: "Brand Identity", description: "Logos, wordmarks, icons, favicons" },
  { name: "Color System", description: "Palettes, swatches, gradients" },
  { name: "Typography", description: "Fonts, type specimens, usage" },
  { name: "Visual Elements", description: "Patterns, textures, graphics" },
  { name: "Marketing", description: "Social templates, banners, promos" },
  { name: "Content", description: "Newsletter headers, email signatures" },
  { name: "Photography Style", description: "Photo guidelines, examples" },
  { name: "Mascot/Characters", description: "Character assets, poses" },
  { name: "Audio/Sound", description: "Sound effects, jingles, music" },
] as const;

export type BrandingSectionName = (typeof BRANDING_SECTIONS)[number]["name"];

export const USAGE_CONTEXTS = [
  { value: "newsletter", label: "Newsletter" },
  { value: "social", label: "Social Media" },
  { value: "print", label: "Print" },
  { value: "website", label: "Website" },
  { value: "email", label: "Email" },
  { value: "merch", label: "Merchandise" },
] as const;

export type UsageContext = (typeof USAGE_CONTEXTS)[number]["value"];

export const BRAND_VOICE_TONES = [
  "Epic & Mythical",
  "Professional",
  "Playful",
  "Casual",
  "Authoritative",
  "Friendly",
  "Mysterious",
  "Inspirational",
] as const;

// =============================================================================
// Component Props
// =============================================================================

export interface BrandingSidebarProps {
  folderTree: FolderTreeNode[];
  selectedFolderId: Id<"brandingFolders"> | null;
  expandedFolders: Set<string>;
  onSelectFolder: (folderId: Id<"brandingFolders">) => void;
  onToggleExpand: (folderId: string) => void;
  isLoading?: boolean;
}

export interface BrandingBreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

export interface BrandingContentGridProps {
  folders: BrandingFolder[];
  assets: EnrichedBrandingAsset[];
  selectedFolderId: Id<"brandingFolders"> | null;
  onSelectFolder: (folderId: Id<"brandingFolders">) => void;
  onSelectAsset: (assetId: Id<"brandingAssets">) => void;
  onCreateFolder: () => void;
  onUploadAssets: () => void;
  isLoading?: boolean;
  viewMode: "grid" | "list";
}

export interface FolderCardProps {
  folder: BrandingFolder;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export interface BrandingAssetCardProps {
  asset: EnrichedBrandingAsset;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export interface AssetDetailSheetProps {
  asset: EnrichedBrandingAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<BrandingAsset>) => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (newFolderId: Id<"brandingFolders">) => Promise<void>;
  allTags: string[];
}

export interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  guidelines: BrandingGuidelines[];
  onSave: (section: string, data: Partial<BrandingGuidelines>) => Promise<void>;
}

export interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentFolder: BrandingFolder | null;
  section: string;
  onCreate: (name: string, description?: string) => Promise<void>;
}

export interface UploadAssetsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: Id<"brandingFolders">;
  onUploadComplete: () => void;
}

export interface MoveItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "folder" | "asset";
  itemName: string;
  currentFolderId: Id<"brandingFolders">;
  folderTree: FolderTreeNode[];
  onMove: (newFolderId: Id<"brandingFolders">) => Promise<void>;
}
