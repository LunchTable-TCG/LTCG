/**
 * Card Template Admin Module
 *
 * CRUD operations for managing card visual templates.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Validators
// =============================================================================

const cardTypeValidator = v.union(
  v.literal("creature"),
  v.literal("spell"),
  v.literal("trap"),
  v.literal("equipment"),
  v.literal("universal")
);

const blockTypeValidator = v.union(
  // Text blocks
  v.literal("name"),
  v.literal("level"),
  v.literal("attribute"),
  v.literal("attack"),
  v.literal("defense"),
  v.literal("cost"),
  v.literal("cardType"),
  v.literal("monsterType"),
  v.literal("effect"),
  v.literal("flavorText"),
  v.literal("custom"),
  // Image blocks
  v.literal("image"),
  v.literal("icon")
);

const imageFitValidator = v.union(
  v.literal("fill"),
  v.literal("contain"),
  v.literal("cover"),
  v.literal("none")
);

const fontWeightValidator = v.union(v.literal("normal"), v.literal("bold"));
const fontStyleValidator = v.union(v.literal("normal"), v.literal("italic"));
const textAlignValidator = v.union(v.literal("left"), v.literal("center"), v.literal("right"));

// =============================================================================
// Template Queries
// =============================================================================

/**
 * List all card templates with optional filtering
 */
export const listTemplates = query({
  args: {
    cardType: v.optional(cardTypeValidator),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("cardTemplates"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      cardType: cardTypeValidator,
      width: v.number(),
      height: v.number(),
      frameImages: v.object({
        common: v.optional(v.string()),
        uncommon: v.optional(v.string()),
        rare: v.optional(v.string()),
        epic: v.optional(v.string()),
        legendary: v.optional(v.string()),
      }),
      defaultFrameImageUrl: v.optional(v.string()),
      artworkBounds: v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
      defaultFontFamily: v.string(),
      defaultFontSize: v.number(),
      defaultFontColor: v.string(),
      isDefault: v.boolean(),
      isActive: v.boolean(),
      createdBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.number(),
      blockCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    let templates = await ctx.db.query("cardTemplates").collect();

    // Filter by card type if specified
    if (args.cardType) {
      templates = templates.filter(
        (t) => t.cardType === args.cardType || t.cardType === "universal"
      );
    }

    // Filter by active status
    if (args.activeOnly) {
      templates = templates.filter((t) => t.isActive);
    }

    // Get block counts for each template
    const templatesWithCounts = await Promise.all(
      templates.map(async (template) => {
        const blocks = await ctx.db
          .query("cardTemplateBlocks")
          .withIndex("by_template", (q) => q.eq("templateId", template._id))
          .collect();
        return {
          ...template,
          blockCount: blocks.length,
        };
      })
    );

    return templatesWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get a single template with all its blocks
 */
export const getTemplate = query({
  args: { templateId: v.id("cardTemplates") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      return null;
    }

    const blocks = await ctx.db
      .query("cardTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    // Sort blocks by zIndex
    blocks.sort((a, b) => a.zIndex - b.zIndex);

    return {
      ...template,
      blocks,
    };
  },
});

/**
 * Get the default template for a card type
 */
export const getDefaultTemplate = query({
  args: { cardType: cardTypeValidator },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Try to find a default template for this card type
    let template = await ctx.db
      .query("cardTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true).eq("cardType", args.cardType))
      .first();

    // Fall back to universal template
    if (!template) {
      template = await ctx.db
        .query("cardTemplates")
        .withIndex("by_default", (q) => q.eq("isDefault", true).eq("cardType", "universal"))
        .first();
    }

    if (!template) {
      return null;
    }

    const blocks = await ctx.db
      .query("cardTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", template._id))
      .collect();

    blocks.sort((a, b) => a.zIndex - b.zIndex);

    return {
      ...template,
      blocks,
    };
  },
});

// =============================================================================
// Template Mutations
// =============================================================================

/**
 * Create a new card template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    cardType: cardTypeValidator,
    mode: v.optional(v.union(v.literal("frame_artwork"), v.literal("full_card_image"))),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    defaultFontFamily: v.optional(v.string()),
    defaultFontSize: v.optional(v.number()),
    defaultFontColor: v.optional(v.string()),
  },
  returns: v.id("cardTemplates"),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();

    const templateId = await ctx.db.insert("cardTemplates", {
      name: args.name,
      description: args.description,
      cardType: args.cardType,
      mode: args.mode ?? "frame_artwork",
      width: args.width ?? 750,
      height: args.height ?? 1050,
      frameImages: {
        common: undefined,
        uncommon: undefined,
        rare: undefined,
        epic: undefined,
        legendary: undefined,
      },
      defaultFrameImageUrl: undefined,
      artworkBounds: {
        x: 50,
        y: 120,
        width: 650,
        height: 400,
      },
      defaultFontFamily: args.defaultFontFamily ?? "Geist Sans",
      defaultFontSize: args.defaultFontSize ?? 16,
      defaultFontColor: args.defaultFontColor ?? "#FFFFFF",
      isDefault: false,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template.create",
      metadata: { templateId, name: args.name, cardType: args.cardType },
      success: true,
    });

    return templateId;
  },
});

/**
 * Update template metadata
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    cardType: v.optional(cardTypeValidator),
    mode: v.optional(v.union(v.literal("frame_artwork"), v.literal("full_card_image"))),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    frameImages: v.optional(
      v.object({
        common: v.optional(v.string()),
        uncommon: v.optional(v.string()),
        rare: v.optional(v.string()),
        epic: v.optional(v.string()),
        legendary: v.optional(v.string()),
      })
    ),
    defaultFrameImageUrl: v.optional(v.string()),
    artworkBounds: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
    defaultFontFamily: v.optional(v.string()),
    defaultFontSize: v.optional(v.number()),
    defaultFontColor: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const { templateId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(templateId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template.update",
      metadata: { templateId, updates: Object.keys(filteredUpdates) },
      success: true,
    });
  },
});

/**
 * Set a template as the default for its card type
 */
export const setDefaultTemplate = mutation({
  args: {
    templateId: v.id("cardTemplates"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Unset any existing default for this card type
    const existingDefaults = await ctx.db
      .query("cardTemplates")
      .withIndex("by_default", (q) => q.eq("isDefault", true).eq("cardType", template.cardType))
      .collect();

    for (const existing of existingDefaults) {
      await ctx.db.patch(existing._id, { isDefault: false });
    }

    // Set this template as default
    await ctx.db.patch(args.templateId, {
      isDefault: true,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template.set_default",
      metadata: { templateId: args.templateId, cardType: template.cardType },
      success: true,
    });
  },
});

/**
 * Duplicate a template
 */
export const duplicateTemplate = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    newName: v.string(),
  },
  returns: v.id("cardTemplates"),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const blocks = await ctx.db
      .query("cardTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    const now = Date.now();

    // Create new template
    const newTemplateId = await ctx.db.insert("cardTemplates", {
      name: args.newName,
      description: template.description,
      cardType: template.cardType,
      width: template.width,
      height: template.height,
      frameImages: template.frameImages,
      defaultFrameImageUrl: template.defaultFrameImageUrl,
      artworkBounds: template.artworkBounds,
      defaultFontFamily: template.defaultFontFamily,
      defaultFontSize: template.defaultFontSize,
      defaultFontColor: template.defaultFontColor,
      isDefault: false,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate all blocks
    for (const block of blocks) {
      await ctx.db.insert("cardTemplateBlocks", {
        templateId: newTemplateId,
        blockType: block.blockType,
        label: block.label,
        customContent: block.customContent,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height,
        fontFamily: block.fontFamily,
        fontSize: block.fontSize,
        fontWeight: block.fontWeight,
        fontStyle: block.fontStyle,
        textAlign: block.textAlign,
        color: block.color,
        backgroundColor: block.backgroundColor,
        borderColor: block.borderColor,
        borderWidth: block.borderWidth,
        borderRadius: block.borderRadius,
        padding: block.padding,
        // Image block properties
        imageUrl: block.imageUrl,
        imageStorageId: block.imageStorageId,
        imageFit: block.imageFit,
        opacity: block.opacity,
        rotation: block.rotation,
        showForCardTypes: block.showForCardTypes,
        zIndex: block.zIndex,
      });
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template.duplicate",
      metadata: { sourceTemplateId: args.templateId, newTemplateId, newName: args.newName },
      success: true,
    });

    return newTemplateId;
  },
});

/**
 * Delete a template (soft delete by setting inactive)
 */
export const deleteTemplate = mutation({
  args: { templateId: v.id("cardTemplates") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "superadmin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check if any cards are using this template
    const cardsUsingTemplate = await ctx.db
      .query("cardDefinitions")
      .filter((q) => q.eq(q.field("templateId"), args.templateId))
      .first();

    if (cardsUsingTemplate) {
      throw new Error(
        "Cannot delete template that is in use by cards. Remove template from cards first."
      );
    }

    // Delete all blocks
    const blocks = await ctx.db
      .query("cardTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    // Delete template
    await ctx.db.delete(args.templateId);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template.delete",
      metadata: { templateId: args.templateId, name: template.name },
      success: true,
    });
  },
});

// =============================================================================
// Block Mutations
// =============================================================================

/**
 * Add a block to a template (text or image)
 */
export const addBlock = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    blockType: blockTypeValidator,
    label: v.string(),
    customContent: v.optional(v.string()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    fontWeight: v.optional(fontWeightValidator),
    fontStyle: v.optional(fontStyleValidator),
    textAlign: v.optional(textAlignValidator),
    color: v.optional(v.string()),
    // Image block properties
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    imageFit: v.optional(imageFitValidator),
    opacity: v.optional(v.number()),
    rotation: v.optional(v.number()),
  },
  returns: v.id("cardTemplateBlocks"),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Get highest zIndex for this template
    const existingBlocks = await ctx.db
      .query("cardTemplateBlocks")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect();

    const maxZIndex = existingBlocks.reduce((max, b) => Math.max(max, b.zIndex), 0);

    // Determine if this is an image block
    const isImageBlock = args.blockType === "image" || args.blockType === "icon";

    // Default dimensions differ for image blocks
    const defaultWidth = isImageBlock ? (args.blockType === "icon" ? 8 : 30) : 80;
    const defaultHeight = isImageBlock ? (args.blockType === "icon" ? 8 : 30) : 10;

    const blockId = await ctx.db.insert("cardTemplateBlocks", {
      templateId: args.templateId,
      blockType: args.blockType,
      label: args.label,
      customContent: args.customContent,
      x: args.x ?? 10,
      y: args.y ?? 10,
      width: args.width ?? defaultWidth,
      height: args.height ?? defaultHeight,
      fontFamily: args.fontFamily ?? template.defaultFontFamily,
      fontSize: args.fontSize ?? template.defaultFontSize,
      fontWeight: args.fontWeight ?? "normal",
      fontStyle: args.fontStyle ?? "normal",
      textAlign: args.textAlign ?? "left",
      color: args.color ?? template.defaultFontColor,
      backgroundColor: undefined,
      borderColor: undefined,
      borderWidth: undefined,
      borderRadius: undefined,
      padding: undefined,
      // Image block properties
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      imageFit: args.imageFit ?? (isImageBlock ? "contain" : undefined),
      opacity: args.opacity,
      rotation: args.rotation,
      showForCardTypes: undefined,
      zIndex: maxZIndex + 1,
    });

    // Update template timestamp
    await ctx.db.patch(args.templateId, { updatedAt: Date.now() });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template_block.create",
      metadata: { templateId: args.templateId, blockId, blockType: args.blockType },
      success: true,
    });

    return blockId;
  },
});

/**
 * Update a block's properties (text or image)
 */
export const updateBlock = mutation({
  args: {
    blockId: v.id("cardTemplateBlocks"),
    label: v.optional(v.string()),
    customContent: v.optional(v.string()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    fontWeight: v.optional(fontWeightValidator),
    fontStyle: v.optional(fontStyleValidator),
    textAlign: v.optional(textAlignValidator),
    color: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
    borderColor: v.optional(v.string()),
    borderWidth: v.optional(v.number()),
    borderRadius: v.optional(v.number()),
    padding: v.optional(v.number()),
    // Image block properties
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    imageFit: v.optional(imageFitValidator),
    opacity: v.optional(v.number()),
    rotation: v.optional(v.number()),
    showForCardTypes: v.optional(
      v.array(
        v.union(
          v.literal("creature"),
          v.literal("spell"),
          v.literal("trap"),
          v.literal("equipment")
        )
      )
    ),
    zIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const block = await ctx.db.get(args.blockId);
    if (!block) {
      throw new Error("Block not found");
    }

    const { blockId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(blockId, filteredUpdates);

    // Update template timestamp
    await ctx.db.patch(block.templateId, { updatedAt: Date.now() });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template_block.update",
      metadata: { blockId, updates: Object.keys(filteredUpdates) },
      success: true,
    });
  },
});

/**
 * Delete a block from a template
 */
export const deleteBlock = mutation({
  args: { blockId: v.id("cardTemplateBlocks") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const block = await ctx.db.get(args.blockId);
    if (!block) {
      throw new Error("Block not found");
    }

    await ctx.db.delete(args.blockId);

    // Update template timestamp
    await ctx.db.patch(block.templateId, { updatedAt: Date.now() });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template_block.delete",
      metadata: { blockId: args.blockId, templateId: block.templateId, blockType: block.blockType },
      success: true,
    });
  },
});

/**
 * Reorder blocks (update z-indices)
 */
export const reorderBlocks = mutation({
  args: {
    templateId: v.id("cardTemplates"),
    blockIds: v.array(v.id("cardTemplateBlocks")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Update z-index based on array order
    for (let i = 0; i < args.blockIds.length; i++) {
      const blockId = args.blockIds[i];
      if (blockId) {
        await ctx.db.patch(blockId, { zIndex: i });
      }
    }

    // Update template timestamp
    await ctx.db.patch(args.templateId, { updatedAt: Date.now() });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "card_template_blocks.reorder",
      metadata: { templateId: args.templateId, blockCount: args.blockIds.length },
      success: true,
    });
  },
});

// =============================================================================
// Stats Query
// =============================================================================

/**
 * Get template statistics
 */
export const getTemplateStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const templates = await ctx.db.query("cardTemplates").collect();
    const blocks = await ctx.db.query("cardTemplateBlocks").collect();

    const byType = {
      creature: 0,
      spell: 0,
      trap: 0,
      equipment: 0,
      universal: 0,
    };

    for (const t of templates) {
      if (t.isActive) {
        byType[t.cardType]++;
      }
    }

    return {
      total: templates.length,
      active: templates.filter((t) => t.isActive).length,
      defaults: templates.filter((t) => t.isDefault).length,
      totalBlocks: blocks.length,
      byType,
    };
  },
});
