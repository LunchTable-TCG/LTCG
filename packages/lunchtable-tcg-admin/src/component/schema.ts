import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const adminRoleValidator = v.union(
  v.literal("moderator"),
  v.literal("admin"),
  v.literal("superadmin")
);

const moderationActionTypeValidator = v.union(
  v.literal("mute"),
  v.literal("unmute"),
  v.literal("warn"),
  v.literal("suspend"),
  v.literal("unsuspend"),
  v.literal("ban"),
  v.literal("unban")
);

const configValueTypeValidator = v.union(
  v.literal("number"),
  v.literal("string"),
  v.literal("boolean"),
  v.literal("json"),
  v.literal("secret")
);

const alertTriggerTypeValidator = v.union(
  v.literal("price_change"),
  v.literal("price_threshold"),
  v.literal("volume_spike"),
  v.literal("whale_activity"),
  v.literal("holder_milestone"),
  v.literal("bonding_progress"),
  v.literal("treasury_balance"),
  v.literal("transaction_failed"),
  v.literal("graduation"),
  v.literal("integrity_violation")
);

const alertSeverityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical")
);

const alertChannelTypeValidator = v.union(
  v.literal("in_app"),
  v.literal("push"),
  v.literal("slack"),
  v.literal("discord"),
  v.literal("email")
);

const notificationTypeValidator = v.union(
  v.literal("alert"),
  v.literal("system"),
  v.literal("action_required")
);

const auditOperationValidator = v.union(
  v.literal("insert"),
  v.literal("patch"),
  v.literal("delete")
);

const analyticsPeriodValidator = v.union(
  v.literal("hourly"),
  v.literal("daily"),
  v.literal("weekly")
);

export default defineSchema({
  // Admin role assignments
  adminRoles: defineTable({
    userId: v.string(),
    role: adminRoleValidator,
    grantedBy: v.string(),
    grantedAt: v.number(),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    grantNote: v.optional(v.string()),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role", "isActive"])
    .index("by_expiration", ["isActive", "expiresAt"]),

  // Admin audit logs for tracking admin operations
  adminAuditLogs: defineTable({
    adminId: v.string(),
    action: v.string(),
    targetUserId: v.optional(v.string()),
    targetEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_admin", ["adminId", "timestamp"])
    .index("by_action", ["action", "timestamp"])
    .index("by_timestamp", ["timestamp"])
    .index("by_success", ["success", "timestamp"])
    .index("by_target_user", ["targetUserId", "timestamp"]),

  // Moderation actions (chat moderation, user warnings, etc.)
  moderationActions: defineTable({
    userId: v.string(),
    adminId: v.string(),
    actionType: moderationActionTypeValidator,
    reason: v.optional(v.string()),
    duration: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_admin", ["adminId", "createdAt"])
    .index("by_type", ["actionType", "createdAt"]),

  // System configuration key-value store
  systemConfig: defineTable({
    key: v.string(),
    value: v.any(),
    category: v.string(),
    displayName: v.string(),
    description: v.string(),
    valueType: configValueTypeValidator,
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // Feature flags for gradual rollout
  featureFlags: defineTable({
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    rolloutPercentage: v.optional(v.number()),
    targetUserIds: v.optional(v.array(v.string())),
    targetRoles: v.optional(v.array(v.string())),
    category: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

  // Analytics snapshots
  analyticsSnapshots: defineTable({
    timestamp: v.number(),
    period: analyticsPeriodValidator,
    metrics: v.object({
      totalUsers: v.number(),
      dailyActiveUsers: v.number(),
      totalGoldInCirculation: v.number(),
      totalGemsInCirculation: v.number(),
      gamesPlayedLast24h: v.number(),
      activeMarketplaceListings: v.number(),
      playersInMatchmakingQueue: v.number(),
    }),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_period_timestamp", ["period", "timestamp"]),

  // Data audit log (tracks document changes)
  auditLog: defineTable({
    table: v.string(),
    operation: auditOperationValidator,
    documentId: v.string(),
    userId: v.optional(v.string()),
    timestamp: v.number(),
    changedFields: v.optional(v.array(v.string())),
    oldValue: v.optional(v.any()),
    newValue: v.optional(v.any()),
  })
    .index("by_table", ["table", "timestamp"])
    .index("by_document", ["table", "documentId", "timestamp"])
    .index("by_user", ["userId", "timestamp"])
    .index("by_operation", ["operation", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Alert rules configuration
  alertRules: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    triggerType: alertTriggerTypeValidator,
    conditions: v.object({
      threshold: v.optional(v.number()),
      direction: v.optional(
        v.union(v.literal("above"), v.literal("below"), v.literal("change"))
      ),
      timeframeMinutes: v.optional(v.number()),
      percentChange: v.optional(v.number()),
    }),
    severity: alertSeverityValidator,
    cooldownMinutes: v.number(),
    lastTriggeredAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_type", ["triggerType"])
    .index("by_enabled", ["isEnabled"]),

  // Notification channels
  alertChannels: defineTable({
    type: alertChannelTypeValidator,
    name: v.string(),
    isEnabled: v.boolean(),
    config: v.object({
      webhookUrl: v.optional(v.string()),
      email: v.optional(v.string()),
      minSeverity: alertSeverityValidator,
    }),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_enabled", ["isEnabled"]),

  // Alert history
  alertHistory: defineTable({
    ruleId: v.id("alertRules"),
    severity: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    channelsNotified: v.array(v.string()),
    acknowledgedBy: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_rule", ["ruleId"])
    .index("by_acknowledged", ["acknowledgedBy"])
    .index("by_created", ["createdAt"]),

  // In-app notifications for admins
  adminNotifications: defineTable({
    adminId: v.string(),
    alertHistoryId: v.optional(v.id("alertHistory")),
    title: v.string(),
    message: v.string(),
    type: notificationTypeValidator,
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_admin_read", ["adminId", "isRead"])
    .index("by_created", ["createdAt"]),
});
