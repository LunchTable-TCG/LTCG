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

export class LTCGWebhooks {
  public config: WebhookConfigClient;
  public agentWebhooks: AgentWebhooksClient;

  constructor(private component: typeof api) {
    this.config = new WebhookConfigClient(component);
    this.agentWebhooks = new AgentWebhooksClient(component);
  }
}

// WebhookConfigClient wraps webhookConfig module
class WebhookConfigClient {
  constructor(private component: typeof api) {}

  async getWebhookConfig(ctx: RunQueryCtx, provider?: string) {
    return await ctx.runQuery(this.component.webhookConfig.getWebhookConfig, { provider: provider as any });
  }
  async getAllConfigs(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.webhookConfig.getAllConfigs, {});
  }
  async upsertWebhookConfig(ctx: RunMutationCtx, config: { provider: string; webhookId?: string; webhookUrl: string; webhookSecret?: string; tokenMint?: string; isActive: boolean }) {
    return await ctx.runMutation(this.component.webhookConfig.upsertWebhookConfig, config as any);
  }
  async updateWebhookConfig(ctx: RunMutationCtx, configId: string, updates: any) {
    return await ctx.runMutation(this.component.webhookConfig.updateWebhookConfig, { configId: configId as any, updates });
  }
  async recordEvent(ctx: RunMutationCtx, configId: string) {
    return await ctx.runMutation(this.component.webhookConfig.recordEvent, { configId: configId as any });
  }
  async recordError(ctx: RunMutationCtx, configId: string) {
    return await ctx.runMutation(this.component.webhookConfig.recordError, { configId: configId as any });
  }
}

// AgentWebhooksClient wraps agentWebhooks module
class AgentWebhooksClient {
  constructor(private component: typeof api) {}

  async getAgentWebhooks(ctx: RunQueryCtx, agentId: string) {
    return await ctx.runQuery(this.component.agentWebhooks.getAgentWebhooks, { agentId });
  }
  async createWebhook(ctx: RunMutationCtx, args: { agentId: string; url: string; events: string[]; secret?: string }) {
    return await ctx.runMutation(this.component.agentWebhooks.createWebhook, args);
  }
  async updateWebhook(ctx: RunMutationCtx, webhookId: string, updates: any) {
    return await ctx.runMutation(this.component.agentWebhooks.updateWebhook, { webhookId: webhookId as any, updates });
  }
  async deleteWebhook(ctx: RunMutationCtx, webhookId: string) {
    return await ctx.runMutation(this.component.agentWebhooks.deleteWebhook, { webhookId: webhookId as any });
  }
  async recordTrigger(ctx: RunMutationCtx, webhookId: string) {
    return await ctx.runMutation(this.component.agentWebhooks.recordTrigger, { webhookId: webhookId as any });
  }
  async recordFailure(ctx: RunMutationCtx, webhookId: string) {
    return await ctx.runMutation(this.component.agentWebhooks.recordFailure, { webhookId: webhookId as any });
  }
}
