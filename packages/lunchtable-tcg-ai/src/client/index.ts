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
 * Client for the @lunchtable-tcg/ai Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGAI } from "@lunchtable-tcg/ai";
 *
 * const ai = new LTCGAI(components.ltcgAI);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await ai.agents.getAgent(ctx, agentId);
 *   }
 * });
 * ```
 */
export class LTCGAI {
  public agents: AgentsClient;
  public decisions: DecisionsClient;
  public chat: ChatClient;
  public usage: UsageClient;

  constructor(private component: typeof api) {
    this.agents = new AgentsClient(component);
    this.decisions = new DecisionsClient(component);
    this.chat = new ChatClient(component);
    this.usage = new UsageClient(component);
  }
}

// ============================================================================
// AGENTS CLIENT
// ============================================================================

export class AgentsClient {
  constructor(private component: typeof api) {}

  async createAgent(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      name: string;
      profilePictureUrl?: string;
      socialLink?: string;
      starterDeckCode: string;
      isActive?: boolean;
      privyUserId?: string;
      walletIndex?: number;
      walletId?: string;
      walletAddress?: string;
      walletChainType?: string;
      walletCreatedAt?: number;
      walletStatus?: "pending" | "created" | "failed";
      walletErrorMessage?: string;
      streamingEnabled?: boolean;
      streamingPlatform?: "twitch" | "youtube" | "kick" | "custom" | "retake" | "x" | "pumpfun";
      streamingKeyHash?: string;
      streamingRtmpUrl?: string;
      streamingAutoStart?: boolean;
      streamingPersistent?: boolean;
      streamingVoiceTrackUrl?: string;
      streamingVoiceVolume?: number;
      streamingVoiceLoop?: boolean;
      streamingVisualMode?: "webcam" | "profile-picture";
      streamingProfilePictureUrl?: string;
      lastStreamAt?: number;
      callbackUrl?: string;
      webhookSecret?: string;
      webhookEnabled?: boolean;
      lastWebhookAt?: number;
      webhookFailCount?: number;
    }
  ) {
    return await ctx.runMutation(this.component.agents.createAgent, args);
  }

  async getAgent(ctx: RunQueryCtx, agentId: any) {
    return await ctx.runQuery(this.component.agents.getAgent, { agentId });
  }

  async getAgentByName(ctx: RunQueryCtx, name: string) {
    return await ctx.runQuery(this.component.agents.getAgentByName, { name });
  }

  async getAgentsByUser(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.agents.getAgentsByUser, { userId });
  }

  async updateAgent(ctx: RunMutationCtx, agentId: any, updates: any) {
    return await ctx.runMutation(this.component.agents.updateAgent, {
      agentId,
      updates,
    });
  }

  async listAgents(ctx: RunQueryCtx, limit?: number) {
    return await ctx.runQuery(this.component.agents.listAgents, { limit });
  }

  async getAgentByWallet(ctx: RunQueryCtx, walletAddress: string) {
    return await ctx.runQuery(this.component.agents.getAgentByWallet, {
      walletAddress,
    });
  }
}

// ============================================================================
// DECISIONS CLIENT
// ============================================================================

export class DecisionsClient {
  constructor(private component: typeof api) {}

  async recordDecision(
    ctx: RunMutationCtx,
    args: {
      agentId: any;
      gameId: string;
      turnNumber: number;
      phase: string;
      action: string;
      reasoning: string;
      parameters?: any;
      executionTimeMs?: number;
      result?: string;
    }
  ) {
    return await ctx.runMutation(this.component.decisions.recordDecision, args);
  }

  async getDecisions(
    ctx: RunQueryCtx,
    args?: {
      agentId?: any;
      gameId?: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.decisions.getDecisions, args ?? {});
  }

  async getDecisionsByGame(ctx: RunQueryCtx, gameId: string) {
    return await ctx.runQuery(this.component.decisions.getDecisionsByGame, {
      gameId,
    });
  }
}

// ============================================================================
// CHAT CLIENT
// ============================================================================

export class ChatClient {
  constructor(private component: typeof api) {}

  async createChatSession(ctx: RunMutationCtx, userId: string, sessionId: string) {
    return await ctx.runMutation(this.component.chat.createChatSession, {
      userId,
      sessionId,
    });
  }

  async getChatSessions(ctx: RunQueryCtx, userId: string, activeOnly?: boolean) {
    return await ctx.runQuery(this.component.chat.getChatSessions, {
      userId,
      activeOnly,
    });
  }

  async getChatSession(ctx: RunQueryCtx, sessionId: string) {
    return await ctx.runQuery(this.component.chat.getChatSession, { sessionId });
  }

  async addChatMessage(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      sessionId: string;
      role: "user" | "agent";
      message: string;
    }
  ) {
    return await ctx.runMutation(this.component.chat.addChatMessage, args);
  }

  async getChatMessages(ctx: RunQueryCtx, sessionId: string, limit?: number) {
    return await ctx.runQuery(this.component.chat.getChatMessages, {
      sessionId,
      limit,
    });
  }

  async endChatSession(ctx: RunMutationCtx, sessionId: string) {
    return await ctx.runMutation(this.component.chat.endChatSession, {
      sessionId,
    });
  }
}

// ============================================================================
// USAGE CLIENT
// ============================================================================

export class UsageClient {
  constructor(private component: typeof api) {}

  async recordUsage(
    ctx: RunMutationCtx,
    args: {
      provider: "openrouter" | "vercel";
      modelId: string;
      modelType: "language" | "embedding" | "image";
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCost: number;
      feature: string;
      userId?: string;
      success: boolean;
      errorMessage?: string;
      latencyMs: number;
    }
  ) {
    return await ctx.runMutation(this.component.usage.recordUsage, args);
  }

  async getUsage(
    ctx: RunQueryCtx,
    args?: {
      feature?: string;
      provider?: "openrouter" | "vercel";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.usage.getUsage, args ?? {});
  }

  async upsertDailyStats(
    ctx: RunMutationCtx,
    args: {
      date: string;
      provider: "openrouter" | "vercel";
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalTokens: number;
      totalCost: number;
      avgLatencyMs: number;
      languageRequests: number;
      embeddingRequests: number;
      imageRequests: number;
      topModels: {
        modelId: string;
        requests: number;
        tokens: number;
        cost: number;
      }[];
    }
  ) {
    return await ctx.runMutation(this.component.usage.upsertDailyStats, args);
  }

  async getDailyStats(
    ctx: RunQueryCtx,
    args?: {
      startDate?: string;
      endDate?: string;
      provider?: "openrouter" | "vercel";
    }
  ) {
    return await ctx.runQuery(this.component.usage.getDailyStats, args ?? {});
  }
}
