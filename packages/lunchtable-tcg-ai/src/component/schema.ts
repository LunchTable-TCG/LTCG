import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

const streamingPlatformValidator = literals("twitch", "youtube", "kick", "custom", "retake", "x", "pumpfun");

export default defineSchema({
  agents: defineTable({
    userId: v.string(), // external ref
    name: v.string(),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    starterDeckCode: v.string(),
    stats: v.object({
      gamesPlayed: v.number(),
      gamesWon: v.number(),
      totalScore: v.number(),
    }),
    createdAt: v.number(),
    isActive: v.boolean(),
    // Privy wallet fields
    privyUserId: v.optional(v.string()),
    walletIndex: v.optional(v.number()),
    walletId: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletChainType: v.optional(v.string()),
    walletCreatedAt: v.optional(v.number()),
    walletStatus: v.optional(literals("pending", "created", "failed")),
    walletErrorMessage: v.optional(v.string()),
    // Streaming fields
    streamingEnabled: v.optional(v.boolean()),
    streamingPlatform: v.optional(streamingPlatformValidator),
    streamingKeyHash: v.optional(v.string()),
    streamingRtmpUrl: v.optional(v.string()),
    streamingAutoStart: v.optional(v.boolean()),
    streamingPersistent: v.optional(v.boolean()),
    streamingVoiceTrackUrl: v.optional(v.string()),
    streamingVoiceVolume: v.optional(v.number()),
    streamingVoiceLoop: v.optional(v.boolean()),
    streamingVisualMode: v.optional(literals("webcam", "profile-picture")),
    streamingProfilePictureUrl: v.optional(v.string()),
    lastStreamAt: v.optional(v.number()),
    // Webhook fields
    callbackUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    webhookEnabled: v.optional(v.boolean()),
    lastWebhookAt: v.optional(v.number()),
    webhookFailCount: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name"])
    .index("by_wallet", ["walletAddress"])
    .index("by_privy_user", ["privyUserId"])
    .index("by_callback", ["callbackUrl"]),

  agentDecisions: defineTable({
    agentId: v.id("agents"), // intra-component ref
    gameId: v.string(),
    turnNumber: v.number(),
    phase: v.string(),
    action: v.string(),
    reasoning: v.string(),
    parameters: v.optional(v.any()),
    executionTimeMs: v.optional(v.number()),
    result: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_game", ["gameId"])
    .index("by_agent_game", ["agentId", "gameId"])
    .index("by_created", ["createdAt"]),

  aiChatMessages: defineTable({
    userId: v.string(), // external ref
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("agent")),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_session", ["userId", "sessionId"]),

  aiChatSessions: defineTable({
    userId: v.string(), // external ref
    sessionId: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session", ["sessionId"]),

  aiUsage: defineTable({
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    modelId: v.string(),
    modelType: v.union(v.literal("language"), v.literal("embedding"), v.literal("image")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    estimatedCost: v.number(),
    feature: v.string(),
    userId: v.optional(v.string()), // external ref
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider", ["provider", "createdAt"])
    .index("by_model", ["modelId", "createdAt"])
    .index("by_feature", ["feature", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_type", ["modelType", "createdAt"]),

  aiUsageDailyStats: defineTable({
    date: v.string(),
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalTokens: v.number(),
    totalCost: v.number(),
    avgLatencyMs: v.number(),
    languageRequests: v.number(),
    embeddingRequests: v.number(),
    imageRequests: v.number(),
    topModels: v.array(
      v.object({
        modelId: v.string(),
        requests: v.number(),
        tokens: v.number(),
        cost: v.number(),
      })
    ),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_provider_date", ["provider", "date"]),
});
