import { cronJobs } from "convex/server";
// Workaround for TS2589 (excessively deep type instantiation)
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internal = (generatedApi as any).internal;
// biome-ignore lint/suspicious/noExplicitAny: Convex deep type workaround
const internalAny = internal as any;

const crons = cronJobs();

// Cleanup stale game lobbies every minute
crons.interval(
  "cleanup stale games",
  { minutes: 1 }, // Run every 1 minute
  internalAny.gameplay.games.cleanup.cleanupStaleGames
);

// Cleanup expired challenge lobbies and refund wagers every minute
// Challenges expire after 60 seconds if not accepted
crons.interval(
  "cleanup expired challenges",
  { minutes: 1 },
  internalAny.gameplay.games.lobby.cleanupExpiredChallenges
);

// Refresh leaderboard snapshots every 5 minutes
crons.interval(
  "refresh leaderboards",
  { minutes: 5 }, // Run every 5 minutes
  internal.leaderboards.refreshAllSnapshots
);

// Run matchmaking every 30 seconds (reduced from 10s to lower compute cost)
crons.interval("matchmaking", { seconds: 30 }, internal.matchmaking.findMatches);

// Cleanup expired queue entries every minute
crons.interval("cleanup-matchmaking", { seconds: 60 }, internal.matchmaking.cleanupExpiredEntries);

// Finalize expired auctions every 5 minutes
crons.interval("finalize-auctions", { minutes: 5 }, internal.marketplace.finalizeExpiredAuctions);

// Cleanup expired quests every hour
crons.interval(
  "cleanup-expired-quests",
  { hours: 1 },
  internal.progression.quests.cleanupExpiredQuests
);

// Generate daily quests every day at midnight UTC
crons.daily(
  "generate-daily-quests",
  { hourUTC: 0, minuteUTC: 0 },
  internal.progression.quests.generateDailyQuestsForAll
);

// Generate weekly quests every Monday at midnight UTC
crons.weekly(
  "generate-weekly-quests",
  { hourUTC: 0, minuteUTC: 0, dayOfWeek: "monday" },
  internal.progression.quests.generateWeeklyQuestsForAll
);

// Cleanup old notifications (30 days+) every day at 2 AM UTC
crons.daily(
  "cleanup-old-notifications",
  { hourUTC: 2, minuteUTC: 0 },
  internal.progression.notifications.cleanupOldNotifications
);

// Cleanup expired admin roles every hour
crons.interval(
  "cleanup-expired-admin-roles",
  { hours: 1 },
  internalAny.admin.roles.autoCleanupExpiredRoles
);

// Send welcome emails to new users every hour
crons.interval(
  "send-welcome-emails",
  { hours: 1 },
  internal.infrastructure.welcomeEmails.sendWelcomeEmailsToNewUsers
);

// Reset 24h transaction counter daily at midnight UTC
crons.daily(
  "reset-24h-tx-counter",
  { hourUTC: 0, minuteUTC: 0 },
  internal.webhooks.helius.reset24hTxCounter
);

// ============================================================================
// TOKEN MARKETPLACE MAINTENANCE
// ============================================================================

// Expire stale pending token purchases every minute
// (purchases stuck in "awaiting_signature" that have passed their expiresAt)
crons.interval(
  "expire-stale-token-purchases",
  { minutes: 1 },
  internalAny.economy.tokenMaintenance.expireStalePurchases
);

// Refresh token balances for active marketplace users every 5 minutes
// (keeps balances fresh for active traders without excessive RPC calls)
crons.interval(
  "refresh-active-token-balances",
  { minutes: 5 },
  internalAny.economy.tokenMaintenance.refreshActiveBalances
);

// ============================================================================
// ELIZAOS TOKEN MONITORING
// ============================================================================

// Check user wallets for ElizaOS token every hour
// - Silently checks active users' wallets for ElizaOS token
// - Unlocks hidden "Agent Believer" achievement when detected
// - Grants exclusive Agent Card reward
crons.interval(
  "elizaos-token-check",
  { hours: 1 },
  internalAny.economy.elizaOSMonitor.batchCheckWallets
);

// ============================================================================
// TOURNAMENT SYSTEM MAINTENANCE
// ============================================================================

// Check for no-show forfeits every minute
// - Forfeit players who don't join their tournament match within timeout
crons.interval(
  "tournament-no-show-forfeits",
  { minutes: 1 },
  internalAny.social.tournamentCron.processNoShowForfeits
);

// Note: Content publishing and tournament phase transitions are now
// scheduled per-item via ctx.scheduler.runAt() in their respective mutations.
// User tournament expiry is also scheduled per-tournament at creation time.

// ============================================================================
// STREAMING SESSION CLEANUP
// ============================================================================

// Cleanup stale streaming sessions every 2 minutes
// - Ends sessions stuck in initializing/pending for >5 minutes
// - Ends sessions stuck in error status for >5 minutes
// - Safety-ends live sessions >12 hours old
// - Removes expired overlay access codes
crons.interval(
  "cleanup-stale-streaming-sessions",
  { minutes: 2 },
  internalAny.streaming.sessions.cleanupStaleSessions
);

// Agent autonomy watchdog every minute
// - Heartbeats agent presence for observability
// - Cleans duplicate stream sessions/egresses
// - Restarts story mode if an agent is idle too long
// - Attempts stream start for active games missing a stream session
crons.interval("agent-autonomy-watchdog", { minutes: 1 }, internalAny.agents.autonomy.tick);

// ============================================================================
// CRYPTO WAGER DISCONNECT MONITOR
// ============================================================================

// Check for disconnected players in crypto wager matches every 10 seconds
// - Starts 30s DC timer when heartbeat goes stale (>15s)
// - Forfeits disconnected player when timer exceeds 30s
// - If both disconnect, last-to-DC loses (host wins tiebreaker)
crons.interval(
  "check-wager-disconnects",
  { seconds: 10 },
  internalAny.wager.disconnectMonitor.checkDisconnects
);

// ============================================================================
// CRYPTO WAGER SETTLEMENT RETRY
// ============================================================================

// Retry failed crypto wager settlements every 60 seconds
// - Finds completed games where cryptoSettled is false
// - Re-schedules settleEscrow with stored winner/loser IDs
// - settleEscrow is idempotent (no-ops if already settled)
crons.interval(
  "retry-wager-settlements",
  { seconds: 60 },
  internalAny.wager.settlementRetry.retryFailedSettlements
);

// ============================================================================
// DATA INTEGRITY MONITORING
// ============================================================================

// Run integrity checks every 5 minutes
// Detects negative balances, currency conservation violations, duplicate rewards, etc.
crons.interval(
  "integrity checks",
  { minutes: 5 },
  internalAny.monitoring.integrity.runIntegrityChecks
);

// ============================================================================
// ANALYTICS SNAPSHOTS
// ============================================================================

// Capture analytics snapshot every hour for trend analysis
crons.interval(
  "analytics-snapshot",
  { hours: 1 },
  internalAny.admin.analyticsSnapshots.captureSnapshot
);

// Cleanup old analytics snapshots daily at 3 AM UTC
// Keeps: hourly for 7 days, daily for 90 days
crons.daily(
  "cleanup-analytics-snapshots",
  { hourUTC: 3, minuteUTC: 0 },
  internalAny.admin.analyticsSnapshots.cleanupOldSnapshots
);

// ============================================================================
// BATTLE PASS LIFECYCLE
// ============================================================================

// Auto-activate upcoming and auto-end expired battle passes daily at 00:05 UTC
crons.daily(
  "battle-pass-lifecycle",
  { hourUTC: 0, minuteUTC: 5 },
  internal.progression.battlePass.checkBattlePassLifecycle
);

export default crons;
