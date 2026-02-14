/**
 * Domain Event Emitter
 *
 * Emits domain events asynchronously via ctx.scheduler.runAfter(0, ...).
 * The originating mutation completes before handlers execute, keeping
 * game logic decoupled from economy, progression, and stats concerns.
 *
 * Usage:
 *   import { emitEvent } from "../events/emitter";
 *   await emitEvent(ctx, { type: "game:ended", ... });
 */

import * as generatedApi from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type { DomainEvent } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround — internal API types are deeply nested
const internalAny = (generatedApi as any).internal;

/**
 * Emit a domain event. Handlers run asynchronously via scheduler.
 * The current mutation completes before handlers execute.
 *
 * @param ctx - Mutation context (needed for scheduler access)
 * @param event - The domain event to emit
 */
export async function emitEvent(ctx: MutationCtx, event: DomainEvent) {
  await ctx.scheduler.runAfter(0, internalAny.events.router.handleEvent, {
    event,
  });
}

/**
 * Emit multiple domain events. Each handler invocation is independent.
 *
 * @param ctx - Mutation context
 * @param events - Array of domain events to emit
 */
export async function emitEvents(ctx: MutationCtx, events: DomainEvent[]) {
  await Promise.all(events.map((event) => emitEvent(ctx, event)));
}
