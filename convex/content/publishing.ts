import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import type { Doc } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { getNotificationSetting } from "../lib/preferenceHelpers";
import { requireRole } from "../lib/roles";
import type { EmailRecipientType } from "../schema";

/**
 * Content Publishing System
 * Handles automated publishing of scheduled content
 *
 * Supports:
 * - Blog posts (creates newsArticle)
 * - X/Twitter posts (external API)
 * - Reddit posts (external API)
 * - Emails (via Resend)
 * - Announcements (in-game broadcast)
 * - News (links to existing)
 * - Images (upload/URL)
 */

// ============================================================================
// PUBLISHING ACTION
// ============================================================================

export const publishContent = internalAction({
  args: { contentId: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    // Get content
    const content = await ctx.runQuery(internalAny.content.publishing._getContent, {
      id: args.contentId,
    });

    if (!content) {
      console.error(`Content not found: ${args.contentId}`);
      return;
    }

    if (content.status !== "scheduled") {
      console.log(`Content ${args.contentId} is not scheduled, skipping`);
      return;
    }

    try {
      // Publish based on type
      switch (content.type) {
        case "blog":
          await publishBlog(ctx, content);
          break;
        case "x_post":
          await publishXPost(ctx, content);
          break;
        case "reddit":
          await publishReddit(ctx, content);
          break;
        case "email":
          await publishEmail(ctx, content);
          break;
        case "announcement":
          await publishAnnouncement(ctx, content);
          break;
        case "news":
          await publishNews(ctx, content);
          break;
        case "image":
          await publishImage(ctx, content);
          break;
      }

      // Mark as published
      await ctx.runMutation(internalAny.content.publishing._markPublished, {
        id: args.contentId,
      });
    } catch (error) {
      console.error(`Failed to publish content ${args.contentId}:`, error);

      // Mark as failed
      await ctx.runMutation(internalAny.content.publishing._markFailed, {
        id: args.contentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// ============================================================================
// TYPE-SPECIFIC PUBLISHERS
// ============================================================================

async function publishBlog(ctx: ActionCtx, content: Doc<"scheduledContent">) {
  // Create a news article from the blog content
  await ctx.runMutation(internalAny.content.publishing._createNewsArticle, {
    title: content.title,
    slug: content.metadata.slug ?? generateSlug(content.title),
    excerpt: content.metadata.excerpt ?? content.content.slice(0, 200),
    content: content.content,
    imageUrl: content.metadata.featuredImage,
    authorId: content.authorId,
  });
}

async function publishXPost(_ctx: unknown, content: Doc<"scheduledContent">) {
  // X/Twitter API integration
  const apiKey = process.env["X_API_KEY"];
  const apiSecret = process.env["X_API_SECRET"];
  const accessToken = process.env["X_ACCESS_TOKEN"];
  const accessSecret = process.env["X_ACCESS_SECRET"];

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log("X/Twitter API not configured - logging post:");
    console.log(`[X POST] ${content.content}`);
    return;
  }

  // TODO: Implement actual X API call using OAuth 1.0a
  // For now, just log
  console.log(`[X POST] Would post to X: ${content.content.slice(0, 280)}`);
}

async function publishReddit(_ctx: unknown, content: Doc<"scheduledContent">) {
  const clientId = process.env["REDDIT_CLIENT_ID"];
  const clientSecret = process.env["REDDIT_CLIENT_SECRET"];
  const username = process.env["REDDIT_USERNAME"];
  const password = process.env["REDDIT_PASSWORD"];

  if (!clientId || !clientSecret || !username || !password) {
    console.log("Reddit API not configured - logging post:");
    console.log(`[REDDIT] r/${content.metadata.subreddit}: ${content.title}`);
    return;
  }

  // TODO: Implement actual Reddit API call
  console.log(`[REDDIT] Would post to r/${content.metadata.subreddit}: ${content.title}`);
}

async function publishEmail(ctx: ActionCtx, content: Doc<"scheduledContent">) {
  // Use the email send system
  await ctx.runMutation(internalAny.content.publishing._sendEmailCampaign, {
    contentId: content._id,
    subject: content.metadata.subject ?? content.title,
    body: content.content,
    recipientType: content.metadata.recipientType ?? "players",
    listId: content.metadata.recipientListId,
  });
}

async function publishAnnouncement(ctx: ActionCtx, content: Doc<"scheduledContent">) {
  // Use existing broadcast system
  await ctx.runMutation(internalAny.content.publishing._broadcastAnnouncement, {
    message: content.content,
    priority: content.metadata.priority ?? "normal",
    expiresAt: content.metadata.expiresAt,
  });
}

async function publishNews(ctx: ActionCtx, content: Doc<"scheduledContent">) {
  // If linking to existing news, just mark as published
  if (content.metadata.newsArticleId) {
    // Optionally publish the linked news article
    await ctx.runMutation(internalAny.content.publishing._publishNewsArticle, {
      articleId: content.metadata.newsArticleId,
    });
  }
}

async function publishImage(_ctx: unknown, content: Doc<"scheduledContent">) {
  // For images, we might post to social media or just mark as published
  // The image URL is stored in metadata
  console.log(`[IMAGE] Published: ${content.metadata.imageUrl}`);
  console.log(`Caption: ${content.metadata.caption ?? content.content}`);
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

export const _getContent = internalQuery({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const _markPublished = internalMutation({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const _markFailed = internalMutation({
  args: {
    id: v.id("scheduledContent"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "failed",
      publishError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const _createNewsArticle = internalMutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    authorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("newsArticles", {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      category: "announcement",
      imageUrl: args.imageUrl,
      authorId: args.authorId,
      isPublished: true,
      isPinned: false,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const _sendEmailCampaign = internalMutation({
  args: {
    contentId: v.id("scheduledContent"),
    subject: v.string(),
    body: v.string(),
    recipientType: v.string(),
    listId: v.optional(v.id("emailLists")),
  },
  handler: async (ctx, args) => {
    const scheduledContent = await ctx.db.get(args.contentId);
    if (!scheduledContent) {
      throw new Error(`Scheduled content not found: ${args.contentId}`);
    }
    if (!scheduledContent.authorId) {
      throw new Error(`Scheduled content missing authorId: ${args.contentId}`);
    }

    // Trigger email sending via scheduler
    await ctx.scheduler.runAfter(0, internalAny.email.send.processCampaign, {
      historyId: await ctx.db.insert("emailHistory", {
        scheduledContentId: args.contentId,
        subject: args.subject,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        status: "sending",
        sentBy: scheduledContent.authorId,
        sentAt: Date.now(),
      }),
      subject: args.subject,
      body: args.body,
      recipientType: toEmailRecipientType(args.recipientType),
      listId: args.listId,
    });
  },
});

export const _broadcastAnnouncement = internalMutation({
  args: {
    message: v.string(),
    priority: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all active users and send them inbox messages (respecting promotions preference)
    const users = await ctx.db.query("users").take(10000);

    const now = Date.now();
    for (const user of users) {
      const wantsPromotions = await getNotificationSetting(ctx, user._id, "promotions");
      if (!wantsPromotions) continue;

      await ctx.db.insert("userInbox", {
        userId: user._id,
        type: "announcement",
        title: "Announcement",
        message: args.message,
        data: { priority: args.priority },
        isRead: false,
        createdAt: now,
      });
    }
  },
});

export const _publishNewsArticle = internalMutation({
  args: { articleId: v.id("newsArticles") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.articleId, {
      isPublished: true,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// MANUAL PUBLISH (Admin action)
// ============================================================================

export const manualPublish = mutation({
  args: { id: v.id("scheduledContent") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const content = await ctx.db.get(args.id);
    if (!content) throw new Error("Content not found");

    // Schedule immediate publishing
    await ctx.scheduler.runAfter(0, internalAny.content.publishing.publishContent, {
      contentId: args.id,
    });

    return { success: true, message: "Publishing started" };
  },
});

// ============================================================================
// UTILITIES
// ============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function toEmailRecipientType(value: string): EmailRecipientType {
  if (value === "players" || value === "subscribers" || value === "both" || value === "custom") {
    return value;
  }
  return "players";
}
