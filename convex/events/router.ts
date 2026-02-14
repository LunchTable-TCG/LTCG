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

const KNOWN_EVENT_TYPES = new Set([
  "game:ended",
  "player:defeated_by_lp",
  "player:defeated_by_deckout",
  "player:defeated_by_breakdown",
  "match:completed",
  "story:stage_completed",
  "wager:payout",
  "crypto:escrow_settle",
]);

export const handleEvent = internalMutation({
  args: { event: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = args.event as DomainEvent;

    if (!event?.type || !KNOWN_EVENT_TYPES.has(event.type)) {
      console.error("Unknown domain event type, dropping:", event?.type);
      return null;
    }

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
