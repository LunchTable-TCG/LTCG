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
