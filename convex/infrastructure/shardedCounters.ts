/**
 * Sharded Counter Configurations
 *
 * Provides distributed counters for high-frequency operations.
 * Use sharded counters when you expect >10 updates/second to avoid OCC conflicts.
 *
 * Benefits:
 * - Eliminates OCC conflicts on hot counters
 * - Scales horizontally with shard count
 * - Eventually consistent (slight delay in count())
 */

import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "../_generated/api";

/**
 * Spectator Counter
 *
 * Tracks number of spectators watching a game lobby.
 * Sharded to handle multiple simultaneous joins/leaves without conflicts.
 *
 * Shard count: 20 (handles ~200 concurrent spectator changes/sec)
 */
/**
 * Type assertion required: @convex-dev/sharded-counter component
 * expects Partial<Record<keyof Number, number>> but we need to pass
 * a plain object with shards count. This is a known limitation of
 * the component's type definitions.
 */
export const spectatorCounter = new ShardedCounter(
  components.shardedCounter,
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  { shards: 20 } as any
);

/**
 * Token Holder Counter
 *
 * Tracks total number of token holders (addresses with balance > 0).
 * Sharded to handle high-frequency trade updates without OCC conflicts.
 *
 * Shard count: 100 (handles ~1000 concurrent updates/sec)
 */
export const tokenHolderCounter = new ShardedCounter(
  components.shardedCounter,
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  { shards: 100 } as any
);

/**
 * Token 24h Transaction Counter
 *
 * Tracks transaction count in rolling 24h window.
 * Reset daily at midnight UTC by cron job.
 *
 * Shard count: 100 (handles ~1000 concurrent updates/sec)
 */
export const tokenTx24hCounter = new ShardedCounter(
  components.shardedCounter,
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  { shards: 100 } as any
);

/**
 * Global Chat Message Counter
 *
 * Tracks total messages sent (all time).
 * Sharded to handle high-frequency chat activity.
 *
 * Shard count: 30 (handles ~300 concurrent messages/sec)
 */
export const globalChatMessageCounter = new ShardedCounter(
  components.shardedCounter,
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  { shards: 30 } as any
);

/**
 * Total Games Counter
 *
 * Tracks total games created (all time).
 * Sharded to handle high-frequency game creation.
 *
 * Shard count: 20 (handles ~200 concurrent game creations/sec)
 */
export const totalGamesCounter = new ShardedCounter(
  components.shardedCounter,
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  { shards: 20 } as any
);

/**
 * Completed Games Counter
 *
 * Tracks total completed games (all time).
 * Sharded to handle high-frequency game completions.
 *
 * Shard count: 20 (handles ~200 concurrent game completions/sec)
 */
export const completedGamesCounter = new ShardedCounter(
  components.shardedCounter,
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  { shards: 20 } as any
);
