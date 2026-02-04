/**
 * @module @ltcg/core/api/admin
 *
 * Typed API references for Admin Convex functions.
 * Provides full type safety for admin dashboard operations.
 */

import type { Id } from "../types/api";
import type { TypedAction, TypedMutation, TypedQuery } from "../types/convex";

// =============================================================================
// Base Types
// =============================================================================

type BaseArgs = Record<string, unknown>;
type EmptyArgs = Record<string, never>;

// =============================================================================
// Admin Report Types
// =============================================================================

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ModerationAction = "dismiss" | "warn" | "mute" | "suspend" | "ban";
export type AccountStatus = "active" | "suspended" | "banned";

export interface UserReportSummary {
  _id: Id<"userReports">;
  _creationTime: number;
  reporterId: Id<"users">;
  reporterUsername: string;
  reportedUserId: Id<"users">;
  reportedUsername: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: Id<"users">;
  notes?: string;
}

export interface ReportWithContext extends UserReportSummary {
  reporter: { _id: Id<"users">; username?: string } | null;
  reported: {
    _id: Id<"users">;
    username?: string;
    accountStatus?: AccountStatus;
  } | null;
  reviewer: { _id: Id<"users">; username?: string } | null;
  otherReportsCount: number;
  otherReports: UserReportSummary[];
  moderationHistory: Array<{
    _id: Id<"moderationActions">;
    adminId: Id<"users">;
    userId: Id<"users">;
    actionType: string;
    reason?: string;
    duration?: number;
    expiresAt?: number;
    createdAt: number;
    moderatorName?: string;
  }>;
}

export interface ReportListResponse {
  reports: UserReportSummary[];
  totalCount: number;
  hasMore: boolean;
}

export interface ReportStats {
  totalReports: number;
  byStatus: Record<ReportStatus, number>;
  reportsToday: number;
  reportsThisWeek: number;
  avgResolutionTimeMs: number;
  avgResolutionTimeHours: number;
}

// =============================================================================
// Admin AI Agent Types
// =============================================================================

export interface ThreadInfo {
  threadId: string;
  title: string;
  createdAt: number;
  isNew: boolean;
}

export interface MessageInfo {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: number;
}

export interface ThreadHistoryResponse {
  threadId: string;
  messages: MessageInfo[];
  hasMore: boolean;
}

export interface SendMessageResponse {
  messageId?: string;
  text: string;
  toolCalls?: Array<{
    toolName?: string;
    args?: unknown;
    result?: unknown;
  }>;
}

// =============================================================================
// Admin User/Player Types
// =============================================================================

export interface AdminRole {
  role: "super_admin" | "admin" | "moderator" | "content_creator";
  userId: Id<"users">;
  username?: string;
  grantedAt: number;
  grantedBy?: Id<"users">;
}

export interface PlayerListItem {
  _id: Id<"users">;
  username?: string;
  email?: string;
  createdAt?: number;
  lastActiveAt?: number;
  accountStatus?: AccountStatus;
  rankedElo?: number;
  totalWins?: number;
  totalLosses?: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalGames: number;
  activeGames: number;
  totalCards: number;
  totalTransactions: number;
}

// =============================================================================
// Admin Query Interfaces
// =============================================================================

export interface AdminReportQueries {
  /** List all user reports with filtering */
  listReports: TypedQuery<
    { status?: ReportStatus; search?: string; limit?: number; offset?: number } & BaseArgs,
    ReportListResponse
  >;
  /** Get single report with full context */
  getReport: TypedQuery<{ reportId: Id<"userReports"> } & BaseArgs, ReportWithContext | null>;
  /** Get report statistics */
  getReportStats: TypedQuery<EmptyArgs, ReportStats>;
}

export interface AdminReportMutations {
  /** Update report status */
  updateReportStatus: TypedMutation<
    { reportId: Id<"userReports">; status: ReportStatus; notes?: string } & BaseArgs,
    { success: boolean; message: string }
  >;
  /** Resolve report with action against user */
  resolveReportWithAction: TypedMutation<
    {
      reportId: Id<"userReports">;
      action: ModerationAction;
      notes?: string;
      muteDurationHours?: number;
      suspendDurationDays?: number;
    } & BaseArgs,
    { success: boolean; message: string }
  >;
  /** Bulk update report statuses */
  bulkUpdateReportStatus: TypedMutation<
    { reportIds: Id<"userReports">[]; status: ReportStatus; notes?: string } & BaseArgs,
    { success: boolean; message: string }
  >;
}

export interface AdminUserQueries {
  /** Get current admin's role */
  getMyAdminRole: TypedQuery<EmptyArgs, AdminRole | null>;
  /** List all admins */
  listAdmins: TypedQuery<EmptyArgs, AdminRole[]>;
  /** Get system statistics */
  getSystemStats: TypedQuery<EmptyArgs, SystemStats>;
  /** List players with filtering */
  listPlayers: TypedQuery<
    { search?: string; status?: AccountStatus; limit?: number; offset?: number } & BaseArgs,
    { players: PlayerListItem[]; totalCount: number; hasMore: boolean }
  >;
}

export interface AdminUserMutations {
  /** Grant admin role to user */
  grantAdminRole: TypedMutation<
    { userId: Id<"users">; role: AdminRole["role"] } & BaseArgs,
    { success: boolean }
  >;
  /** Revoke admin role from user */
  revokeAdminRole: TypedMutation<{ userId: Id<"users"> } & BaseArgs, { success: boolean }>;
}

// =============================================================================
// Admin AI Agent Interfaces
// =============================================================================

export interface AdminAgentActions {
  /** Get or create chat thread for admin */
  getOrCreateThread: TypedAction<EmptyArgs, ThreadInfo>;
  /** Get thread message history */
  getThreadHistory: TypedAction<
    { threadId: string; limit?: number } & BaseArgs,
    ThreadHistoryResponse
  >;
  /** Send message to admin agent */
  sendMessage: TypedAction<{ threadId: string; message: string } & BaseArgs, SendMessageResponse>;
}

// =============================================================================
// Combined Admin API Type
// =============================================================================

/**
 * Typed API structure for admin functions.
 * Use this to access all typed admin Convex functions.
 */
export interface AdminAPI {
  admin: {
    admin: AdminUserQueries & AdminUserMutations;
    reports: AdminReportQueries & AdminReportMutations;
  };
  ai: {
    adminAgentApi: AdminAgentActions;
  };
}
