#!/usr/bin/env bun
/**
 * Upload Assets to Vercel Blob
 *
 * This script uploads all static assets from the public folder to Vercel Blob storage.
 * Run with: bun run scripts/upload-assets-to-blob.ts
 *
 * Prerequisites:
 * - BLOB_READ_WRITE_TOKEN environment variable must be set
 */

import { put, list } from "@vercel/blob";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";

// =============================================================================
// Configuration
// =============================================================================

const PUBLIC_DIR = join(import.meta.dir, "../apps/web/public/assets");
const DRY_RUN = process.argv.includes("--dry-run");

const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".mp4",
  ".webm",
  ".mp3",
  ".wav",
]);

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

// =============================================================================
// Helpers
// =============================================================================

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function getContentType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// =============================================================================
// Main Upload Function
// =============================================================================

async function uploadAssets() {
  console.log("🚀 Vercel Blob Asset Upload\n");

  // Check for token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ BLOB_READ_WRITE_TOKEN environment variable is not set");
    console.log("\nSet it with:");
    console.log('  export BLOB_READ_WRITE_TOKEN="your_token_here"');
    process.exit(1);
  }

  // Get all files
  console.log(`📁 Scanning ${PUBLIC_DIR}...\n`);
  const files = await getAllFiles(PUBLIC_DIR);
  console.log(`Found ${files.length} files to upload\n`);

  if (DRY_RUN) {
    console.log("🔍 DRY RUN - No files will be uploaded\n");
  }

  // Track results
  const results: { path: string; url: string; size: number }[] = [];
  let totalSize = 0;
  let errors: { path: string; error: string }[] = [];

  // Upload each file
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relativePath = relative(PUBLIC_DIR, filePath);
    const blobPath = relativePath; // Keep the same structure

    try {
      const fileBuffer = await readFile(filePath);
      const fileStats = await stat(filePath);
      const contentType = getContentType(filePath);

      console.log(`[${i + 1}/${files.length}] ${relativePath}`);
      console.log(`  Size: ${formatBytes(fileStats.size)}, Type: ${contentType}`);

      if (!DRY_RUN) {
        const result = await put(blobPath, fileBuffer, {
          access: "public",
          contentType,
        });

        results.push({
          path: relativePath,
          url: result.url,
          size: fileStats.size,
        });

        console.log(`  ✅ Uploaded: ${result.url}`);
      } else {
        console.log(`  Would upload to: ${blobPath}`);
      }

      totalSize += fileStats.size;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Error: ${errorMessage}`);
      errors.push({ path: relativePath, error: errorMessage });
    }

    console.log("");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Upload Summary\n");
  console.log(`Total files: ${files.length}`);
  console.log(`Successful: ${results.length}`);
  console.log(`Failed: ${errors.length}`);
  console.log(`Total size: ${formatBytes(totalSize)}`);

  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const err of errors) {
      console.log(`  - ${err.path}: ${err.error}`);
    }
  }

  // Output the base URL
  if (results.length > 0) {
    const sampleUrl = results[0].url;
    const baseUrl = sampleUrl.substring(0, sampleUrl.lastIndexOf("/"));
    // Extract just the store base URL (before the file path)
    const parts = new URL(sampleUrl);
    const storeBaseUrl = `${parts.protocol}//${parts.host}`;

    console.log("\n🔗 Blob Store Base URL:");
    console.log(`  ${storeBaseUrl}`);
    console.log("\n📝 Add this to your .env.local:");
    console.log(`  NEXT_PUBLIC_BLOB_BASE_URL=${storeBaseUrl}`);
  }

  // Generate URL mapping for reference
  if (!DRY_RUN && results.length > 0) {
    console.log("\n📋 Uploaded Assets:");
    console.log("```");
    for (const r of results) {
      console.log(`${r.path}: ${r.url}`);
    }
    console.log("```");
  }
}

// =============================================================================
// List Existing Blobs
// =============================================================================

async function listExistingBlobs() {
  console.log("📂 Listing existing blobs...\n");

  try {
    const { blobs } = await list();

    if (blobs.length === 0) {
      console.log("No blobs found in storage.");
      return;
    }

    console.log(`Found ${blobs.length} blobs:\n`);
    for (const blob of blobs) {
      console.log(`- ${blob.pathname}`);
      console.log(`  URL: ${blob.url}`);
      console.log(`  Size: ${formatBytes(blob.size)}`);
      console.log("");
    }
  } catch (error) {
    console.error("Error listing blobs:", error);
  }
}

// =============================================================================
// Main
// =============================================================================

const command = process.argv[2];

if (command === "list") {
  await listExistingBlobs();
} else {
  await uploadAssets();
}
