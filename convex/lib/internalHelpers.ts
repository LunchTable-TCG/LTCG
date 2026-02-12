/**
 * Internal API Helpers
 *
 * This module provides typed references to internal Convex API functions.
 * All paths are explicitly typed to break the deep type instantiation
 * that causes TS2589 errors when using the raw `internal` API reference.
 *
 * Instead of using FunctionReference generics (which cause constraint issues),
 * we define a simpler type structure that provides the same type safety
 * for the actual usage patterns in the codebase.
 */

import type { FunctionReference } from "convex/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// =============================================================================
// Re-export FunctionReference type for convenience
// =============================================================================

// Generic function reference types for internal API paths
type InternalQueryFn = FunctionReference<"query", "internal">;
type InternalMutationFn = FunctionReference<"mutation", "internal">;
type InternalActionFn = FunctionReference<"action", "internal">;

// =============================================================================
// Arg Types (with index signatures for DefaultFunctionArgs compatibility)
// =============================================================================

// Use intersection with Record to satisfy DefaultFunctionArgs constraint
type Args<T> = T & Record<string, unknown>;

// --- agents.webhooks ---
type GetAgentWebhookConfigArgs = Args<{ agentId: Id<"agents"> }>;
type RecordWebhookArgs = Args<{ agentId: Id<"agents"> }>;

// --- agents.agents ---
type ValidateApiKeyArgs = Args<{ apiKey: string }>;

// --- agents.decisions ---
type SaveDecisionArgs = Args<{
  agentId: Id<"agents">;
  gameId: string;
  turnNumber: number;
  phase: string;
  action: string;
  reasoning: string;
  parameters?: unknown;
  executionTimeMs?: number;
  result?: string;
}>;

type GetGameDecisionsArgs = Args<{ gameId: string; limit?: number }>;
type GetAgentDecisionsArgs = Args<{ agentId: Id<"agents">; limit?: number }>;
type GetAgentDecisionStatsArgs = Args<{ agentId: Id<"agents"> }>;

// --- economy.shop ---
type PurchasePackFromX402Args = Args<{
  payerWallet: string;
  transactionSignature: string;
  productId: string;
  tokenAmount: string;
  userId: Id<"users"> | null;
  agentId: Id<"agents"> | null;
}>;

type PurchasePackArgs = Args<{ productId: string; useGems: boolean }>;

// --- economy.gemPurchases ---
type CreditGemsFromX402Args = Args<{
  payerWallet: string;
  transactionSignature: string;
  packageId: string;
  gemsAmount: number;
  usdValueCents: number;
  tokenAmount: string;
  userId: Id<"users"> | null;
  agentId: Id<"agents"> | null;
}>;

// --- economy.tokenBalance ---
type RefreshTokenBalanceArgs = Args<{ userId: Id<"users"> }>;
type GetUserWalletArgs = Args<{ userId: Id<"users"> }>;
type CacheTokenBalanceArgs = Args<{
  userId: Id<"users">;
  balance: number;
  walletAddress: string;
  tokenMint?: string;
}>;

// --- economy.tokenMarketplace ---
type PollTransactionConfirmationArgs = Args<{
  pendingPurchaseId: Id<"pendingTokenPurchases">;
  pollAttempt: number;
}>;

type GetPendingPurchaseArgs = Args<{ pendingPurchaseId: Id<"pendingTokenPurchases"> }>;
type FailTokenPurchaseArgs = Args<{
  pendingPurchaseId: Id<"pendingTokenPurchases">;
  reason: string;
}>;
type CompleteTokenPurchaseArgs = Args<{
  pendingPurchaseId: Id<"pendingTokenPurchases">;
  transactionSignature?: string;
}>;

// --- economy.tokenMaintenance ---
type ScheduleBalanceRefreshArgs = Args<{ userId: Id<"users"> }>;

// --- social.matchmaking ---
type CreateMatchedGameArgs = Args<{
  player1Id: Id<"users">;
  player2Id: Id<"users">;
  gameMode: string;
}>;

// --- social.tournaments ---
type TransitionToCheckInArgs = Args<{ tournamentId: Id<"tournaments"> }>;
type StartTournamentArgs = Args<{ tournamentId: Id<"tournaments"> }>;
type ForfeitNoShowMatchArgs = Args<{
  matchId: Id<"tournamentMatches">;
  noShowPlayerId: Id<"users">;
}>;

// --- gameplay ---
type GameUserArgs = Args<{ gameId: string; userId: Id<"users"> }>;
type NormalSummonInternalArgs = Args<{
  gameId: string;
  userId: Id<"users">;
  cardId: string;
  position: "attack" | "defense";
  tributeCardIds?: string[];
}>;

type DeclareAttackInternalArgs = Args<{
  gameId: string;
  userId: Id<"users">;
  attackerCardId: string;
  targetCardId?: string;
}>;

// --- ai.adminAgentAudit ---
type LogAgentResponseArgs = Args<{
  adminId: Id<"users">;
  threadId: string;
  promptLength: number;
  responseLength: number;
  toolCallCount: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelId?: string;
  durationMs?: number;
}>;

// --- progression ---
type UpdateQuestProgressArgs = Args<{ userId: Id<"users">; questType: string; progress: number }>;
type UpdateAchievementProgressArgs = Args<{
  userId: Id<"users">;
  achievementType: string;
  progress: number;
}>;
type CompleteStageInternalArgs = Args<{
  userId: Id<"users">;
  stageId: Id<"storyStages">;
  stars: number;
}>;
type CreateLevelUpNotificationArgs = Args<{
  userId: Id<"users">;
  newLevel: number;
  oldLevel: number;
}>;
type CreateBadgeNotificationArgs = Args<{
  userId: Id<"users">;
  badgeName: string;
  badgeDescription: string;
}>;
type AddBattlePassXPArgs = Args<{ userId: Id<"users">; xpAmount: number; source: string }>;

// --- lib.adminAudit ---
export interface AuditLogParams {
  adminId: Id<"users">;
  action: string;
  targetUserId?: Id<"users">;
  targetEmail?: string;
  metadata?: AuditLogMetadata;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  [key: string]: unknown; // Index signature for DefaultFunctionArgs
}

export type AuditLogMetadata = Record<string, string | number | boolean | null | undefined>;

// =============================================================================
// Return Types
// =============================================================================

interface WebhookConfigResult {
  callbackUrl?: string;
  webhookEnabled?: boolean;
  webhookFailCount?: number;
  webhookSecret?: string;
}

interface ApiKeyValidationResult {
  isValid: boolean;
  agentId?: Id<"agents">;
  userId?: Id<"users">;
  apiKeyId?: Id<"apiKeys">;
}

interface DecisionStatsResult {
  totalDecisions: number;
  actionCounts: Record<string, number>;
  avgExecutionTimeMs: number;
  successRate: number;
  successCount: number;
  failureCount: number;
}

interface CardResult {
  cardDefinitionId: Id<"cardDefinitions">;
  name: string;
  rarity: string;
  variant: string;
  element?: string;
  type?: string;
}

interface PurchasePackResult {
  success: boolean;
  productName: string;
  cardsReceived: CardResult[];
}

interface CreditGemsResult {
  success: boolean;
  newBalance: number;
  gemsCredited: number;
}

// =============================================================================
// Internal API Type Definition
// =============================================================================

/**
 * Typed internal API paths.
 *
 * This structure mirrors the actual `internal` API with specific types for
 * each function (query, mutation, or action) to ensure proper type checking
 * at usage sites.
 */
interface InternalApiPaths {
  agents: {
    webhooks: {
      getAgentWebhookConfig: InternalQueryFn;
      recordWebhookSuccess: InternalMutationFn;
      recordWebhookFailure: InternalMutationFn;
    };
    agents: {
      validateApiKeyInternalQuery: InternalQueryFn;
    };
    decisions: {
      saveDecision: InternalMutationFn;
      getGameDecisions: InternalQueryFn;
      getAgentDecisions: InternalQueryFn;
      getAgentDecisionStats: InternalQueryFn;
    };
  };
  economy: {
    shop: {
      getShopProductsInternal: InternalQueryFn;
      purchasePackFromX402: InternalMutationFn;
    };
    gemPurchases: {
      creditGemsFromX402: InternalMutationFn;
    };
    tokenBalance: {
      refreshTokenBalance: InternalActionFn;
      getUserWallet: InternalQueryFn;
      cacheTokenBalance: InternalMutationFn;
    };
    tokenMarketplace: {
      pollTransactionConfirmation: InternalActionFn;
      getPendingPurchase: InternalQueryFn;
      failTokenPurchase: InternalMutationFn;
      completeTokenPurchase: InternalMutationFn;
    };
    tokenMaintenance: {
      expireStalePurchases: InternalMutationFn;
      refreshActiveBalances: InternalActionFn;
      getRecentPendingPurchaseBuyers: InternalQueryFn;
      getRecentTokenListingSellers: InternalQueryFn;
      getRecentTokenTransactionUsers: InternalQueryFn;
      scheduleBalanceRefresh: InternalMutationFn;
    };
  };
  social: {
    matchmaking: {
      createMatchedGame: InternalMutationFn;
    };
    tournaments: {
      transitionToCheckIn: InternalMutationFn;
      startTournament: InternalMutationFn;
      getTimedOutMatches: InternalQueryFn;
      forfeitNoShowMatch: InternalMutationFn;
    };
    tournamentCron: {
      processPhaseTransitions: InternalActionFn;
      processNoShowForfeits: InternalActionFn;
    };
  };
  gameplay: {
    games: {
      queries: {
        getGameStateForPlayerInternal: InternalQueryFn;
      };
    };
    gameEngine: {
      summons: {
        normalSummonInternal: InternalMutationFn;
      };
      phases: {
        advanceToBattlePhaseInternal: InternalMutationFn;
        advanceToMainPhase2Internal: InternalMutationFn;
      };
      turns: {
        endTurnInternal: InternalMutationFn;
      };
    };
    combatSystem: {
      declareAttackInternal: InternalMutationFn;
    };
  };
  ai: {
    adminAgentAudit: {
      logAgentResponse: InternalMutationFn;
    };
  };
  progression: {
    quests: {
      updateQuestProgress: InternalMutationFn;
    };
    achievements: {
      updateAchievementProgress: InternalMutationFn;
    };
    storyStages: {
      completeStageInternal: InternalMutationFn;
    };
    notifications: {
      createLevelUpNotification: InternalMutationFn;
      createBadgeNotification: InternalMutationFn;
    };
    battlePass: {
      addBattlePassXP: InternalMutationFn;
    };
  };
  admin: {
    roles: {
      autoCleanupExpiredRoles: InternalMutationFn;
    };
  };
  lib: {
    adminAudit: {
      logAdminAction: InternalMutationFn;
    };
  };
}

// =============================================================================
// Exports
// =============================================================================

/**
 * Internal API reference with proper types.
 * Use this instead of importing `internal` directly to avoid TS2589 errors.
 *
 * The Convex internal API type causes TS2589 "Type instantiation is excessively deep"
 * due to its deeply nested structure. We use require() to defer type evaluation
 * and avoid the deep type instantiation that occurs with static imports.
 */

// Use require() to load internal API without triggering type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports
const internalModule = require("../_generated/api") as { internal: InternalApiPaths };

export const internalAny: InternalApiPaths = internalModule.internal;

/**
 * Pre-extracted reference to the admin audit log action.
 * Use this for scheduling audit log writes without TS2589 errors.
 */
export const auditLogAction = internalAny.lib.adminAudit.logAdminAction;

/**
 * Schedule an audit log entry for admin actions.
 *
 * This is the single source of truth for audit logging across all admin modules.
 * Use this instead of defining local helpers to avoid code duplication.
 *
 * @example
 * ```typescript
 * import { scheduleAuditLog } from "../lib/internalHelpers";
 *
 * await scheduleAuditLog(ctx, {
 *   adminId: userId,
 *   action: "delete_user",
 *   targetUserId: targetId,
 *   success: true,
 * });
 * ```
 */
export async function scheduleAuditLog(ctx: MutationCtx, params: AuditLogParams) {
  const isTestRuntime = process.env["VITEST"] === "true" || process.env["NODE_ENV"] === "test";
  if (isTestRuntime) {
    // Run inline in tests to avoid scheduler teardown races in convex-test.
    await ctx.runMutation(auditLogAction, params);
    return;
  }

  await ctx.scheduler.runAfter(0, auditLogAction, params);
}

// =============================================================================
// Type Exports for Usage Sites
// =============================================================================

// Export arg types for usage sites that need them
export type {
  GetAgentWebhookConfigArgs,
  RecordWebhookArgs,
  ValidateApiKeyArgs,
  SaveDecisionArgs,
  GetGameDecisionsArgs,
  GetAgentDecisionsArgs,
  GetAgentDecisionStatsArgs,
  PurchasePackFromX402Args,
  PurchasePackArgs,
  CreditGemsFromX402Args,
  RefreshTokenBalanceArgs,
  GetUserWalletArgs,
  CacheTokenBalanceArgs,
  PollTransactionConfirmationArgs,
  GetPendingPurchaseArgs,
  FailTokenPurchaseArgs,
  CompleteTokenPurchaseArgs,
  ScheduleBalanceRefreshArgs,
  CreateMatchedGameArgs,
  TransitionToCheckInArgs,
  StartTournamentArgs,
  ForfeitNoShowMatchArgs,
  GameUserArgs,
  NormalSummonInternalArgs,
  DeclareAttackInternalArgs,
  LogAgentResponseArgs,
  UpdateQuestProgressArgs,
  UpdateAchievementProgressArgs,
  CompleteStageInternalArgs,
  CreateLevelUpNotificationArgs,
  CreateBadgeNotificationArgs,
  AddBattlePassXPArgs,
};

// Export return types for usage sites
export type {
  WebhookConfigResult,
  ApiKeyValidationResult,
  DecisionStatsResult,
  CardResult,
  PurchasePackResult,
  CreditGemsResult,
};
