/**
 * Freeform Design Admin Module
 *
 * CRUD operations for the freeform card designer.
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

const elementTypeValidator = v.union(v.literal("image"), v.literal("text"));

// =============================================================================
// Design Queries
// =============================================================================

/**
 * List all freeform designs with optional filtering
 */
export const listDesigns = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    let designs = await ctx.db
      .query("freeformDesigns")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    if (args.activeOnly) {
      designs = designs.filter((d) => d.isActive);
    }

    // Get element counts
    const designsWithCounts = await Promise.all(
      designs.map(async (design) => {
        const elements = await ctx.db
          .query("freeformElements")
          .withIndex("by_design", (q) => q.eq("designId", design._id))
          .collect();
        return {
          ...design,
          elementCount: elements.length,
        };
      })
    );

    return designsWithCounts;
  },
});

/**
 * Get a single design with all its elements
 */
export const getDesign = query({
  args: {
    designId: v.id("freeformDesigns"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const design = await ctx.db.get(args.designId);
    if (!design) return null;

    const elements = await ctx.db
      .query("freeformElements")
      .withIndex("by_design_zIndex", (q) => q.eq("designId", design._id))
      .collect();

    return { ...design, elements };
  },
});

// =============================================================================
// Design Mutations
// =============================================================================

/**
 * Create a new blank design
 */
export const createDesign = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("freeformDesigns"),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    const designId = await ctx.db.insert("freeformDesigns", {
      name: args.name,
      description: args.description,
      width: 750,
      height: 1050,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "freeform_design.create",
      metadata: { designId, name: args.name },
      success: true,
    });

    return designId;
  },
});

/**
 * Update design metadata
 */
export const updateDesign = mutation({
  args: {
    designId: v.id("freeformDesigns"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args["name"] !== undefined) updates["name"] = args["name"];
    if (args["description"] !== undefined) updates["description"] = args["description"];
    if (args["isActive"] !== undefined) updates["isActive"] = args["isActive"];
    if (args["thumbnailUrl"] !== undefined) updates["thumbnailUrl"] = args["thumbnailUrl"];

    await ctx.db.patch(args.designId, updates);
  },
});

/**
 * Duplicate a design with all its elements
 */
export const duplicateDesign = mutation({
  args: {
    designId: v.id("freeformDesigns"),
    newName: v.string(),
  },
  returns: v.id("freeformDesigns"),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");

    const now = Date.now();
    const newDesignId = await ctx.db.insert("freeformDesigns", {
      name: args.newName,
      description: design.description,
      width: design.width,
      height: design.height,
      thumbnailUrl: design.thumbnailUrl,
      isActive: true,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Copy all elements
    const elements = await ctx.db
      .query("freeformElements")
      .withIndex("by_design", (q) => q.eq("designId", args.designId))
      .collect();

    for (const el of elements) {
      const { _id, _creationTime, designId: _designId, ...rest } = el;
      await ctx.db.insert("freeformElements", {
        ...rest,
        designId: newDesignId,
      });
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "freeform_design.duplicate",
      metadata: { sourceId: args.designId, newDesignId, name: args.newName },
      success: true,
    });

    return newDesignId;
  },
});

/**
 * Delete a design and all its elements
 */
export const deleteDesign = mutation({
  args: {
    designId: v.id("freeformDesigns"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");

    // Delete all elements first
    const elements = await ctx.db
      .query("freeformElements")
      .withIndex("by_design", (q) => q.eq("designId", args.designId))
      .collect();

    for (const el of elements) {
      await ctx.db.delete(el._id);
    }

    await ctx.db.delete(args.designId);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "freeform_design.delete",
      metadata: { designId: args.designId, name: design.name },
      success: true,
    });
  },
});

// =============================================================================
// Element Mutations
// =============================================================================

/**
 * Add an element to a design
 */
export const addElement = mutation({
  args: {
    designId: v.id("freeformDesigns"),
    type: elementTypeValidator,
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    // Optional props
    imageUrl: v.optional(v.string()),
    text: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fill: v.optional(v.string()),
    align: v.optional(v.string()),
  },
  returns: v.id("freeformElements"),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const design = await ctx.db.get(args.designId);
    if (!design) throw new Error("Design not found");

    // Get highest zIndex
    const elements = await ctx.db
      .query("freeformElements")
      .withIndex("by_design_zIndex", (q) => q.eq("designId", args.designId))
      .order("desc")
      .first();

    const zIndex = elements ? elements.zIndex + 1 : 0;

    const elementId = await ctx.db.insert("freeformElements", {
      designId: args.designId,
      type: args.type,
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      rotation: 0,
      opacity: 1,
      zIndex,
      imageUrl: args.imageUrl,
      text: args.text,
      fontSize: args.fontSize ?? (args.type === "text" ? 24 : undefined),
      fontFamily: args.fontFamily ?? (args.type === "text" ? "Arial" : undefined),
      fontWeight: args.type === "text" ? "normal" : undefined,
      fontStyle: args.type === "text" ? "normal" : undefined,
      fill: args.fill ?? (args.type === "text" ? "#ffffff" : undefined),
      align: args.align ?? (args.type === "text" ? "left" : undefined),
    });

    // Touch design updatedAt
    await ctx.db.patch(args.designId, { updatedAt: Date.now() });

    return elementId;
  },
});

/**
 * Update an element's properties
 */
export const updateElement = mutation({
  args: {
    elementId: v.id("freeformElements"),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    rotation: v.optional(v.number()),
    opacity: v.optional(v.number()),
    zIndex: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    objectFit: v.optional(v.string()),
    text: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fontWeight: v.optional(v.string()),
    fontStyle: v.optional(v.string()),
    fill: v.optional(v.string()),
    align: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const element = await ctx.db.get(args.elementId);
    if (!element) throw new Error("Element not found");

    const { elementId, ...updates } = args;
    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(args.elementId, cleanUpdates);
      await ctx.db.patch(element.designId, { updatedAt: Date.now() });
    }
  },
});

/**
 * Delete an element
 */
export const deleteElement = mutation({
  args: {
    elementId: v.id("freeformElements"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const element = await ctx.db.get(args.elementId);
    if (!element) throw new Error("Element not found");

    await ctx.db.delete(args.elementId);
    await ctx.db.patch(element.designId, { updatedAt: Date.now() });
  },
});

/**
 * Batch update elements (for drag/resize operations)
 */
export const batchUpdateElements = mutation({
  args: {
    updates: v.array(
      v.object({
        elementId: v.id("freeformElements"),
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        rotation: v.optional(v.number()),
        opacity: v.optional(v.number()),
        zIndex: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    let designId: string | null = null;

    for (const update of args.updates) {
      const element = await ctx.db.get(update.elementId);
      if (!element) continue;

      if (!designId) designId = element.designId;

      const { elementId, ...changes } = update;
      const cleanChanges: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(changes)) {
        if (value !== undefined) {
          cleanChanges[key] = value;
        }
      }

      if (Object.keys(cleanChanges).length > 0) {
        await ctx.db.patch(update.elementId, cleanChanges);
      }
    }

    if (designId) {
      await ctx.db.patch(designId as any, { updatedAt: Date.now() });
    }
  },
});

/**
 * Reorder elements (update zIndex values)
 */
export const reorderElements = mutation({
  args: {
    designId: v.id("freeformDesigns"),
    elementIds: v.array(v.id("freeformElements")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Update zIndex for each element in order
    for (let i = 0; i < args.elementIds.length; i++) {
      await ctx.db.patch(args.elementIds[i], { zIndex: i });
    }

    await ctx.db.patch(args.designId, { updatedAt: Date.now() });
  },
});
