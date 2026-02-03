/**
 * Vercel Blob Storage Utilities
 *
 * Provides helpers for uploading and serving assets from Vercel Blob storage.
 * All static assets (images, videos) should be stored in Blob for better
 * performance and CDN distribution.
 */

import { put, del, list, type PutBlobResult } from "@vercel/blob";

// =============================================================================
// Constants
// =============================================================================

/**
 * Base URL for blob assets - set after initial upload
 * Format: https://<store-id>.public.blob.vercel-storage.com
 */
const BLOB_BASE_URL = process.env["NEXT_PUBLIC_BLOB_BASE_URL"] || "";

/**
 * Asset path mappings from old public paths to blob paths
 * This allows gradual migration without breaking existing code
 */
const ASSET_PATH_MAP: Record<string, string> = {
  // Logos
  "/assets/logo-main.png": "logo-main.png",
  "/assets/logo-icon.png": "logo-icon.png",

  // Backgrounds
  "/assets/backgrounds/auth-bg.png": "backgrounds/auth-bg.png",
  "/assets/backgrounds/profile-bg.png": "backgrounds/profile-bg.png",
  "/assets/backgrounds/social-bg.png": "backgrounds/social-bg.png",
  "/assets/backgrounds/story-bg.png": "backgrounds/story-bg.png",
  "/assets/backgrounds/game_arena_background.png": "backgrounds/game_arena_background.png",
  "/assets/backgrounds/shop-bg.png": "backgrounds/shop-bg.png",
  "/assets/backgrounds/quests-bg.png": "backgrounds/quests-bg.png",
  "/assets/backgrounds/decks-bg.png": "backgrounds/decks-bg.png",
  "/assets/backgrounds/collection-bg.png": "backgrounds/collection-bg.png",
  "/assets/backgrounds/arena_grimoire.png": "backgrounds/arena_grimoire.png",
  "/assets/dashboard-bg.jpg": "dashboard-bg.jpg",

  // Textures
  "/assets/textures/parchment.png": "textures/parchment.png",
  "/assets/textures/leather.png": "textures/leather.png",
  "/assets/parchment-frame.png": "parchment-frame.png",

  // UI Elements
  "/assets/ui/fantasy_gold_metal.png": "ui/fantasy_gold_metal.png",
  "/assets/ui/fantasy_panel_bg.png": "ui/fantasy_panel_bg.png",
  "/assets/ui/fantasy_wood_btn.png": "ui/fantasy_wood_btn.png",
  "/assets/ui/button-bg.png": "ui/button-bg.png",
  "/assets/ui/corner_ornament.png": "ui/corner_ornament.png",
  "/assets/ui/panel_grimoire.png": "ui/panel_grimoire.png",
  "/assets/ui/buttons_fantasy.png": "ui/buttons_fantasy.png",
  "/assets/ui/header_banner.png": "ui/header_banner.png",
  "/assets/card-bg.svg": "card-bg.svg",

  // Props
  "/assets/props/mana_crystal.png": "props/mana_crystal.png",
  "/assets/props/ancient_key.png": "props/ancient_key.png",
  "/assets/props/scroll.png": "props/scroll.png",

  // Card backs
  "/assets/cards/back_starter.png": "cards/back_starter.png",
  "/assets/cards/back_premium.png": "cards/back_premium.png",
  "/assets/cards/back_fire.png": "cards/back_fire.png",

  // Shop
  "/assets/shop/pack.png": "shop/pack.png",
  "/assets/shop/box.png": "shop/box.png",
  "/assets/shop/starter-pack.png": "shop/starter-pack.png",
  "/assets/shop/premium-pack.png": "shop/premium-pack.png",
  "/assets/shop/packopening.mp4": "shop/packopening.mp4",

  // Story characters
  "/assets/story/mechanical_constructs.png": "story/mechanical_constructs.png",
  "/assets/story/undead_legion.png": "story/undead_legion.png",
  "/assets/story/storm_elementals.png": "story/storm_elementals.png",
  "/assets/story/nature_spirits.png": "story/nature_spirits.png",
  "/assets/story/divine_knights.png": "story/divine_knights.png",
  "/assets/story/arcane_mages.png": "story/arcane_mages.png",
  "/assets/story/shadow_assassins.png": "story/shadow_assassins.png",
  "/assets/story/celestial_guardians.png": "story/celestial_guardians.png",
  "/assets/story/abyssal_horrors.png": "story/abyssal_horrors.png",
  "/assets/story/infernal_dragons.png": "story/infernal_dragons.png",
};

// =============================================================================
// Asset URL Helper
// =============================================================================

/**
 * Get the URL for an asset, using Blob storage if available, falling back to public path.
 *
 * @param publicPath - The original public path (e.g., "/assets/logo-main.png")
 * @returns The blob URL if configured, otherwise the original public path
 *
 * @example
 * // With blob configured:
 * getAssetUrl("/assets/logo-main.png")
 * // Returns: "https://xxx.public.blob.vercel-storage.com/logos/logo-main.png"
 *
 * // Without blob configured (fallback):
 * getAssetUrl("/assets/logo-main.png")
 * // Returns: "/assets/logo-main.png"
 */
export function getAssetUrl(publicPath: string): string {
  // If no blob base URL configured, return original path
  if (!BLOB_BASE_URL) {
    return publicPath;
  }

  // Check if we have a mapping for this path
  const blobPath = ASSET_PATH_MAP[publicPath];
  if (blobPath) {
    return `${BLOB_BASE_URL}/${blobPath}`;
  }

  // For dynamic story assets, try to construct the blob path
  if (publicPath.startsWith("/assets/story/")) {
    const filename = publicPath.replace("/assets/story/", "");
    return `${BLOB_BASE_URL}/story/${filename}`;
  }

  // Fallback to original path
  return publicPath;
}

/**
 * Get blob URL directly from blob path
 */
export function getBlobUrl(blobPath: string): string {
  if (!BLOB_BASE_URL) {
    throw new Error("NEXT_PUBLIC_BLOB_BASE_URL is not configured");
  }
  return `${BLOB_BASE_URL}/${blobPath}`;
}

// =============================================================================
// Upload Utilities (Server-side only)
// =============================================================================

/**
 * Upload a file to Vercel Blob storage
 * This should only be called from server-side code (API routes, server actions)
 *
 * @param file - The file buffer or readable stream
 * @param pathname - The path to store the file at (e.g., "logos/logo-main.png")
 * @param options - Additional options
 * @returns The blob result with URL
 */
export async function uploadToBlob(
  file: Buffer | ReadableStream,
  pathname: string,
  options?: {
    contentType?: string;
    access?: "public";
  }
): Promise<PutBlobResult> {
  const result = await put(pathname, file, {
    access: options?.access || "public",
    contentType: options?.contentType,
  });

  return result;
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}

/**
 * List files in Vercel Blob storage
 */
export async function listBlobs(options?: { prefix?: string; limit?: number }) {
  const result = await list({
    prefix: options?.prefix,
    limit: options?.limit,
  });

  return result;
}

// =============================================================================
// Content Type Helpers
// =============================================================================

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

/**
 * Get content type from file extension
 */
export function getContentType(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}
