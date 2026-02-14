import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type { RunQueryCtx, RunMutationCtx };
export type { api };

/**
 * Client for the @lunchtable-tcg/content Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGContent } from "@lunchtable-tcg/content";
 *
 * const content = new LTCGContent(components.ltcgContent);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await content.scheduledContent.createScheduledContent(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGContent {
  public scheduledContent: ScheduledContentClient;
  public news: NewsClient;
  public feedback: FeedbackClient;

  constructor(private component: typeof api) {
    this.scheduledContent = new ScheduledContentClient(component);
    this.news = new NewsClient(component);
    this.feedback = new FeedbackClient(component);
  }
}

// ============================================================================
// SCHEDULED CONTENT CLIENT
// ============================================================================

export class ScheduledContentClient {
  constructor(private component: typeof api) {}

  async createScheduledContent(
    ctx: RunMutationCtx,
    args: {
      type: "blog" | "x_post" | "reddit" | "email" | "announcement" | "news" | "image";
      title: string;
      content: string;
      scheduledFor: number;
      status: "draft" | "scheduled" | "published" | "failed";
      metadata: {
        slug?: string;
        excerpt?: string;
        featuredImage?: string;
        tweetId?: string;
        subreddit?: string;
        redditPostId?: string;
        subject?: string;
        recipientType?: "players" | "subscribers" | "both" | "custom";
        recipientListId?: string;
        templateId?: string;
        priority?: "normal" | "important" | "urgent";
        expiresAt?: number;
        newsArticleId?: string;
        imageUrl?: string;
        altText?: string;
        caption?: string;
      };
      publishedAt?: number;
      publishError?: string;
      authorId: string;
    }
  ) {
    return await ctx.runMutation(
      this.component.scheduledContent.createScheduledContent,
      {
        type: args.type as any,
        title: args.title,
        content: args.content,
        scheduledFor: args.scheduledFor,
        status: args.status as any,
        metadata: args.metadata as any,
        publishedAt: args.publishedAt,
        publishError: args.publishError,
        authorId: args.authorId,
      }
    );
  }

  async getScheduledContent(
    ctx: RunQueryCtx,
    args?: {
      status?: "draft" | "scheduled" | "published" | "failed";
      type?: "blog" | "x_post" | "reddit" | "email" | "announcement" | "news" | "image";
    }
  ) {
    return await ctx.runQuery(
      this.component.scheduledContent.getScheduledContent,
      {
        status: args?.status as any,
        type: args?.type as any,
      }
    );
  }

  async getScheduledContentById(ctx: RunQueryCtx, contentId: string) {
    return await ctx.runQuery(
      this.component.scheduledContent.getScheduledContentById,
      { contentId: contentId as any }
    );
  }

  async updateScheduledContent(
    ctx: RunMutationCtx,
    contentId: string,
    updates: any
  ) {
    return await ctx.runMutation(
      this.component.scheduledContent.updateScheduledContent,
      {
        contentId: contentId as any,
        updates,
      }
    );
  }

  async deleteScheduledContent(ctx: RunMutationCtx, contentId: string) {
    return await ctx.runMutation(
      this.component.scheduledContent.deleteScheduledContent,
      { contentId: contentId as any }
    );
  }
}

// ============================================================================
// NEWS CLIENT
// ============================================================================

export class NewsClient {
  constructor(private component: typeof api) {}

  async createNewsArticle(
    ctx: RunMutationCtx,
    args: {
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      category: "update" | "event" | "patch" | "announcement" | "maintenance";
      imageUrl?: string;
      authorId: string;
      isPublished: boolean;
      isPinned: boolean;
      publishedAt?: number;
    }
  ) {
    return await ctx.runMutation(this.component.news.createNewsArticle, {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      category: args.category as any,
      imageUrl: args.imageUrl,
      authorId: args.authorId,
      isPublished: args.isPublished,
      isPinned: args.isPinned,
      publishedAt: args.publishedAt,
    });
  }

  async getNewsArticles(
    ctx: RunQueryCtx,
    args?: {
      isPublished?: boolean;
      category?: "update" | "event" | "patch" | "announcement" | "maintenance";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.news.getNewsArticles, {
      isPublished: args?.isPublished,
      category: args?.category as any,
      limit: args?.limit,
    });
  }

  async getNewsArticleBySlug(ctx: RunQueryCtx, slug: string) {
    return await ctx.runQuery(this.component.news.getNewsArticleBySlug, {
      slug,
    });
  }

  async getNewsArticle(ctx: RunQueryCtx, articleId: string) {
    return await ctx.runQuery(this.component.news.getNewsArticle, {
      articleId: articleId as any,
    });
  }

  async updateNewsArticle(
    ctx: RunMutationCtx,
    articleId: string,
    updates: any
  ) {
    return await ctx.runMutation(this.component.news.updateNewsArticle, {
      articleId: articleId as any,
      updates,
    });
  }

  async deleteNewsArticle(ctx: RunMutationCtx, articleId: string) {
    return await ctx.runMutation(this.component.news.deleteNewsArticle, {
      articleId: articleId as any,
    });
  }
}

// ============================================================================
// FEEDBACK CLIENT
// ============================================================================

export class FeedbackClient {
  constructor(private component: typeof api) {}

  async submitFeedback(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      username: string;
      type: "bug" | "feature";
      title: string;
      description: string;
      screenshotUrl?: string;
      recordingUrl?: string;
      pageUrl: string;
      userAgent: string;
      viewport: { width: number; height: number };
      status?: "new" | "triaged" | "in_progress" | "resolved" | "closed";
      priority?: "low" | "medium" | "high" | "critical";
    }
  ) {
    return await ctx.runMutation(this.component.feedback.submitFeedback, {
      userId: args.userId,
      username: args.username,
      type: args.type as any,
      title: args.title,
      description: args.description,
      screenshotUrl: args.screenshotUrl,
      recordingUrl: args.recordingUrl,
      pageUrl: args.pageUrl,
      userAgent: args.userAgent,
      viewport: args.viewport,
      status: args.status as any,
      priority: args.priority as any,
    });
  }

  async getFeedback(
    ctx: RunQueryCtx,
    args?: {
      status?: "new" | "triaged" | "in_progress" | "resolved" | "closed";
      type?: "bug" | "feature";
      userId?: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.feedback.getFeedback, {
      status: args?.status as any,
      type: args?.type as any,
      userId: args?.userId,
      limit: args?.limit,
    });
  }

  async getFeedbackById(ctx: RunQueryCtx, feedbackId: string) {
    return await ctx.runQuery(this.component.feedback.getFeedbackById, {
      feedbackId: feedbackId as any,
    });
  }

  async updateFeedbackStatus(
    ctx: RunMutationCtx,
    args: {
      feedbackId: string;
      status: "new" | "triaged" | "in_progress" | "resolved" | "closed";
      adminNotes?: string;
      assignedTo?: string;
      resolvedBy?: string;
      resolvedAt?: number;
      priority?: "low" | "medium" | "high" | "critical";
    }
  ) {
    return await ctx.runMutation(
      this.component.feedback.updateFeedbackStatus,
      {
        feedbackId: args.feedbackId as any,
        status: args.status as any,
        adminNotes: args.adminNotes,
        assignedTo: args.assignedTo,
        resolvedBy: args.resolvedBy,
        resolvedAt: args.resolvedAt,
        priority: args.priority as any,
      }
    );
  }
}
