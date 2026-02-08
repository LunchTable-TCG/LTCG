/**
 * Game Events System
 *
 * Records and retrieves game events for spectators, replays, and game history.
 * Events are discrete actions (card played, attack, etc.) rather than streaming text.
 */

import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internal = (generatedApi as any).internal;
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { mutation } from "../functions";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get recent game events for spectators
 *
 * Returns events in chronological order with pagination support.
 * Spectators can use this to see a live "play-by-play" feed.
 */
export const getGameEvents = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { lobbyId, limit = 50, offset = 0 }) => {
    const events = await ctx.db
      .query("gameEvents")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .order("asc") // Chronological order (oldest first)
      .collect();

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    return paginatedEvents.map((event) => ({
      eventId: event._id,
      turnNumber: event.turnNumber,
      eventType: event.eventType,
      playerUsername: event.playerUsername,
      description: event.description,
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));
  },
});

/**
 * Get recent events (tail of event log)
 *
 * Returns the most recent N events, useful for showing latest activity.
 */
export const getRecentGameEvents = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { lobbyId, limit = 20 }) => {
    const events = await ctx.db
      .query("gameEvents")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .order("desc") // Most recent first
      .take(limit);

    // Reverse to show chronological order (oldest to newest)
    return events.reverse().map((event) => ({
      eventId: event._id,
      turnNumber: event.turnNumber,
      eventType: event.eventType,
      playerUsername: event.playerUsername,
      description: event.description,
      timestamp: event.timestamp,
      metadata: event.metadata,
    }));
  },
});

/**
 * Subscribe to game events (optimized for elizaOS agents)
 *
 * Returns new events since lastSeenTimestamp, enabling agents to:
 * - Monitor game state changes in real-time
 * - Build decision context from event history
 * - React to opponent actions
 *
 * This query is designed for Convex.onUpdate() subscriptions.
 */
export const subscribeToGameEvents = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    sinceTimestamp: v.optional(v.number()), // Get events after this timestamp
    eventTypes: v.optional(v.array(v.string())), // Filter specific event types
    limit: v.optional(v.number()), // Max events to return (default: 50)
    includeMetadata: v.optional(v.boolean()), // Include full metadata (default: true)
  },
  handler: async (ctx, args) => {
    const { lobbyId, sinceTimestamp, eventTypes, limit = 50, includeMetadata = true } = args;

    // Query events for this game
    const allEvents = await ctx.db
      .query("gameEvents")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .order("asc") // Chronological order
      .collect();

    // Filter by timestamp if provided
    let filtered = sinceTimestamp
      ? allEvents.filter((e) => e.timestamp > sinceTimestamp)
      : allEvents;

    // Filter by event types if provided
    if (eventTypes && eventTypes.length > 0) {
      filtered = filtered.filter((e) => eventTypes.includes(e.eventType));
    }

    // Apply limit (get last N events)
    filtered = filtered.slice(-limit);

    // Map to elizaOS-friendly format
    return filtered.map((event) => ({
      eventId: event._id,
      lobbyId: event.lobbyId,
      gameId: event.gameId,
      turnNumber: event.turnNumber,
      eventType: event.eventType,
      playerId: event.playerId,
      playerUsername: event.playerUsername,
      description: event.description,
      timestamp: event.timestamp,
      metadata: includeMetadata ? event.metadata : undefined,
    }));
  },
});

/**
 * Get event statistics for a game (useful for analytics and debugging)
 *
 * Returns aggregated stats about game events, such as:
 * - Total events recorded
 * - Count per event type
 * - Game duration
 */
export const getGameEventStats = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, { lobbyId }) => {
    const events = await ctx.db
      .query("gameEvents")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .collect();

    // Count events by type
    const eventCounts = events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get player stats
    const playerStats = events.reduce(
      (acc, event) => {
        const username = event.playerUsername;
        if (!acc[username]) {
          acc[username] = { actionsCount: 0, playerId: event.playerId };
        }
        acc[username].actionsCount++;
        return acc;
      },
      {} as Record<string, { actionsCount: number; playerId: Id<"users"> }>
    );

    return {
      totalEvents: events.length,
      eventCounts,
      playerStats,
      firstEvent: events[0]?.timestamp,
      lastEvent: events[events.length - 1]?.timestamp,
      gameDuration:
        events.length > 0 && events[0] && events[events.length - 1]
          ? (events[events.length - 1]?.timestamp ?? 0) - (events[0]?.timestamp ?? 0)
          : 0,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Called by game engine)
// ============================================================================

/**
 * Helper function to record a game event without mutation overhead
 *
 * Used by game engine to record events directly without ctx.runMutation latency.
 * Events are immediately visible to spectators and elizaOS agents via Convex reactivity.
 * All gameplay actions should record appropriate events for audit trail and replay systems.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Event parameters
 * @param params.lobbyId - Lobby ID the event belongs to
 * @param params.gameId - Game ID for event correlation
 * @param params.turnNumber - Turn number when event occurred
 * @param params.eventType - Type of event (e.g., "card_drawn", "attack_declared")
 * @param params.playerId - User ID of the player who triggered the event
 * @param params.playerUsername - Username for display in event feed
 * @param params.description - Human-readable event description
 * @param params.metadata - Optional metadata for detailed event information
 * @returns Promise that resolves when event is recorded
 */
export async function recordEventHelper(
  ctx: MutationCtx,
  params: {
    lobbyId: Id<"gameLobbies">;
    gameId: string;
    turnNumber: number;
    eventType: string;
    playerId: Id<"users">;
    playerUsername: string;
    description: string;
    // biome-ignore lint/suspicious/noExplicitAny: Flexible metadata structure for game events
    metadata?: any;
  }
): Promise<void> {
  await ctx.db.insert("gameEvents", {
    lobbyId: params.lobbyId,
    gameId: params.gameId,
    turnNumber: params.turnNumber,
    // biome-ignore lint/suspicious/noExplicitAny: Type assertion for dynamic event type union
    eventType: params.eventType as any,
    playerId: params.playerId,
    playerUsername: params.playerUsername,
    description: params.description,
    metadata: params.metadata,
    timestamp: Date.now(),
  });
}

/**
 * Record a game event
 *
 * Called by game engine when actions occur.
 * Events are immediately visible to spectators via Convex reactivity.
 */
export const recordEvent = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),
    turnNumber: v.number(),
    eventType: v.union(
      // Lifecycle Events (5)
      v.literal("game_start"),
      v.literal("game_end"),
      v.literal("turn_start"),
      v.literal("turn_end"),
      v.literal("phase_changed"),

      // Summon Events (5)
      v.literal("normal_summon"),
      v.literal("tribute_summon"),
      v.literal("flip_summon"),
      v.literal("special_summon"),
      v.literal("summon_negated"),

      // Card Placement Events (3)
      v.literal("monster_set"),
      v.literal("spell_set"),
      v.literal("trap_set"),

      // Activation Events (4)
      v.literal("spell_activated"),
      v.literal("trap_activated"),
      v.literal("effect_activated"),
      v.literal("activation_negated"),

      // Chain Events (3)
      v.literal("chain_link_added"),
      v.literal("chain_resolving"),
      v.literal("chain_resolved"),

      // Combat Events (8)
      v.literal("battle_phase_entered"),
      v.literal("attack_declared"),
      v.literal("damage_calculated"),
      v.literal("damage"),
      v.literal("card_destroyed_battle"),
      v.literal("replay_triggered"), // Battle replay triggered (monster count changed)
      v.literal("replay_target_selected"), // Attacker chose new target during replay
      v.literal("replay_cancelled"), // Attacker cancelled attack during replay

      // Zone Transition Events (6)
      v.literal("card_drawn"),
      v.literal("card_to_hand"),
      v.literal("card_to_graveyard"),
      v.literal("card_banished"),
      v.literal("card_to_deck"),
      v.literal("position_changed"),

      // Resource Events (4)
      v.literal("lp_changed"),
      v.literal("tribute_paid"),
      v.literal("deck_shuffled"),
      v.literal("hand_limit_enforced"),

      // elizaOS Agent Events (3) - Real autonomous AI agents using LLM
      v.literal("agent_thinking"), // Agent is making LLM call to decide action
      v.literal("agent_decided"), // Agent finished LLM call, chose an action
      v.literal("agent_error") // Agent encountered an error during decision
    ),
    playerId: v.id("users"),
    playerUsername: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, params) => {
    await recordEventHelper(ctx, params);
  },
});

/**
 * Helper function to record game start event without mutation overhead
 *
 * Used by game lifecycle mutations to record when a game begins.
 * Creates a special "game_start" event with both player information for spectator feeds.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Game start parameters
 * @param params.lobbyId - Lobby ID for the game
 * @param params.gameId - Unique game ID
 * @param params.hostId - User ID of the host player
 * @param params.hostUsername - Host's username for display
 * @param params.opponentId - User ID of the opponent player
 * @param params.opponentUsername - Opponent's username for display
 * @returns Promise that resolves when event is recorded
 */
export async function recordGameStartHelper(
  ctx: MutationCtx,
  params: {
    lobbyId: Id<"gameLobbies">;
    gameId: string;
    hostId: Id<"users">;
    hostUsername: string;
    opponentId: Id<"users">;
    opponentUsername: string;
  }
): Promise<void> {
  await ctx.db.insert("gameEvents", {
    lobbyId: params.lobbyId,
    gameId: params.gameId,
    turnNumber: 0,
    eventType: "game_start",
    playerId: params.hostId,
    playerUsername: "System",
    description: `Game started: ${params.hostUsername} vs ${params.opponentUsername}`,
    metadata: {
      hostId: params.hostId,
      hostUsername: params.hostUsername,
      opponentId: params.opponentId,
      opponentUsername: params.opponentUsername,
    },
    timestamp: Date.now(),
  });
}

/**
 * Record game start event
 *
 * Convenience function to record when a game begins.
 */
export const recordGameStart = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),
    hostId: v.id("users"),
    hostUsername: v.string(),
    opponentId: v.id("users"),
    opponentUsername: v.string(),
  },
  handler: async (ctx, params) => {
    await recordGameStartHelper(ctx, params);
  },
});

/**
 * Helper function to record game end event without mutation overhead
 *
 * Used by game lifecycle mutations to record when a game concludes.
 * Creates a special "game_end" event with winner/loser information for match history.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Game end parameters
 * @param params.lobbyId - Lobby ID for the game
 * @param params.gameId - Unique game ID
 * @param params.turnNumber - Final turn number when game ended
 * @param params.winnerId - User ID of the winning player
 * @param params.winnerUsername - Winner's username for display
 * @param params.loserId - User ID of the losing player
 * @param params.loserUsername - Loser's username for display
 * @returns Promise that resolves when event is recorded
 */
export async function recordGameEndHelper(
  ctx: MutationCtx,
  params: {
    lobbyId: Id<"gameLobbies">;
    gameId: string;
    turnNumber: number;
    winnerId: Id<"users">;
    winnerUsername: string;
    loserId: Id<"users">;
    loserUsername: string;
  }
): Promise<void> {
  await ctx.db.insert("gameEvents", {
    lobbyId: params.lobbyId,
    gameId: params.gameId,
    turnNumber: params.turnNumber,
    eventType: "game_end",
    playerId: params.winnerId,
    playerUsername: "System",
    description: `${params.winnerUsername} defeated ${params.loserUsername}!`,
    metadata: {
      winnerId: params.winnerId,
      winnerUsername: params.winnerUsername,
      loserId: params.loserId,
      loserUsername: params.loserUsername,
    },
    timestamp: Date.now(),
  });

  // Trigger game_end webhooks
  await ctx.runMutation(internal.gameplay.webhooks.triggerWebhooks, {
    event: "game_end",
    gameId: params.gameId,
    lobbyId: params.lobbyId,
    turnNumber: params.turnNumber,
    playerId: params.winnerId,
    additionalData: {
      winnerId: params.winnerId,
      winnerUsername: params.winnerUsername,
      loserId: params.loserId,
      loserUsername: params.loserUsername,
    },
  });
}

/**
 * Record game end event
 *
 * Convenience function to record when a game ends.
 */
export const recordGameEnd = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),
    turnNumber: v.number(),
    winnerId: v.id("users"),
    winnerUsername: v.string(),
    loserId: v.id("users"),
    loserUsername: v.string(),
  },
  handler: async (ctx, params) => {
    await recordGameEndHelper(ctx, params);
  },
});
