import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

export default defineSchema({
  scheduledContent: defineTable({
    type: literals("blog", "x_post", "reddit", "email", "announcement", "news", "image"),
    title: v.string(),
    content: v.string(),
    scheduledFor: v.number(),
    status: literals("draft", "scheduled", "published", "failed"),
    metadata: v.object({
      slug: v.optional(v.string()),
      excerpt: v.optional(v.string()),
      featuredImage: v.optional(v.string()),
      tweetId: v.optional(v.string()),
      subreddit: v.optional(v.string()),
      redditPostId: v.optional(v.string()),
      subject: v.optional(v.string()),
      recipientType: v.optional(literals("players", "subscribers", "both", "custom")),
      recipientListId: v.optional(v.string()), // cross-component → v.string()
      templateId: v.optional(v.string()), // cross-component → v.string()
      priority: v.optional(literals("normal", "important", "urgent")),
      expiresAt: v.optional(v.number()),
      newsArticleId: v.optional(v.string()), // intra-component but nested, use v.string()
      imageUrl: v.optional(v.string()),
      altText: v.optional(v.string()),
      caption: v.optional(v.string()),
    }),
    publishedAt: v.optional(v.number()),
    publishError: v.optional(v.string()),
    authorId: v.string(), // external ref → v.string()
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scheduled", ["scheduledFor", "status"])
    .index("by_status", ["status"])
    .index("by_type", ["type", "status"])
    .index("by_author", ["authorId"])
    .index("by_date_range", ["scheduledFor"]),

  newsArticles: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    category: literals("update", "event", "patch", "announcement", "maintenance"),
    imageUrl: v.optional(v.string()),
    authorId: v.string(), // external ref → v.string()
    isPublished: v.boolean(),
    isPinned: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished", "publishedAt"])
    .index("by_category", ["category", "isPublished"])
    .index("by_pinned", ["isPinned", "isPublished"])
    .index("by_author", ["authorId"]),

  feedback: defineTable({
    userId: v.string(), // external ref → v.string()
    username: v.string(),
    type: v.union(v.literal("bug"), v.literal("feature")),
    title: v.string(),
    description: v.string(),
    screenshotUrl: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),
    pageUrl: v.string(),
    userAgent: v.string(),
    viewport: v.object({ width: v.number(), height: v.number() }),
    status: v.union(
      v.literal("new"),
      v.literal("triaged"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),
    assignedTo: v.optional(v.string()), // external ref → v.string()
    adminNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()), // external ref → v.string()
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_type_status", ["type", "status", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),
});
