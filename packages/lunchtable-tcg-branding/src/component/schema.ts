import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  brandingFolders: defineTable({
    name: v.string(),
    parentId: v.optional(v.id("brandingFolders")), // self-ref within component
    section: v.string(),
    path: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(), // external ref → v.string()
  })
    .index("by_parent", ["parentId"])
    .index("by_section", ["section"])
    .index("by_path", ["path"]),

  brandingAssets: defineTable({
    folderId: v.id("brandingFolders"), // intra-component ref
    fileMetadataId: v.string(), // external ref → v.string()
    name: v.string(),
    tags: v.array(v.string()),
    usageContext: v.array(v.string()),
    variants: v.optional(
      v.object({
        theme: v.optional(v.string()),
        orientation: v.optional(v.string()),
        size: v.optional(v.string()),
        custom: v.optional(v.any()),
      })
    ),
    fileSpecs: v.optional(
      v.object({
        minWidth: v.optional(v.number()),
        minHeight: v.optional(v.number()),
        maxWidth: v.optional(v.number()),
        maxHeight: v.optional(v.number()),
        transparent: v.optional(v.boolean()),
        format: v.optional(v.string()),
        custom: v.optional(v.any()),
      })
    ),
    aiDescription: v.string(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_folder", ["folderId"])
    .index("by_file_metadata", ["fileMetadataId"])
    .searchIndex("search_tags", {
      searchField: "tags",
    })
    .searchIndex("search_ai_description", {
      searchField: "aiDescription",
      filterFields: ["folderId"],
    }),

  brandingGuidelines: defineTable({
    section: v.string(),
    structuredData: v.object({
      colors: v.optional(
        v.array(
          v.object({
            name: v.string(),
            hex: v.string(),
            usage: v.optional(v.string()),
          })
        )
      ),
      fonts: v.optional(
        v.array(
          v.object({
            name: v.string(),
            weights: v.array(v.number()),
            usage: v.optional(v.string()),
          })
        )
      ),
      brandVoice: v.optional(
        v.object({
          tone: v.string(),
          formality: v.number(),
          keywords: v.optional(v.array(v.string())),
          avoid: v.optional(v.array(v.string())),
        })
      ),
      customFields: v.optional(v.any()),
    }),
    richTextContent: v.string(),
    updatedAt: v.number(),
    updatedBy: v.string(), // external ref → v.string()
  }).index("by_section", ["section"]),
});
