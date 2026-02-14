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
 * Client for the @lunchtable-tcg/admin Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGAdmin } from "@lunchtable-tcg/admin";
 *
 * const admin = new LTCGAdmin(components.ltcgAdmin);
 *
 * export const myQuery = query({
 *   handler: async (ctx) => {
 *     const role = await admin.roles.getRole(ctx, userId);
 *   }
 * });
 * ```
 */
export class LTCGAdmin {
  public roles: RolesClient;
  public audit: AuditClient;
  public moderation: ModerationClient;
  public config: ConfigClient;
  public features: FeaturesClient;
  public alerts: AlertsClient;
  public notifications: NotificationsClient;
  public analytics: AnalyticsClient;
  public apiKeys: ApiKeysClient;
  public reports: ReportsClient;
  public files: FilesClient;

  constructor(private component: typeof api) {
    this.roles = new RolesClient(component);
    this.audit = new AuditClient(component);
    this.moderation = new ModerationClient(component);
    this.config = new ConfigClient(component);
    this.features = new FeaturesClient(component);
    this.alerts = new AlertsClient(component);
    this.notifications = new NotificationsClient(component);
    this.analytics = new AnalyticsClient(component);
    this.apiKeys = new ApiKeysClient(component);
    this.reports = new ReportsClient(component);
    this.files = new FilesClient(component);
  }
}

// ============================================================================
// ROLES CLIENT
// ============================================================================

export class RolesClient {
  constructor(private component: typeof api) {}

  async getRole(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.roles.getRole, { userId });
  }

  async listAdmins(ctx: RunQueryCtx, role?: string) {
    return await ctx.runQuery(this.component.roles.listAdmins, {
      role: role as any,
    });
  }

  async hasRole(ctx: RunQueryCtx, userId: string, requiredRole: string) {
    return await ctx.runQuery(this.component.roles.hasRole, {
      userId,
      requiredRole: requiredRole as any,
    });
  }

  async grantRole(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      role: string;
      grantedBy: string;
      expiresAt?: number;
      grantNote?: string;
    }
  ) {
    return await ctx.runMutation(this.component.roles.grantRole, {
      userId: args.userId,
      role: args.role as any,
      grantedBy: args.grantedBy,
      expiresAt: args.expiresAt,
      grantNote: args.grantNote,
    });
  }

  async revokeRole(ctx: RunMutationCtx, userId: string, revokedBy: string) {
    return await ctx.runMutation(this.component.roles.revokeRole, {
      userId,
      revokedBy,
    });
  }

  async cleanupExpiredRoles(ctx: RunMutationCtx) {
    return await ctx.runMutation(
      this.component.roles.cleanupExpiredRoles,
      {}
    );
  }
}

// ============================================================================
// AUDIT CLIENT
// ============================================================================

export class AuditClient {
  constructor(private component: typeof api) {}

  async logAdminAction(
    ctx: RunMutationCtx,
    args: {
      adminId: string;
      action: string;
      targetUserId?: string;
      targetEmail?: string;
      metadata?: any;
      ipAddress?: string;
      success: boolean;
      errorMessage?: string;
    }
  ) {
    return await ctx.runMutation(
      this.component.audit.logAdminAction,
      args
    );
  }

  async logDataChange(
    ctx: RunMutationCtx,
    args: {
      table: string;
      operation: string;
      documentId: string;
      userId?: string;
      changedFields?: string[];
      oldValue?: any;
      newValue?: any;
    }
  ) {
    return await ctx.runMutation(this.component.audit.logDataChange, {
      ...args,
      operation: args.operation as any,
    });
  }

  async getAdminAuditLog(
    ctx: RunQueryCtx,
    filters?: { adminId?: string; action?: string; limit?: number }
  ) {
    return await ctx.runQuery(
      this.component.audit.getAdminAuditLog,
      filters ?? {}
    );
  }

  async getDataAuditLog(
    ctx: RunQueryCtx,
    filters?: {
      table?: string;
      documentId?: string;
      userId?: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(
      this.component.audit.getDataAuditLog,
      filters ?? {}
    );
  }
}

// ============================================================================
// MODERATION CLIENT
// ============================================================================

export class ModerationClient {
  constructor(private component: typeof api) {}

  async createModerationAction(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      adminId: string;
      actionType: string;
      reason?: string;
      duration?: number;
      expiresAt?: number;
    }
  ) {
    return await ctx.runMutation(
      this.component.moderation.createModerationAction,
      {
        ...args,
        actionType: args.actionType as any,
      }
    );
  }

  async getModerationHistory(
    ctx: RunQueryCtx,
    userId: string,
    limit?: number
  ) {
    return await ctx.runQuery(
      this.component.moderation.getModerationHistory,
      { userId, limit }
    );
  }

  async getActiveModerations(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(
      this.component.moderation.getActiveModerations,
      { userId }
    );
  }
}

// ============================================================================
// CONFIG CLIENT
// ============================================================================

export class ConfigClient {
  constructor(private component: typeof api) {}

  async getConfig(ctx: RunQueryCtx, key: string) {
    return await ctx.runQuery(this.component.config.getConfig, { key });
  }

  async getConfigsByCategory(ctx: RunQueryCtx, category: string) {
    return await ctx.runQuery(this.component.config.getConfigsByCategory, {
      category,
    });
  }

  async updateConfig(
    ctx: RunMutationCtx,
    key: string,
    value: any,
    updatedBy: string
  ) {
    return await ctx.runMutation(this.component.config.updateConfig, {
      key,
      value,
      updatedBy,
    });
  }

  async bulkUpdateConfigs(
    ctx: RunMutationCtx,
    configs: { key: string; value: any }[],
    updatedBy: string
  ) {
    return await ctx.runMutation(this.component.config.bulkUpdateConfigs, {
      configs,
      updatedBy,
    });
  }

  async seedDefaultConfigs(ctx: RunMutationCtx, configs: any[], updatedBy: string) {
    return await ctx.runMutation(this.component.config.seedDefaultConfigs, {
      configs,
      updatedBy,
    });
  }
}

// ============================================================================
// FEATURES CLIENT
// ============================================================================

export class FeaturesClient {
  constructor(private component: typeof api) {}

  async checkFeatureFlag(ctx: RunQueryCtx, name: string, userId?: string) {
    return await ctx.runQuery(this.component.features.checkFeatureFlag, {
      name,
      userId,
    });
  }

  async listFeatureFlags(ctx: RunQueryCtx, category?: string) {
    return await ctx.runQuery(this.component.features.listFeatureFlags, {
      category,
    });
  }

  async createFeatureFlag(
    ctx: RunMutationCtx,
    args: {
      name: string;
      displayName: string;
      description: string;
      enabled: boolean;
      rolloutPercentage?: number;
      targetUserIds?: string[];
      targetRoles?: string[];
      category: string;
      updatedBy: string;
    }
  ) {
    return await ctx.runMutation(
      this.component.features.createFeatureFlag,
      args
    );
  }

  async toggleFeatureFlag(
    ctx: RunMutationCtx,
    name: string,
    enabled: boolean,
    updatedBy: string
  ) {
    return await ctx.runMutation(
      this.component.features.toggleFeatureFlag,
      { name, enabled, updatedBy }
    );
  }

  async updateFeatureFlag(
    ctx: RunMutationCtx,
    name: string,
    updates: any,
    updatedBy: string
  ) {
    return await ctx.runMutation(
      this.component.features.updateFeatureFlag,
      { name, updates, updatedBy }
    );
  }
}

// ============================================================================
// ALERTS CLIENT
// ============================================================================

export class AlertsClient {
  constructor(private component: typeof api) {}

  async createAlertRule(ctx: RunMutationCtx, rule: any) {
    return await ctx.runMutation(
      this.component.alerts.createAlertRule,
      rule
    );
  }

  async listAlertRules(ctx: RunQueryCtx, enabled?: boolean) {
    return await ctx.runQuery(this.component.alerts.listAlertRules, {
      enabled,
    });
  }

  async triggerAlert(
    ctx: RunMutationCtx,
    ruleId: string,
    title: string,
    message: string,
    data?: any
  ) {
    return await ctx.runMutation(this.component.alerts.triggerAlert, {
      ruleId: ruleId as any,
      title,
      message,
      data,
    });
  }

  async acknowledgeAlert(
    ctx: RunMutationCtx,
    alertHistoryId: string,
    acknowledgedBy: string
  ) {
    return await ctx.runMutation(this.component.alerts.acknowledgeAlert, {
      alertHistoryId: alertHistoryId as any,
      acknowledgedBy,
    });
  }

  async getAlertHistory(
    ctx: RunQueryCtx,
    filters?: { ruleId?: string; limit?: number }
  ) {
    return await ctx.runQuery(this.component.alerts.getAlertHistory, {
      ruleId: filters?.ruleId as any,
      limit: filters?.limit,
    });
  }

  async createAlertChannel(ctx: RunMutationCtx, channel: any) {
    return await ctx.runMutation(
      this.component.alerts.createAlertChannel,
      channel
    );
  }

  async listAlertChannels(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.alerts.listAlertChannels, {});
  }
}

// ============================================================================
// NOTIFICATIONS CLIENT
// ============================================================================

export class NotificationsClient {
  constructor(private component: typeof api) {}

  async getNotifications(
    ctx: RunQueryCtx,
    adminId: string,
    unreadOnly?: boolean
  ) {
    return await ctx.runQuery(
      this.component.notifications.getNotifications,
      { adminId, unreadOnly }
    );
  }

  async createNotification(
    ctx: RunMutationCtx,
    args: {
      adminId: string;
      title: string;
      message: string;
      type: string;
      alertHistoryId?: string;
    }
  ) {
    return await ctx.runMutation(
      this.component.notifications.createNotification,
      {
        adminId: args.adminId,
        title: args.title,
        message: args.message,
        type: args.type as any,
        alertHistoryId: args.alertHistoryId as any,
      }
    );
  }

  async markAsRead(ctx: RunMutationCtx, notificationId: string) {
    return await ctx.runMutation(
      this.component.notifications.markAsRead,
      { notificationId: notificationId as any }
    );
  }

  async markAllAsRead(ctx: RunMutationCtx, adminId: string) {
    return await ctx.runMutation(
      this.component.notifications.markAllAsRead,
      { adminId }
    );
  }
}

// ============================================================================
// ANALYTICS CLIENT
// ============================================================================

export class AnalyticsClient {
  constructor(private component: typeof api) {}

  async captureSnapshot(
    ctx: RunMutationCtx,
    period: string,
    metrics: {
      totalUsers: number;
      dailyActiveUsers: number;
      totalGoldInCirculation: number;
      totalGemsInCirculation: number;
      gamesPlayedLast24h: number;
      activeMarketplaceListings: number;
      playersInMatchmakingQueue: number;
    }
  ) {
    return await ctx.runMutation(
      this.component.analytics.captureSnapshot,
      { period: period as any, metrics }
    );
  }

  async getSnapshots(ctx: RunQueryCtx, period: string, since?: number) {
    return await ctx.runQuery(this.component.analytics.getSnapshots, {
      period: period as any,
      since,
    });
  }

  async cleanupOldSnapshots(ctx: RunMutationCtx, olderThan: number) {
    return await ctx.runMutation(
      this.component.analytics.cleanupOldSnapshots,
      { olderThan }
    );
  }
}

// ============================================================================
// API KEYS CLIENT
// ============================================================================

export class ApiKeysClient {
  constructor(private component: typeof api) {}

  async create(
    ctx: RunMutationCtx,
    args: {
      agentId: string;
      userId: string;
      keyHash: string;
      keyPrefix: string;
    }
  ) {
    return await ctx.runMutation(this.component.apiKeys.create, args);
  }

  async deactivate(ctx: RunMutationCtx, keyHash: string) {
    return await ctx.runMutation(this.component.apiKeys.deactivate, {
      keyHash,
    });
  }

  async recordUsage(
    ctx: RunMutationCtx,
    args: {
      apiKeyId: string;
      endpoint?: string;
      responseStatus?: number;
      durationMs?: number;
    }
  ) {
    return await ctx.runMutation(this.component.apiKeys.recordUsage, {
      apiKeyId: args.apiKeyId as any,
      endpoint: args.endpoint,
      responseStatus: args.responseStatus,
      durationMs: args.durationMs,
    });
  }

  async getByHash(ctx: RunQueryCtx, keyHash: string) {
    return await ctx.runQuery(this.component.apiKeys.getByHash, { keyHash });
  }

  async getByAgent(ctx: RunQueryCtx, agentId: string) {
    return await ctx.runQuery(this.component.apiKeys.getByAgent, { agentId });
  }

  async getByUser(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.apiKeys.getByUser, { userId });
  }

  async getUsage(
    ctx: RunQueryCtx,
    args: {
      apiKeyId: string;
      limit?: number;
      since?: number;
    }
  ) {
    return await ctx.runQuery(this.component.apiKeys.getUsage, {
      apiKeyId: args.apiKeyId as any,
      limit: args.limit,
      since: args.since,
    });
  }
}

// ============================================================================
// REPORTS CLIENT
// ============================================================================

export class ReportsClient {
  constructor(private component: typeof api) {}

  async submitReport(
    ctx: RunMutationCtx,
    args: {
      reporterId: string;
      reporterUsername: string;
      reportedUserId: string;
      reportedUsername: string;
      reason: string;
    }
  ) {
    return await ctx.runMutation(this.component.reports.submitReport, args);
  }

  async updateReportStatus(
    ctx: RunMutationCtx,
    args: {
      reportId: string;
      status: string;
      reviewedBy: string;
      notes?: string;
    }
  ) {
    return await ctx.runMutation(this.component.reports.updateReportStatus, {
      reportId: args.reportId as any,
      status: args.status as any,
      reviewedBy: args.reviewedBy,
      notes: args.notes,
    });
  }

  async getByStatus(ctx: RunQueryCtx, status: string, limit?: number) {
    return await ctx.runQuery(this.component.reports.getByStatus, {
      status: status as any,
      limit,
    });
  }

  async getByReportedUser(ctx: RunQueryCtx, reportedUserId: string) {
    return await ctx.runQuery(this.component.reports.getByReportedUser, {
      reportedUserId,
    });
  }

  async getByReporter(ctx: RunQueryCtx, reporterId: string) {
    return await ctx.runQuery(this.component.reports.getByReporter, {
      reporterId,
    });
  }
}

// ============================================================================
// FILES CLIENT
// ============================================================================

export class FilesClient {
  constructor(private component: typeof api) {}

  async createFileMetadata(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      storageId: string;
      fileName: string;
      contentType: string;
      size: number;
      category: string;
      blobUrl?: string;
      blobPathname?: string;
      description?: string;
    }
  ) {
    return await ctx.runMutation(this.component.files.createFileMetadata, {
      ...args,
      category: args.category as any,
    });
  }

  async deleteFileMetadata(ctx: RunMutationCtx, fileId: string) {
    return await ctx.runMutation(this.component.files.deleteFileMetadata, {
      fileId: fileId as any,
    });
  }

  async getByUser(ctx: RunQueryCtx, userId: string, limit?: number) {
    return await ctx.runQuery(this.component.files.getByUser, {
      userId,
      limit,
    });
  }

  async getByCategory(ctx: RunQueryCtx, category: string, limit?: number) {
    return await ctx.runQuery(this.component.files.getByCategory, {
      category: category as any,
      limit,
    });
  }

  async getByStorageId(ctx: RunQueryCtx, storageId: string) {
    return await ctx.runQuery(this.component.files.getByStorageId, {
      storageId,
    });
  }

  async getByUserCategory(ctx: RunQueryCtx, userId: string, category: string) {
    return await ctx.runQuery(this.component.files.getByUserCategory, {
      userId,
      category: category as any,
    });
  }
}
