/**
 * Game Events System
 *
 * Records and retrieves game events for spectators, replays, and game history.
 * Events are discrete actions (card played, attack, etc.) rather than streaming text.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
 * Subscribe to game events (optimized for ElizaOS agents)
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
    const {
      lobbyId,
      sinceTimestamp,
      eventTypes,
      limit = 50,
      includeMetadata = true,
    } = args;

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

    // Map to ElizaOS-friendly format
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
        events.length > 0
          ? events[events.length - 1].timestamp - events[0].timestamp
          : 0,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Called by game engine)
// ============================================================================

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

      // Combat Events (5)
      v.literal("battle_phase_entered"),
      v.literal("attack_declared"),
      v.literal("damage_calculated"),
      v.literal("damage"),
      v.literal("card_destroyed_battle"),

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
      v.literal("hand_limit_enforced")
    ),
    playerId: v.id("users"),
    playerUsername: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("gameEvents", {
      lobbyId: args.lobbyId,
      gameId: args.gameId,
      turnNumber: args.turnNumber,
      eventType: args.eventType,
      playerId: args.playerId,
      playerUsername: args.playerUsername,
      description: args.description,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

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
  handler: async (ctx, args) => {
    await ctx.db.insert("gameEvents", {
      lobbyId: args.lobbyId,
      gameId: args.gameId,
      turnNumber: 0,
      eventType: "game_start",
      playerId: args.hostId,
      playerUsername: "System",
      description: `Game started: ${args.hostUsername} vs ${args.opponentUsername}`,
      metadata: {
        hostId: args.hostId,
        hostUsername: args.hostUsername,
        opponentId: args.opponentId,
        opponentUsername: args.opponentUsername,
      },
      timestamp: Date.now(),
    });
  },
});

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
  handler: async (ctx, args) => {
    await ctx.db.insert("gameEvents", {
      lobbyId: args.lobbyId,
      gameId: args.gameId,
      turnNumber: args.turnNumber,
      eventType: "game_end",
      playerId: args.winnerId,
      playerUsername: "System",
      description: `${args.winnerUsername} defeated ${args.loserUsername}!`,
      metadata: {
        winnerId: args.winnerId,
        winnerUsername: args.winnerUsername,
        loserId: args.loserId,
        loserUsername: args.loserUsername,
      },
      timestamp: Date.now(),
    });
  },
});
