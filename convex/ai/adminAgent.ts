/**
 * Admin Agent Definition
 *
 * Defines the Admin Assistant agent for helping game administrators with:
 * - Player data queries and moderation
 * - Content generation (news, promo codes)
 * - Analytics and metrics explanation
 * - Admin action execution with confirmation
 *
 * Uses the centralized provider configuration for model selection:
 * - Primary: OpenRouter (400+ models with fallbacks)
 * - Fallback: Vercel AI Gateway or direct OpenAI
 */

import { Agent, type ToolCtx, createTool } from "@convex-dev/agent";
import { z } from "zod";
import { api, components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getAdminAgentModel, getStandardEmbeddingModel } from "./providers";

// =============================================================================
// Helper Types
// =============================================================================

interface PlayerListItem {
  playerId: string;
  name: string;
  type: string;
  eloRating: number;
  rank?: number;
}

interface PlayerProfile {
  _id: Id<"users">;
  name?: string;
  username?: string;
  type?: string;
  eloRating?: number;
  seasonRating?: number;
  rank?: string;
  percentile?: number;
  peakRating?: number;
  stats?: Record<string, unknown>;
  lastActiveAt?: number;
  createdAt?: number;
}

interface InventoryCard {
  name: string;
  rarity: string;
  quantity: number;
}

interface PlayerInventory {
  playerId: string;
  playerName: string;
  gold: number;
  totalCards: number;
  uniqueCards: number;
  byRarity: Record<string, number>;
  cards: InventoryCard[];
}

interface SystemStats {
  totalPlayers: number;
  humanPlayers: number;
  aiPlayers: number;
  totalGames: number;
  activeGames: number;
  completedGames: number;
  recentGames: number;
  playersInQueue: number;
  totalApiKeys: number;
  activeApiKeys: number;
  activeSeason?: unknown;
}

interface SuspiciousReport {
  reportGeneratedAt: number;
  lookbackDays: number;
  suspiciousMatchups: number;
  abnormalRatingChanges: number;
  recentBans: number;
  recentWarnings: number;
  summary: unknown[];
}

interface AuditLog {
  action: string;
  adminUsername: string;
  targetUsername?: string;
  targetEmail?: string;
  success: boolean;
  timestamp: number;
  errorMessage?: string;
}

interface AuditLogResult {
  logs: AuditLog[];
  hasMore: boolean;
}

interface AdminUser {
  userId: Id<"users">;
  username: string;
  email: string;
  role: string;
  grantedBy: { username: string };
  grantedAt: number;
}

// =============================================================================
// Admin Tools
// =============================================================================

/**
 * Tool to search for players by username or email
 */
const searchPlayers = createTool({
  description:
    "Search for players by username or email. Returns basic player info including ID, name, rating, and account status.",
  args: z.object({
    query: z.string().describe("Search query - username or email (partial match)"),
    limit: z.number().optional().default(10).describe("Maximum results to return"),
  }),
  handler: async (ctx: ToolCtx, args: { query: string; limit: number }) => {
    const players = (await ctx.runQuery(api.admin.admin.listPlayers, {
      limit: args.limit,
    })) as PlayerListItem[];

    // Filter by query (client-side search since listPlayers doesn't support search)
    const query = args.query.toLowerCase();
    const filtered = players.filter(
      (p: PlayerListItem) =>
        p.name.toLowerCase().includes(query) || p.playerId.toLowerCase().includes(query)
    );

    return {
      count: filtered.length,
      players: filtered.slice(0, args.limit).map((p: PlayerListItem) => ({
        id: p.playerId,
        name: p.name,
        type: p.type,
        eloRating: p.eloRating,
        rank: p.rank,
      })),
    };
  },
});

/**
 * Tool to get detailed player profile
 */
const getPlayerProfile = createTool({
  description:
    "Get detailed profile for a specific player including stats, rating, rank, and activity info.",
  args: z.object({
    playerId: z.string().describe("The player's ID (from search results)"),
  }),
  handler: async (ctx: ToolCtx, args: { playerId: string }) => {
    const profile = (await ctx.runQuery(api.admin.admin.getPlayerProfile, {
      playerId: args.playerId as Id<"users">,
    })) as PlayerProfile | null;

    if (!profile) {
      return { error: "Player not found" };
    }

    return {
      id: profile._id,
      name: profile.name,
      username: profile.username,
      type: profile.type,
      eloRating: profile.eloRating,
      seasonRating: profile.seasonRating,
      rank: profile.rank,
      percentile: profile.percentile,
      peakRating: profile.peakRating,
      stats: profile.stats,
      lastActiveAt: profile.lastActiveAt,
      createdAt: profile.createdAt,
    };
  },
});

/**
 * Tool to get player inventory
 */
const getPlayerInventory = createTool({
  description:
    "Get a player's card inventory including total cards, unique cards, and rarity breakdown.",
  args: z.object({
    playerId: z.string().describe("The player's ID"),
  }),
  handler: async (ctx: ToolCtx, args: { playerId: string }) => {
    const inventory = (await ctx.runQuery(api.admin.admin.getPlayerInventory, {
      playerId: args.playerId as Id<"users">,
    })) as PlayerInventory | null;

    if (!inventory) {
      return { error: "Player not found or has no inventory" };
    }

    return {
      playerId: inventory.playerId,
      playerName: inventory.playerName,
      gold: inventory.gold,
      totalCards: inventory.totalCards,
      uniqueCards: inventory.uniqueCards,
      byRarity: inventory.byRarity,
      // Don't include full card list in tool response - too verbose
      cardPreview: inventory.cards.slice(0, 5).map((c: InventoryCard) => ({
        name: c.name,
        rarity: c.rarity,
        quantity: c.quantity,
      })),
    };
  },
});

/**
 * Tool to get system statistics
 */
const getSystemStats = createTool({
  description:
    "Get current system statistics including player counts, game stats, and API key usage.",
  args: z.object({}),
  handler: async (ctx: ToolCtx) => {
    const stats = (await ctx.runQuery(api.admin.admin.getSystemStats, {})) as SystemStats;

    return {
      players: {
        total: stats.totalPlayers,
        human: stats.humanPlayers,
        ai: stats.aiPlayers,
      },
      games: {
        total: stats.totalGames,
        active: stats.activeGames,
        completed: stats.completedGames,
        recentThirtyDays: stats.recentGames,
        playersInQueue: stats.playersInQueue,
      },
      apiKeys: {
        total: stats.totalApiKeys,
        active: stats.activeApiKeys,
      },
      activeSeason: stats.activeSeason,
    };
  },
});

/**
 * Tool to get suspicious activity report
 */
const getSuspiciousActivity = createTool({
  description:
    "Get a report of suspicious activity including pending reports, recent bans, unusual matchups, and rating anomalies.",
  args: z.object({
    lookbackDays: z.number().optional().default(7).describe("Number of days to analyze"),
  }),
  handler: async (ctx: ToolCtx, args: { lookbackDays: number }) => {
    const report = (await ctx.runQuery(api.admin.admin.getSuspiciousActivityReport, {
      lookbackDays: args.lookbackDays,
    })) as SuspiciousReport;

    return {
      generatedAt: new Date(report.reportGeneratedAt).toISOString(),
      lookbackDays: report.lookbackDays,
      suspiciousMatchups: report.suspiciousMatchups,
      abnormalRatingChanges: report.abnormalRatingChanges,
      recentBans: report.recentBans,
      recentWarnings: report.recentWarnings,
      summary: report.summary,
    };
  },
});

/**
 * Tool to get audit logs
 */
const getAuditLogs = createTool({
  description: "Get recent admin audit logs showing all admin actions taken in the system.",
  args: z.object({
    limit: z.number().optional().default(20).describe("Maximum logs to return"),
    action: z
      .string()
      .optional()
      .describe("Filter by action type (e.g., 'ban_player', 'grant_role')"),
  }),
  handler: async (ctx: ToolCtx, args: { limit: number; action?: string }) => {
    const result = (await ctx.runQuery(api.admin.admin.getAuditLog, {
      limit: args.limit,
      action: args.action,
    })) as AuditLogResult;

    return {
      count: result.logs.length,
      hasMore: result.hasMore,
      logs: result.logs.map((log: AuditLog) => ({
        action: log.action,
        admin: log.adminUsername,
        target: log.targetUsername || log.targetEmail,
        success: log.success,
        timestamp: new Date(log.timestamp).toISOString(),
        error: log.errorMessage,
      })),
    };
  },
});

/**
 * Tool to list current admin users
 */
const listAdmins = createTool({
  description: "List all admin users with their roles (moderator, admin, superadmin).",
  args: z.object({
    role: z
      .enum(["moderator", "admin", "superadmin"])
      .optional()
      .describe("Filter by specific role"),
  }),
  handler: async (ctx: ToolCtx, args: { role?: "moderator" | "admin" | "superadmin" }) => {
    const admins = (await ctx.runQuery(api.admin.admin.listAdmins, {
      role: args.role,
    })) as AdminUser[];

    return {
      count: admins.length,
      admins: admins.map((a: AdminUser) => ({
        userId: a.userId,
        username: a.username,
        email: a.email,
        role: a.role,
        grantedBy: a.grantedBy.username,
        grantedAt: new Date(a.grantedAt).toISOString(),
      })),
    };
  },
});

// =============================================================================
// Agent Definition
// =============================================================================

export const adminAgent = new Agent(components.agent, {
  name: "Admin Assistant",
  // Uses OpenRouter/Gateway/OpenAI based on available API keys
  // Default: Claude 3.5 Sonnet via OpenRouter for best quality
  languageModel: getAdminAgentModel(),
  textEmbeddingModel: getStandardEmbeddingModel(),

  instructions: `You are the LTCG Admin Assistant, helping game administrators manage the trading card game platform.

**Your Capabilities:**

**Player Data & Moderation:**
- Search and review player profiles using the searchPlayers and getPlayerProfile tools
- View player inventories and card collections with getPlayerInventory
- Analyze moderation history through audit logs
- Identify suspicious patterns using getSuspiciousActivity

**System Overview:**
- Check system statistics with getSystemStats (player counts, game activity, API usage)
- Review admin team with listAdmins
- Access audit logs for accountability with getAuditLogs

**Content & Analytics:**
- Help draft news articles and promo code ideas (suggest content, don't create directly)
- Explain game metrics and what they mean
- Identify trends in player engagement

**Important Guidelines:**

1. **Always verify before acting** - When asked about a player, search first to confirm you have the right person
2. **Explain your reasoning** - When suggesting moderation actions, explain why based on the data
3. **Request confirmation** - Before any write operations, ask the admin to confirm
4. **Respect permissions** - Only suggest actions the admin can perform based on their role
5. **Be concise but thorough** - Provide relevant details without overwhelming
6. **Reference specific data** - When making recommendations, cite the evidence

**Response Format:**
- Use structured responses with clear sections
- Include relevant numbers and dates
- Highlight any concerning patterns or anomalies
- Suggest next steps when appropriate`,

  tools: {
    searchPlayers,
    getPlayerProfile,
    getPlayerInventory,
    getSystemStats,
    getSuspiciousActivity,
    getAuditLogs,
    listAdmins,
  },

  contextOptions: {
    recentMessages: 20,
    searchOptions: {
      limit: 10,
      textSearch: true,
    },
  },
});
