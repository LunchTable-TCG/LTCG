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
 * Client for the @lunchtable-tcg/email Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGEmail } from "@lunchtable-tcg/email";
 *
 * const email = new LTCGEmail(components.ltcgEmail);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await email.templates.getTemplates(ctx, {});
 *   }
 * });
 * ```
 */
export class LTCGEmail {
  public templates: TemplatesClient;
  public lists: ListsClient;
  public history: HistoryClient;

  constructor(private component: typeof api) {
    this.templates = new TemplatesClient(component);
    this.lists = new ListsClient(component);
    this.history = new HistoryClient(component);
  }
}

// ============================================================================
// TEMPLATES CLIENT
// ============================================================================

export class TemplatesClient {
  constructor(private component: typeof api) {}

  async createTemplate(
    ctx: RunMutationCtx,
    args: {
      name: string;
      subject: string;
      body: string;
      variables: string[];
      category: "newsletter" | "announcement" | "promotional" | "transactional" | "custom";
      isActive: boolean;
      createdBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.templates.createTemplate, {
      ...args,
      category: args.category as any,
    });
  }

  async getTemplates(
    ctx: RunQueryCtx,
    args?: {
      category?: "newsletter" | "announcement" | "promotional" | "transactional" | "custom";
      isActive?: boolean;
    }
  ) {
    return await ctx.runQuery(this.component.templates.getTemplates, {
      category: args?.category as any,
      isActive: args?.isActive,
    });
  }

  async getTemplate(ctx: RunQueryCtx, templateId: string) {
    return await ctx.runQuery(this.component.templates.getTemplate, {
      templateId: templateId as any,
    });
  }

  async updateTemplate(
    ctx: RunMutationCtx,
    templateId: string,
    updates: any
  ) {
    return await ctx.runMutation(this.component.templates.updateTemplate, {
      templateId: templateId as any,
      updates,
    });
  }

  async deleteTemplate(ctx: RunMutationCtx, templateId: string) {
    return await ctx.runMutation(this.component.templates.deleteTemplate, {
      templateId: templateId as any,
    });
  }
}

// ============================================================================
// LISTS CLIENT
// ============================================================================

export class ListsClient {
  constructor(private component: typeof api) {}

  async createList(
    ctx: RunMutationCtx,
    args: {
      name: string;
      description?: string;
      createdBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.lists.createList, args);
  }

  async getLists(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.lists.getLists, {});
  }

  async getList(ctx: RunQueryCtx, listId: string) {
    return await ctx.runQuery(this.component.lists.getList, {
      listId: listId as any,
    });
  }

  async updateList(ctx: RunMutationCtx, listId: string, updates: any) {
    return await ctx.runMutation(this.component.lists.updateList, {
      listId: listId as any,
      updates,
    });
  }

  async addSubscriber(
    ctx: RunMutationCtx,
    args: {
      listId: string;
      email: string;
      name?: string;
      tags?: string[];
    }
  ) {
    return await ctx.runMutation(this.component.lists.addSubscriber, {
      listId: args.listId as any,
      email: args.email,
      name: args.name,
      tags: args.tags,
    });
  }

  async removeSubscriber(ctx: RunMutationCtx, subscriberId: string) {
    return await ctx.runMutation(this.component.lists.removeSubscriber, {
      subscriberId: subscriberId as any,
    });
  }

  async getSubscribers(
    ctx: RunQueryCtx,
    listId: string,
    activeOnly?: boolean
  ) {
    return await ctx.runQuery(this.component.lists.getSubscribers, {
      listId: listId as any,
      activeOnly,
    });
  }
}

// ============================================================================
// HISTORY CLIENT
// ============================================================================

export class HistoryClient {
  constructor(private component: typeof api) {}

  async recordEmailSend(
    ctx: RunMutationCtx,
    args: {
      scheduledContentId?: string;
      templateId?: string;
      subject: string;
      recipientCount: number;
      sentBy: string;
      resendBatchId?: string;
    }
  ) {
    return await ctx.runMutation(this.component.history.recordEmailSend, {
      scheduledContentId: args.scheduledContentId,
      templateId: args.templateId as any,
      subject: args.subject,
      recipientCount: args.recipientCount,
      sentBy: args.sentBy,
      resendBatchId: args.resendBatchId,
    });
  }

  async updateEmailHistory(
    ctx: RunMutationCtx,
    historyId: string,
    updates: any
  ) {
    return await ctx.runMutation(this.component.history.updateEmailHistory, {
      historyId: historyId as any,
      updates,
    });
  }

  async getEmailHistory(ctx: RunQueryCtx, limit?: number) {
    return await ctx.runQuery(this.component.history.getEmailHistory, {
      limit,
    });
  }

  async getHistoryByContent(ctx: RunQueryCtx, scheduledContentId: string) {
    return await ctx.runQuery(this.component.history.getHistoryByContent, {
      scheduledContentId,
    });
  }
}
