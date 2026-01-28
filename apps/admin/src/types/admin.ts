/**
 * Admin Dashboard Types
 *
 * Reusable type definitions for the admin dashboard.
 * These types mirror the Convex validators for full type safety.
 */

import type { Id } from "../../../../_generated/dataModel";

// =============================================================================
// Admin Role Types
// =============================================================================

export type AdminRole = "superadmin" | "admin" | "moderator";

export type AdminRoleData = {
  _id: Id<"adminRoles">;
  _creationTime: number;
  userId: Id<"users">;
  role: AdminRole;
  permissions: string[];
  grantedBy?: Id<"users">;
  grantedAt: number;
  expiresAt?: number;
  isActive: boolean;
  notes?: string;
};

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  superadmin: [
    "admin.manage",
    "admin.audit.view",
    "player.ban",
    "player.suspend",
    "player.warn",
    "player.view",
    "player.edit",
    "currency.grant",
    "currency.deduct",
    "card.create",
    "card.edit",
    "card.ban",
    "listing.create",
    "listing.edit",
    "listing.delete",
    "season.create",
    "season.edit",
    "config.edit",
    "batch.operations",
  ],
  admin: [
    "admin.audit.view",
    "player.ban",
    "player.suspend",
    "player.warn",
    "player.view",
    "player.edit",
    "currency.grant",
    "currency.deduct",
    "card.create",
    "card.edit",
    "card.ban",
    "listing.create",
    "listing.edit",
    "listing.delete",
    "season.create",
    "season.edit",
    "config.edit",
    "batch.operations",
  ],
  moderator: ["player.ban", "player.suspend", "player.warn", "player.view", "admin.audit.view"],
};

// =============================================================================
// Player Types
// =============================================================================

export type PlayerType = "human" | "ai";

export type PlayerStats = {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
};

export type Player = {
  _id: Id<"players">;
  _creationTime: number;
  name: string;
  type: PlayerType;
  userId?: Id<"users">;
  stats: PlayerStats;
  createdAt: number;
  lastActiveAt: number;
  eloRating?: number;
  seasonRating?: number;
  // Moderation fields
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: number;
  bannedBy?: Id<"users">;
  suspendedUntil?: number;
  suspensionReason?: string;
  warningCount?: number;
};

export type PlayerAdminView = {
  _id: Id<"players">;
  name: string;
  type: PlayerType;
  userId?: Id<"users">;
  eloRating?: number;
  seasonRating?: number;
  stats: PlayerStats;
  createdAt: number;
  lastActiveAt: number;
  apiKeys: Array<{
    _id: Id<"apiKeys">;
    keyPrefix: string;
    isActive: boolean;
    lastUsedAt?: number;
  }>;
  recentGames: Array<{
    gameId: Id<"games">;
    gameName: string;
    won: boolean;
    endedAt?: number;
  }>;
};

export type PlayerModerationStatus = {
  playerId: Id<"players">;
  playerName: string;
  isBanned: boolean;
  banReason?: string;
  bannedAt?: number;
  isSuspended: boolean;
  suspendedUntil?: number;
  suspensionReason?: string;
  warningCount: number;
  recentActions: Array<{
    action: ModerationAction;
    reason: string;
    createdAt: number;
  }>;
};

export type BannedPlayer = {
  playerId: Id<"players">;
  playerName: string;
  banReason?: string;
  bannedAt?: number;
};

// =============================================================================
// Moderation Types
// =============================================================================

export type ModerationAction = "warn" | "mute" | "suspend" | "ban" | "unban" | "unsuspend" | "note";

export type ModerationLogEntry = {
  _id: Id<"playerModerationLog">;
  _creationTime: number;
  playerId: Id<"players">;
  adminUserId: Id<"users">;
  action: ModerationAction;
  reason: string;
  duration?: number;
  expiresAt?: number;
  previousState?: {
    isBanned?: boolean;
    suspendedUntil?: number;
    warningCount?: number;
  };
  createdAt: number;
};

// =============================================================================
// Season Types
// =============================================================================

export type Season = {
  _id: Id<"seasons">;
  _creationTime: number;
  seasonId: string;
  name: string;
  startDate: number;
  endDate: number;
  isActive: boolean;
  finalLeaderboard?: Array<{
    playerId: Id<"players">;
    rank: number;
    rating: number;
  }>;
};

export type SeasonStats = {
  seasonId: string;
  name: string;
  isActive: boolean;
  totalGames: number;
  rankedGames: number;
  uniquePlayers: number;
  averageRating: number;
  topPlayers: Array<{
    playerId: Id<"players">;
    name: string;
    rating: number;
    gamesPlayed: number;
  }>;
  daysRemaining: number;
};

// =============================================================================
// API Key Types
// =============================================================================

export type ApiKey = {
  _id: Id<"apiKeys">;
  playerId: Id<"players">;
  playerName: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  lastUsedAt?: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
};

// =============================================================================
// System Stats Types
// =============================================================================

export type SystemStats = {
  totalPlayers: number;
  humanPlayers: number;
  aiPlayers: number;
  totalGames: number;
  activeGames: number;
  completedGames: number;
  recentGames: number;
  totalApiKeys: number;
  activeApiKeys: number;
  playersInQueue: number;
  activeSeason: string | null;
};

// =============================================================================
// Audit Log Types
// =============================================================================

export type AuditTargetType = "player" | "card" | "listing" | "season" | "config" | "system";

export type AuditLogEntry = {
  _id: Id<"adminAuditLog">;
  _creationTime: number;
  adminUserId: Id<"users">;
  action: string;
  targetType: AuditTargetType;
  targetId?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  createdAt: number;
};

// =============================================================================
// Suspicious Activity Types
// =============================================================================

export type SuspiciousMatchup = {
  player1Id: Id<"players">;
  player1Name: string;
  player2Id: Id<"players">;
  player2Name: string;
  gamesPlayed: number;
  player1Wins: number;
  player2Wins: number;
  winRate: number;
  avgGameDuration: number;
  flags: string[];
  suspicionScore: number;
};

export type AbnormalRatingChange = {
  playerId: Id<"players">;
  playerName: string;
  currentRating: number;
  ratingChange: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  flags: string[];
};

export type SuspiciousActivityReport = {
  reportGeneratedAt: number;
  lookbackDays: number;
  suspiciousMatchups: number;
  abnormalRatingChanges: number;
  recentBans: number;
  recentWarnings: number;
  summary: Array<{
    category: string;
    count: number;
    severity: "low" | "medium" | "high";
  }>;
};

// =============================================================================
// Generic Table Types
// =============================================================================

export type SortDirection = "asc" | "desc";

export type ColumnDef<T> = {
  id: keyof T | string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
};

export type TableState = {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
  filters: Record<string, string>;
};

// =============================================================================
// Form Types
// =============================================================================

export type FormFieldConfig<T extends Record<string, unknown>> = {
  name: keyof T;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "date" | "checkbox";
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  };
};
