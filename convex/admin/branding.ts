/**
 * Branding Management Module
 *
 * CRUD operations for branding folders, assets, and guidelines.
 * Provides AI integration queries for creative content generation.
 *
 * Requires admin role for mutations.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// Constants
// =============================================================================

/**
 * Predefined branding sections
 */
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

export const USAGE_CONTEXTS = [
  "newsletter",
  "social",
  "print",
  "website",
  "email",
  "merch",
] as const;

// =============================================================================
// Folder Queries
// =============================================================================

/**
 * List all folders, optionally filtered by section or parent
 */
export const listFolders = query({
  args: {
    section: v.optional(v.string()),
    parentId: v.optional(v.id("brandingFolders")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const folders = await (async () => {
      if (args.parentId !== undefined) {
        // Get children of a specific folder (including null for root)
        return await ctx.db
          .query("brandingFolders")
          .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
          .collect();
      }
      if (args.section) {
        const section = args.section;
        return await ctx.db
          .query("brandingFolders")
          .withIndex("by_section", (q) => q.eq("section", section))
          .collect();
      }
      return await ctx.db.query("brandingFolders").collect();
    })();

    type Folder = (typeof folders)[number];

    // Sort by sortOrder
    return folders.sort((a: Folder, b: Folder) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get folder tree structure for sidebar navigation
 */
export const getFolderTree = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const allFolders = await ctx.db.query("brandingFolders").collect();

    // Build tree structure
    type FolderNode = {
      _id: string;
      name: string;
      section: string;
      path: string;
      description?: string;
      parentId?: string;
      children: FolderNode[];
    };

    const folderMap = new Map<string, FolderNode>();
    const roots: FolderNode[] = [];

    // First pass: create all nodes
    for (const folder of allFolders) {
      folderMap.set(folder._id, {
        _id: folder._id,
        name: folder.name,
        section: folder.section,
        path: folder.path,
        description: folder.description,
        parentId: folder.parentId,
        children: [],
      });
    }

    // Second pass: build tree
    for (const folder of allFolders) {
      const node = folderMap.get(folder._id);
      if (!node) {
        continue;
      }
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    // Sort children by section order for roots, then by sortOrder
    const sectionOrder: string[] = BRANDING_SECTIONS.map((s) => s.name);
    roots.sort((a, b) => {
      const aIndex = sectionOrder.indexOf(a.section as string);
      const bIndex = sectionOrder.indexOf(b.section as string);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });

    return roots;
  },
});

/**
 * Get a single folder by ID
 */
export const getFolder = query({
  args: { folderId: v.id("brandingFolders") },
  handler: async (ctx, { folderId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db.get(folderId);
  },
});

/**
 * Get folder by path
 */
export const getFolderByPath = query({
  args: { path: v.string() },
  handler: async (ctx, { path }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db
      .query("brandingFolders")
      .withIndex("by_path", (q) => q.eq("path", path))
      .unique();
  },
});

// =============================================================================
// Folder Mutations
// =============================================================================

/**
 * Create a new folder
 */
export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("brandingFolders")),
    section: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate section
    const validSection = BRANDING_SECTIONS.find((s) => s.name === args.section);
    if (!validSection) {
      throw new Error(`Invalid section: ${args.section}`);
    }

    // Build path
    let path = args.name;
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent) throw new Error("Parent folder not found");
      path = `${parent.path}/${args.name}`;
    }

    // Check for duplicate path
    const existing = await ctx.db
      .query("brandingFolders")
      .withIndex("by_path", (q) => q.eq("path", path))
      .unique();
    if (existing) {
      throw new Error(`Folder already exists at path: ${path}`);
    }

    // Get sort order (append to end)
    const siblings = await ctx.db
      .query("brandingFolders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
    const maxSortOrder = Math.max(0, ...siblings.map((s) => s.sortOrder));

    const now = Date.now();
    const folderId = await ctx.db.insert("brandingFolders", {
      name: args.name,
      parentId: args.parentId,
      section: args.section,
      path,
      description: args.description,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    return { folderId, path };
  },
});

/**
 * Update a folder
 */
export const updateFolder = mutation({
  args: {
    folderId: v.id("brandingFolders"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined && args.name !== folder.name) {
      // Update path for this folder and all descendants
      const oldPath = folder.path;
      const newPath = folder.parentId
        ? `${(await ctx.db.get(folder.parentId))?.path}/${args.name}`
        : args.name;

      updates["name"] = args.name;
      updates["path"] = newPath;

      // Update all descendant paths
      const allFolders = await ctx.db.query("brandingFolders").collect();
      for (const f of allFolders) {
        if (f.path.startsWith(`${oldPath}/`)) {
          await ctx.db.patch(f._id, {
            path: f.path.replace(oldPath, newPath),
            updatedAt: Date.now(),
          });
        }
      }
    }

    if (args.description !== undefined) {
      updates["description"] = args.description;
    }

    await ctx.db.patch(args.folderId, updates);
    return { success: true };
  },
});

/**
 * Move a folder to a new parent
 */
export const moveFolder = mutation({
  args: {
    folderId: v.id("brandingFolders"),
    newParentId: v.optional(v.id("brandingFolders")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    // Can't move root section folders
    if (!folder.parentId && BRANDING_SECTIONS.some((s) => s.name === folder.name)) {
      throw new Error("Cannot move root section folders");
    }

    // Prevent moving into itself or descendants
    if (args.newParentId) {
      const newParent = await ctx.db.get(args.newParentId);
      if (!newParent) throw new Error("New parent not found");
      if (newParent.path.startsWith(folder.path)) {
        throw new Error("Cannot move folder into its own descendant");
      }
    }

    const oldPath = folder.path;
    const newPath = args.newParentId
      ? `${(await ctx.db.get(args.newParentId))?.path}/${folder.name}`
      : folder.name;

    // Update this folder
    await ctx.db.patch(args.folderId, {
      parentId: args.newParentId,
      path: newPath,
      updatedAt: Date.now(),
    });

    // Update all descendant paths
    const allFolders = await ctx.db.query("brandingFolders").collect();
    for (const f of allFolders) {
      if (f.path.startsWith(`${oldPath}/`)) {
        await ctx.db.patch(f._id, {
          path: f.path.replace(oldPath, newPath),
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, newPath };
  },
});

/**
 * Delete a folder and optionally its contents
 */
export const deleteFolder = mutation({
  args: {
    folderId: v.id("brandingFolders"),
    deleteContents: v.optional(v.boolean()), // if false, will fail if not empty
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    // Can't delete root section folders
    if (!folder.parentId && BRANDING_SECTIONS.some((s) => s.name === folder.name)) {
      throw new Error("Cannot delete root section folders");
    }

    // Check for children
    const children = await ctx.db
      .query("brandingFolders")
      .withIndex("by_parent", (q) => q.eq("parentId", args.folderId))
      .collect();

    // Check for assets
    const assets = await ctx.db
      .query("brandingAssets")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    if ((children.length > 0 || assets.length > 0) && !args.deleteContents) {
      throw new Error("Folder is not empty. Set deleteContents=true to delete everything.");
    }

    // Delete assets in this folder
    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }

    // Recursively delete children
    for (const child of children) {
      // Recursive call through mutation (simplified - in production might want scheduler)
      const grandchildren = await ctx.db
        .query("brandingFolders")
        .withIndex("by_parent", (q) => q.eq("parentId", child._id))
        .collect();

      const childAssets = await ctx.db
        .query("brandingAssets")
        .withIndex("by_folder", (q) => q.eq("folderId", child._id))
        .collect();

      for (const asset of childAssets) {
        await ctx.db.delete(asset._id);
      }

      for (const gc of grandchildren) {
        await ctx.db.delete(gc._id);
      }

      await ctx.db.delete(child._id);
    }

    await ctx.db.delete(args.folderId);
    return { success: true, deletedAssets: assets.length, deletedFolders: children.length + 1 };
  },
});

// =============================================================================
// Asset Queries
// =============================================================================

/**
 * List assets in a folder
 */
export const listAssets = query({
  args: {
    folderId: v.id("brandingFolders"),
  },
  handler: async (ctx, { folderId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const assets = await ctx.db
      .query("brandingAssets")
      .withIndex("by_folder", (q) => q.eq("folderId", folderId))
      .collect();

    // Enrich with file metadata
    const enrichedAssets = await Promise.all(
      assets.map(async (asset) => {
        const fileMetadata = await ctx.db.get(asset.fileMetadataId);
        return {
          ...asset,
          fileMetadata,
        };
      })
    );

    return enrichedAssets.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get a single asset by ID
 */
export const getAsset = query({
  args: { assetId: v.id("brandingAssets") },
  handler: async (ctx, { assetId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const asset = await ctx.db.get(assetId);
    if (!asset) return null;

    const fileMetadata = await ctx.db.get(asset.fileMetadataId);
    const folder = await ctx.db.get(asset.folderId);

    return {
      ...asset,
      fileMetadata,
      folder,
    };
  },
});

/**
 * Get all unique tags used in branding assets
 */
export const getAllTags = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const assets = await ctx.db.query("brandingAssets").collect();
    const tagSet = new Set<string>();
    for (const asset of assets) {
      for (const tag of asset.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  },
});

// =============================================================================
// Asset Mutations
// =============================================================================

/**
 * Create a new branding asset
 */
export const createAsset = mutation({
  args: {
    folderId: v.id("brandingFolders"),
    fileMetadataId: v.id("fileMetadata"),
    name: v.string(),
    tags: v.array(v.string()),
    usageContext: v.array(v.string()),
    variants: v.optional(v.any()),
    fileSpecs: v.optional(v.any()),
    aiDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate folder exists
    const folder = await ctx.db.get(args.folderId);
    if (!folder) throw new Error("Folder not found");

    // Validate file metadata exists
    const fileMetadata = await ctx.db.get(args.fileMetadataId);
    if (!fileMetadata) throw new Error("File metadata not found");

    // Get sort order
    const siblings = await ctx.db
      .query("brandingAssets")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
    const maxSortOrder = Math.max(0, ...siblings.map((s) => s.sortOrder));

    const now = Date.now();
    const assetId = await ctx.db.insert("brandingAssets", {
      folderId: args.folderId,
      fileMetadataId: args.fileMetadataId,
      name: args.name,
      tags: args.tags,
      usageContext: args.usageContext,
      variants: args.variants,
      fileSpecs: args.fileSpecs,
      aiDescription: args.aiDescription,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return { assetId };
  },
});

/**
 * Update a branding asset
 */
export const updateAsset = mutation({
  args: {
    assetId: v.id("brandingAssets"),
    name: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    usageContext: v.optional(v.array(v.string())),
    variants: v.optional(v.any()),
    fileSpecs: v.optional(v.any()),
    aiDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error("Asset not found");

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.tags !== undefined) updates["tags"] = args.tags;
    if (args.usageContext !== undefined) updates["usageContext"] = args.usageContext;
    if (args.variants !== undefined) updates["variants"] = args.variants;
    if (args.fileSpecs !== undefined) updates["fileSpecs"] = args.fileSpecs;
    if (args.aiDescription !== undefined) updates["aiDescription"] = args.aiDescription;

    await ctx.db.patch(args.assetId, updates);
    return { success: true };
  },
});

/**
 * Move an asset to a different folder
 */
export const moveAsset = mutation({
  args: {
    assetId: v.id("brandingAssets"),
    newFolderId: v.id("brandingFolders"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const asset = await ctx.db.get(args.assetId);
    if (!asset) throw new Error("Asset not found");

    const newFolder = await ctx.db.get(args.newFolderId);
    if (!newFolder) throw new Error("Target folder not found");

    // Get sort order in new folder
    const siblings = await ctx.db
      .query("brandingAssets")
      .withIndex("by_folder", (q) => q.eq("folderId", args.newFolderId))
      .collect();
    const maxSortOrder = Math.max(0, ...siblings.map((s) => s.sortOrder));

    await ctx.db.patch(args.assetId, {
      folderId: args.newFolderId,
      sortOrder: maxSortOrder + 1,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a branding asset (does not delete the underlying file)
 */
export const deleteAsset = mutation({
  args: {
    assetId: v.id("brandingAssets"),
  },
  handler: async (ctx, { assetId }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const asset = await ctx.db.get(assetId);
    if (!asset) throw new Error("Asset not found");

    await ctx.db.delete(assetId);
    return { success: true };
  },
});

// =============================================================================
// Guidelines Queries
// =============================================================================

/**
 * Get guidelines for a section (or global)
 */
export const getGuidelines = query({
  args: {
    section: v.string(), // "global" or section name
  },
  handler: async (ctx, { section }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db
      .query("brandingGuidelines")
      .withIndex("by_section", (q) => q.eq("section", section))
      .unique();
  },
});

/**
 * Get all guidelines
 */
export const getAllGuidelines = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db.query("brandingGuidelines").collect();
  },
});

// =============================================================================
// Guidelines Mutations
// =============================================================================

/**
 * Update or create guidelines for a section
 */
export const updateGuidelines = mutation({
  args: {
    section: v.string(),
    structuredData: v.optional(v.any()),
    richTextContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const existing = await ctx.db
      .query("brandingGuidelines")
      .withIndex("by_section", (q) => q.eq("section", args.section))
      .unique();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = {
        updatedAt: now,
        updatedBy: userId,
      };
      if (args.structuredData !== undefined) {
        updates["structuredData"] = args.structuredData;
      }
      if (args.richTextContent !== undefined) {
        updates["richTextContent"] = args.richTextContent;
      }
      await ctx.db.patch(existing._id, updates);
      return { guidelinesId: existing._id };
    }
    const guidelinesId = await ctx.db.insert("brandingGuidelines", {
      section: args.section,
      structuredData: args.structuredData ?? {
        colors: [],
        fonts: [],
        brandVoice: undefined,
        customFields: undefined,
      },
      richTextContent: args.richTextContent ?? "",
      updatedAt: now,
      updatedBy: userId,
    });
    return { guidelinesId };
  },
});

// =============================================================================
// AI Integration Queries
// =============================================================================

/**
 * Get brand guidelines formatted for AI prompt injection
 */
export const getBrandGuidelinesForAI = query({
  args: {},
  handler: async (ctx) => {
    // No auth required - this is for internal AI use
    const globalGuidelines = await ctx.db
      .query("brandingGuidelines")
      .withIndex("by_section", (q) => q.eq("section", "global"))
      .unique();

    if (!globalGuidelines) {
      return {
        structured: null,
        richText: "",
        lastUpdated: null,
      };
    }

    return {
      structured: globalGuidelines.structuredData,
      richText: globalGuidelines.richTextContent,
      lastUpdated: globalGuidelines.updatedAt,
    };
  },
});

/**
 * Search branding assets by query and context (RAG-style)
 */
export const searchBrandingAssets = query({
  args: {
    query: v.string(),
    usageContext: v.optional(v.array(v.string())),
    section: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get all assets (in production, would use search index)
    let assets = await ctx.db.query("brandingAssets").collect();

    // Filter by section if provided
    if (args.section) {
      const section = args.section;
      const foldersInSection = await ctx.db
        .query("brandingFolders")
        .withIndex("by_section", (q) => q.eq("section", section))
        .collect();
      const folderIds = new Set(foldersInSection.map((f) => f._id));
      assets = assets.filter((a) => folderIds.has(a.folderId));
    }

    // Filter by usage context if provided
    if (args.usageContext && args.usageContext.length > 0) {
      assets = assets.filter((a) => args.usageContext?.some((ctx) => a.usageContext.includes(ctx)));
    }

    // Simple text search in name, tags, and aiDescription
    const queryLower = args.query.toLowerCase();
    const scored = assets.map((asset) => {
      let score = 0;
      if (asset.name.toLowerCase().includes(queryLower)) score += 3;
      if (asset.tags.some((t) => t.toLowerCase().includes(queryLower))) score += 2;
      if (asset.aiDescription.toLowerCase().includes(queryLower)) score += 1;
      return { asset, score };
    });

    // Filter to matches and sort by score
    const matches = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.asset);

    // Enrich with file metadata and folder info
    const enriched = await Promise.all(
      matches.map(async (asset) => {
        const fileMetadata = await ctx.db.get(asset.fileMetadataId);
        const folder = await ctx.db.get(asset.folderId);
        return {
          ...asset,
          url: fileMetadata?.blobUrl,
          fileName: fileMetadata?.fileName,
          folderPath: folder?.path,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get assets for a specific usage context
 */
export const getAssetsForContext = query({
  args: {
    context: v.string(), // "newsletter", "social", "print", etc.
  },
  handler: async (ctx, { context }) => {
    const assets = await ctx.db.query("brandingAssets").collect();

    // Filter by usage context
    const filtered = assets.filter((a) => a.usageContext.includes(context));

    // Enrich with file metadata
    const enriched = await Promise.all(
      filtered.map(async (asset) => {
        const fileMetadata = await ctx.db.get(asset.fileMetadataId);
        const folder = await ctx.db.get(asset.folderId);
        return {
          ...asset,
          url: fileMetadata?.blobUrl,
          fileName: fileMetadata?.fileName,
          contentType: fileMetadata?.contentType,
          folderPath: folder?.path,
          section: folder?.section,
        };
      })
    );

    return enriched;
  },
});

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize branding system with predefined sections
 */
export const initializeBranding = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    let createdCount = 0;

    // Create root folders for each section
    for (let i = 0; i < BRANDING_SECTIONS.length; i++) {
      const section = BRANDING_SECTIONS[i];
      if (!section) continue;

      // Check if already exists
      const existing = await ctx.db
        .query("brandingFolders")
        .withIndex("by_path", (q) => q.eq("path", section.name))
        .unique();

      if (!existing) {
        await ctx.db.insert("brandingFolders", {
          name: section.name,
          parentId: undefined,
          section: section.name,
          path: section.name,
          description: section.description,
          sortOrder: i + 1,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        });
        createdCount++;
      }
    }

    // Create global guidelines if not exists
    const globalGuidelines = await ctx.db
      .query("brandingGuidelines")
      .withIndex("by_section", (q) => q.eq("section", "global"))
      .unique();

    if (!globalGuidelines) {
      await ctx.db.insert("brandingGuidelines", {
        section: "global",
        structuredData: {
          colors: [
            { name: "Primary", hex: "#FFD700", usage: "Main brand color" },
            { name: "Secondary", hex: "#1A1A2E", usage: "Dark backgrounds" },
            { name: "Accent", hex: "#E94560", usage: "Highlights and CTAs" },
          ],
          fonts: [
            { name: "Cinzel", weights: [400, 700], usage: "Headings" },
            { name: "Inter", weights: [400, 500, 600], usage: "Body text" },
          ],
          brandVoice: {
            tone: "Epic & Mythical",
            formality: 6,
            keywords: ["legendary", "adventure", "strategy", "glory"],
            avoid: ["corporate", "boring", "generic"],
          },
        },
        richTextContent: `# Brand Guidelines

## Overview
Write content that feels epic and immersive, like narration from a fantasy tale.

## Tone of Voice
- Speak like a wise narrator from a fantasy epic
- Use active voice, avoid corporate jargon
- Inject subtle humor but never break immersion

## Logo Usage
- Always maintain minimum clear space of 20px
- Never place on busy backgrounds
- Use dark variant on light backgrounds, vice versa
`,
        updatedAt: now,
        updatedBy: userId,
      });
      createdCount++;
    }

    return {
      success: true,
      createdFolders: createdCount > 0 ? createdCount - 1 : 0,
      createdGuidelines: globalGuidelines ? 0 : 1,
      message:
        createdCount > 0
          ? `Initialized branding system with ${createdCount} items`
          : "Branding system already initialized",
    };
  },
});
