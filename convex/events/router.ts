/**
 * Domain Event Router
 *
 * Internal mutation that receives domain events and fans out to all
 * registered handlers. Each handler checks if it cares about the event type.
 *
 * This runs as a separate Convex mutation (scheduled via runAfter(0, ...))
 * so the originating game mutation has already completed.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { DomainEvent } from "./types";
import { handleEconomyEvent } from "./handlers/economyHandler";
import { handleProgressionEvent } from "./handlers/progressionHandler";
import { handleStatsEvent } from "./handlers/statsHandler";

export const handleEvent = internalMutation({
  args: { event: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = args.event as DomainEvent;

    // Fan out to all domain handlers.
    // Each handler checks event.type and ignores events it doesn't care about.
    // Handlers run sequentially within this mutation to avoid race conditions
    // on shared state (e.g., user stats document).
    await handleProgressionEvent(ctx, event);
    await handleEconomyEvent(ctx, event);
    await handleStatsEvent(ctx, event);

    return null;
  },
});
