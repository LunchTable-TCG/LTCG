/**
 * Trigger System
 *
 * Centralized trigger detection and execution for card effects.
 * Handles scanning all effects on cards and executing matching triggers.
 *
 * SEGOC (Simultaneous Effects Go On Chain) ordering:
 * When multiple effects trigger at the same time, they are ordered:
 * 1. Turn player's mandatory effects first
 * 2. Opponent's mandatory effects second
 * 3. Turn player's optional effects third
 * 4. Opponent's optional effects fourth
 * Within each category, ordered by timestamp (first triggered = first in chain order)
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";
import { getCardAbility } from "../lib/abilityHelpers";
import { evaluateTriggerCondition } from "../lib/gameHelpers";
import { executeEffect } from "./effectSystem/index";
import type { ParsedEffect, TriggerCondition } from "./effectSystem/types";
import { recordEventHelper } from "./gameEvents";

// ============================================================================
// TYPES
// ============================================================================

/** Context for executing triggered effects */
interface TriggerContext {
  lobbyId: Id<"gameLobbies">;
  gameId: string;
  turnNumber: number;
  playerId: Id<"users">;
  playerUsername: string;
}

/** SEGOC queue item representing a triggered effect awaiting resolution (for future SEGOC implementation) */
export interface SegocQueueItem {
  cardId: Id<"cardDefinitions">;
  cardName: string;
  playerId: Id<"users">;
  trigger: string;
  effectIndex: number;
  isOptional: boolean;
  isTurnPlayer: boolean;
  addedAt: number;
  segocOrder: number; // 1=turn mandatory, 2=opp mandatory, 3=turn optional, 4=opp optional
}

/**
 * Get all effects from a card that match a specific trigger
 */
export function getTriggeredEffects(
  card: Doc<"cardDefinitions"> | null | undefined,
  trigger: TriggerCondition
): ParsedEffect[] {
  const ability = getCardAbility(card);
  if (!ability) return [];

  return ability.effects.filter((effect) => effect.trigger === trigger);
}

/**
 * Result from executing triggered effects, including pending optional triggers
 */
interface TriggerExecutionResult {
  executed: number;
  results: Array<{ success: boolean; message: string }>;
  pendingOptional?: Array<{
    cardId: Id<"cardDefinitions">;
    effectIndex: number;
    cardName: string;
    trigger: TriggerCondition;
  }>;
}

/**
 * Get triggered effects with their indices (for optional trigger tracking)
 */
export function getTriggeredEffectsWithIndices(
  card: Doc<"cardDefinitions"> | null | undefined,
  trigger: TriggerCondition
): Array<{ effect: ParsedEffect; index: number }> {
  const ability = getCardAbility(card);
  if (!ability) return [];

  return ability.effects
    .map((effect, index) => ({ effect, index }))
    .filter(({ effect }) => effect.trigger === trigger);
}

/**
 * Execute all matching triggered effects for a card
 *
 * Unlike getCardFirstEffect, this scans ALL effects on a card
 * and executes every one that matches the trigger condition.
 *
 * For optional triggers:
 * - Instead of auto-executing, adds them to pendingOptionalTriggers
 * - Returns the pending optional triggers in the result for frontend prompting
 *
 * For mandatory triggers:
 * - Executes immediately
 */
export async function executeTriggeredEffects(
  ctx: MutationCtx,
  _gameState: Doc<"gameStates">, // Passed for type checking, but we fetch fresh state for each effect
  card: Doc<"cardDefinitions">,
  cardId: Id<"cardDefinitions">,
  trigger: TriggerCondition,
  context: TriggerContext,
  targets: Id<"cardDefinitions">[] = []
): Promise<TriggerExecutionResult> {
  const triggeredEffectsWithIndices = getTriggeredEffectsWithIndices(card, trigger);

  if (triggeredEffectsWithIndices.length === 0) {
    return { executed: 0, results: [] };
  }

  const results: Array<{ success: boolean; message: string }> = [];
  const pendingOptional: Array<{
    cardId: Id<"cardDefinitions">;
    effectIndex: number;
    cardName: string;
    trigger: TriggerCondition;
  }> = [];

  for (const { effect, index } of triggeredEffectsWithIndices) {
    // Get fresh game state for each effect
    const refreshedState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", context.lobbyId))
      .first();

    if (!refreshedState) continue;

    // Check activation condition before executing
    if (effect.activationCondition) {
      const conditionMet = await evaluateTriggerCondition(
        ctx,
        refreshedState,
        effect.activationCondition,
        context.playerId
      );
      if (!conditionMet) {
        // Condition not met, skip this effect
        results.push({
          success: false,
          message: "Activation condition not met",
        });
        continue;
      }
    }

    // Check if this is an optional trigger
    if (effect.isOptional) {
      // Check if this trigger was already skipped this turn
      const skippedTriggers = refreshedState.skippedOptionalTriggers || [];
      const wasSkipped = skippedTriggers.some(
        (skipped) =>
          skipped.cardId === cardId &&
          skipped.trigger === trigger &&
          skipped.turnSkipped === context.turnNumber
      );

      if (wasSkipped) {
        // Skip this trigger - it was already declined this turn
        continue;
      }

      // Check if already pending
      const pendingTriggers = refreshedState.pendingOptionalTriggers || [];
      const alreadyPending = pendingTriggers.some(
        (pending) =>
          pending.cardId === cardId && pending.effectIndex === index && pending.trigger === trigger
      );

      if (!alreadyPending) {
        // Add to pending optional triggers for player to decide
        await ctx.db.patch(refreshedState._id, {
          pendingOptionalTriggers: [
            ...pendingTriggers,
            {
              cardId,
              cardName: card.name || "Unknown Card",
              effectIndex: index,
              trigger,
              playerId: context.playerId,
              addedAt: Date.now(),
            },
          ],
        });

        pendingOptional.push({
          cardId,
          effectIndex: index,
          cardName: card.name || "Unknown Card",
          trigger,
        });
      }

      continue; // Don't auto-execute optional triggers
    }

    // Mandatory trigger (default) - execute immediately
    const effectResult = await executeEffect(
      ctx,
      refreshedState,
      context.lobbyId,
      effect,
      context.playerId,
      cardId,
      targets
    );

    results.push(effectResult);

    if (effectResult.success) {
      await recordEventHelper(ctx, {
        lobbyId: context.lobbyId,
        gameId: context.gameId,
        turnNumber: context.turnNumber,
        eventType: "effect_activated",
        playerId: context.playerId,
        playerUsername: context.playerUsername,
        description: `${card.name} ${trigger} effect: ${effectResult.message}`,
        metadata: {
          cardId,
          trigger,
          effectType: effect.type,
          isMandatory: true,
        },
      });
    }
  }

  return {
    executed: results.length,
    results,
    pendingOptional: pendingOptional.length > 0 ? pendingOptional : undefined,
  };
}

/**
 * Check if a card has any effects with a specific trigger
 */
export function hasTriggeredEffect(
  card: Doc<"cardDefinitions"> | null | undefined,
  trigger: TriggerCondition
): boolean {
  return getTriggeredEffects(card, trigger).length > 0;
}

/**
 * Check if a card has any optional triggered effects with a specific trigger
 */
export function hasOptionalTriggeredEffect(
  card: Doc<"cardDefinitions"> | null | undefined,
  trigger: TriggerCondition
): boolean {
  const effects = getTriggeredEffects(card, trigger);
  return effects.some((effect) => effect.isOptional);
}

/**
 * Check if a card has any mandatory triggered effects with a specific trigger
 */
export function hasMandatoryTriggeredEffect(
  card: Doc<"cardDefinitions"> | null | undefined,
  trigger: TriggerCondition
): boolean {
  const effects = getTriggeredEffects(card, trigger);
  return effects.some((effect) => !effect.isOptional);
}

/**
 * Scan all cards on field for a specific trigger and execute matching effects
 * using SEGOC (Simultaneous Effects Go On Chain) ordering.
 *
 * SEGOC rules (Yu-Gi-Oh style):
 * 1. Turn player's mandatory effects first
 * 2. Opponent's mandatory effects second
 * 3. Turn player's optional effects third
 * 4. Opponent's optional effects fourth
 * Within each category, ordered by timestamp (first triggered = first in chain)
 *
 * Used for field-wide trigger checks like battle_start, end phase, etc.
 */
export async function scanFieldForTriggers(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  trigger: TriggerCondition,
  turnNumber: number
): Promise<void> {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby?.gameId || !gameState.currentTurnPlayerId) return;

  // Build SEGOC queue with proper ordering
  await buildSegocQueue(ctx, lobbyId, gameState, trigger, gameState.currentTurnPlayerId);

  // Process all items in the SEGOC queue
  let remaining = 1;
  while (remaining > 0) {
    // Get fresh game state for each iteration
    const refreshedState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();
    if (!refreshedState) break;

    const result = await processNextSegocItem(ctx, lobbyId, refreshedState, turnNumber);
    remaining = result.remaining;
  }
}

// ============================================================================
// SEGOC (Simultaneous Effects Go On Chain) FUNCTIONS
// ============================================================================

/**
 * Build SEGOC queue for simultaneous triggers
 *
 * Collects all triggered effects from cards on the field and orders them
 * according to SEGOC rules:
 * - Turn player's mandatory effects (segocOrder: 1)
 * - Opponent's mandatory effects (segocOrder: 2)
 * - Turn player's optional effects (segocOrder: 3)
 * - Opponent's optional effects (segocOrder: 4)
 *
 * Within each category, effects are ordered by timestamp (first triggered first).
 */
export async function buildSegocQueue(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  trigger: TriggerCondition,
  turnPlayerId: Id<"users">
): Promise<void> {
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby?.gameId) return;

  // Collect all cards on field with their owner information
  const allBoardCards = [
    ...gameState.hostBoard.map((bc) => ({ ...bc, ownerId: gameState.hostId })),
    ...gameState.opponentBoard.map((bc) => ({ ...bc, ownerId: gameState.opponentId })),
    ...gameState.hostSpellTrapZone.map((bc) => ({ ...bc, ownerId: gameState.hostId })),
    ...gameState.opponentSpellTrapZone.map((bc) => ({ ...bc, ownerId: gameState.opponentId })),
  ];

  // Batch fetch all card definitions
  const cardIds = allBoardCards.map((bc) => bc.cardId);
  const cards = await Promise.all(cardIds.map((id) => ctx.db.get(id)));
  const cardMap = new Map(
    cards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  // Build unsorted queue
  const queue: SegocQueueItem[] = [];
  const now = Date.now();

  for (const boardCard of allBoardCards) {
    const card = cardMap.get(boardCard.cardId);
    if (!card) continue;

    const triggeredEffectsWithIndices = getTriggeredEffectsWithIndices(card, trigger);
    const isTurnPlayer = boardCard.ownerId === turnPlayerId;

    for (const { effect, index } of triggeredEffectsWithIndices) {
      // Determine if effect is optional:
      // - Explicitly marked as optional
      // - NOT explicitly marked as mandatory defaults to mandatory for triggers
      const isOptional = effect.isOptional === true && effect.isMandatory !== true;

      // Calculate SEGOC order: 1-4 based on player + mandatory/optional
      let segocOrder: number;
      if (!isOptional && isTurnPlayer)
        segocOrder = 1; // Turn player's mandatory
      else if (!isOptional && !isTurnPlayer)
        segocOrder = 2; // Opponent's mandatory
      else if (isOptional && isTurnPlayer)
        segocOrder = 3; // Turn player's optional
      else segocOrder = 4; // Opponent's optional

      queue.push({
        cardId: boardCard.cardId,
        cardName: card.name || "Unknown",
        playerId: boardCard.ownerId,
        trigger,
        effectIndex: index,
        isOptional,
        isTurnPlayer,
        addedAt: now,
        segocOrder,
      });
    }
  }

  // Sort by SEGOC order, then by timestamp (addedAt)
  queue.sort((a, b) => {
    if (a.segocOrder !== b.segocOrder) return a.segocOrder - b.segocOrder;
    return a.addedAt - b.addedAt;
  });

  // Store sorted queue in game state
  await ctx.db.patch(gameState._id, {
    segocQueue: queue,
  });
}

/**
 * Process the next item in the SEGOC queue
 *
 * For mandatory effects: executes immediately
 * For optional effects: adds to pendingOptionalTriggers for player decision
 *
 * @returns Object with `processed` (whether an item was handled) and `remaining` (items left)
 */
export async function processNextSegocItem(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  gameState: Doc<"gameStates">,
  turnNumber: number
): Promise<{ processed: boolean; remaining: number }> {
  const queue = gameState.segocQueue || [];
  if (queue.length === 0) {
    return { processed: false, remaining: 0 };
  }

  const [nextItem, ...remaining] = queue;

  // Guard against undefined nextItem (should not happen if queue.length > 0, but TypeScript needs this)
  if (!nextItem) {
    await ctx.db.patch(gameState._id, { segocQueue: remaining });
    return { processed: false, remaining: remaining.length };
  }

  const lobby = await ctx.db.get(lobbyId);

  // Get card definition
  const card = await ctx.db.get(nextItem.cardId);
  if (!card) {
    // Card no longer exists, skip to next item
    await ctx.db.patch(gameState._id, { segocQueue: remaining });
    return { processed: false, remaining: remaining.length };
  }

  // Get card owner
  const owner = await ctx.db.get(nextItem.playerId);

  if (nextItem.isOptional) {
    // For optional effects, add to pending optional triggers
    // The player will choose whether to activate via UI
    const pending = gameState.pendingOptionalTriggers || [];

    // Check if already pending
    const alreadyPending = pending.some(
      (p) =>
        p.cardId === nextItem.cardId &&
        p.effectIndex === nextItem.effectIndex &&
        p.trigger === nextItem.trigger
    );

    if (!alreadyPending) {
      await ctx.db.patch(gameState._id, {
        pendingOptionalTriggers: [
          ...pending,
          {
            cardId: nextItem.cardId,
            cardName: nextItem.cardName,
            effectIndex: nextItem.effectIndex,
            trigger: nextItem.trigger,
            playerId: nextItem.playerId,
            addedAt: Date.now(),
          },
        ],
        segocQueue: remaining,
      });
    } else {
      // Already pending, just remove from queue
      await ctx.db.patch(gameState._id, { segocQueue: remaining });
    }
  } else {
    // For mandatory effects, execute immediately
    const triggeredEffects = getTriggeredEffects(card, nextItem.trigger as TriggerCondition);
    const effect = triggeredEffects[nextItem.effectIndex];

    if (effect) {
      const effectResult = await executeEffect(
        ctx,
        gameState,
        lobbyId,
        effect,
        nextItem.playerId,
        nextItem.cardId,
        []
      );

      if (effectResult.success) {
        await recordEventHelper(ctx, {
          lobbyId,
          gameId: lobby?.gameId || "",
          turnNumber,
          eventType: "effect_activated",
          playerId: nextItem.playerId,
          playerUsername: owner?.username || "Unknown",
          description: `${nextItem.cardName} ${nextItem.trigger} effect: ${effectResult.message}`,
          metadata: {
            cardId: nextItem.cardId,
            trigger: nextItem.trigger,
            effectType: effect.type,
            isMandatory: true,
            segocOrder: nextItem.segocOrder,
          },
        });
      }
    }

    // Update queue after execution
    await ctx.db.patch(gameState._id, { segocQueue: remaining });
  }

  return { processed: true, remaining: remaining.length };
}

/**
 * Clear the SEGOC queue
 *
 * Should be called when transitioning phases or when the chain resolves.
 */
export async function clearSegocQueue(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
): Promise<void> {
  await ctx.db.patch(gameState._id, {
    segocQueue: [],
  });
}

/**
 * Get the current SEGOC queue for display or debugging
 */
export function getSegocQueue(gameState: Doc<"gameStates">): SegocQueueItem[] {
  return gameState.segocQueue || [];
}

/**
 * Check if there are pending SEGOC items
 */
export function hasSegocItems(gameState: Doc<"gameStates">): boolean {
  const queue = gameState.segocQueue || [];
  return queue.length > 0;
}

// ============================================================================
// OPTIONAL TRIGGER RESPONSE MUTATION
// ============================================================================

/**
 * Respond to an optional trigger prompt
 *
 * Players use this mutation to either activate or skip an optional trigger.
 * - If activate=true: Execute the effect
 * - If activate=false: Add to skippedOptionalTriggers (won't prompt again this turn)
 */
export const respondToOptionalTrigger = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    effectIndex: v.number(),
    activate: v.boolean(), // true = activate, false = skip
    targets: v.optional(v.array(v.id("cardDefinitions"))), // Optional targets for the effect
  },
  handler: async (ctx, args) => {
    // Get current game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return { success: false, message: "Game not found" };
    }

    const pendingTriggers = gameState.pendingOptionalTriggers || [];

    // Find the pending trigger
    const triggerIndex = pendingTriggers.findIndex(
      (pt) => pt.cardId === args.cardId && pt.effectIndex === args.effectIndex
    );

    if (triggerIndex === -1) {
      return { success: false, message: "Pending trigger not found" };
    }

    const pendingTrigger = pendingTriggers[triggerIndex];
    if (!pendingTrigger) {
      return { success: false, message: "Pending trigger not found" };
    }

    // Verify the player can respond to this trigger
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: "Not authenticated" };
    }

    // Get the user from the auth subject
    const user = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(q.eq(q.field("email"), identity.email), q.eq(q.field("_id"), pendingTrigger.playerId))
      )
      .first();

    if (!user || user._id !== pendingTrigger.playerId) {
      return { success: false, message: "Not authorized to respond to this trigger" };
    }

    // Remove from pending triggers
    const updatedPending = [...pendingTriggers];
    updatedPending.splice(triggerIndex, 1);

    if (args.activate) {
      // Player chose to activate - execute the effect
      const card = await ctx.db.get(args.cardId);
      if (!card) {
        return { success: false, message: "Card not found" };
      }

      const ability = getCardAbility(card);
      if (!ability || !ability.effects[args.effectIndex]) {
        return { success: false, message: "Effect not found" };
      }

      const effect = ability.effects[args.effectIndex];
      if (!effect) {
        return { success: false, message: "Effect not found" };
      }

      // Update pending triggers before executing
      await ctx.db.patch(gameState._id, {
        pendingOptionalTriggers: updatedPending,
      });

      // Get fresh state
      const freshState = await ctx.db.get(gameState._id);
      if (!freshState) {
        return { success: false, message: "Game state not found" };
      }

      // Execute the effect
      const effectResult = await executeEffect(
        ctx,
        freshState,
        args.lobbyId,
        effect,
        pendingTrigger.playerId,
        args.cardId,
        args.targets || []
      );

      // Record the event
      const lobby = await ctx.db.get(args.lobbyId);
      if (lobby?.gameId) {
        await recordEventHelper(ctx, {
          lobbyId: args.lobbyId,
          gameId: lobby.gameId,
          turnNumber: gameState.turnNumber,
          eventType: "effect_activated",
          playerId: pendingTrigger.playerId,
          playerUsername: user.username || "Unknown",
          description: `${card.name} optional ${pendingTrigger.trigger} effect: ${effectResult.message}`,
          metadata: {
            cardId: args.cardId,
            trigger: pendingTrigger.trigger,
            effectType: effect.type,
            isOptional: true,
            playerChoseToActivate: true,
          },
        });
      }

      return {
        success: effectResult.success,
        message: effectResult.message,
        activated: true,
      };
    }
    // Player chose to skip - add to skipped triggers
    const skippedTriggers = gameState.skippedOptionalTriggers || [];

    await ctx.db.patch(gameState._id, {
      pendingOptionalTriggers: updatedPending,
      skippedOptionalTriggers: [
        ...skippedTriggers,
        {
          cardId: args.cardId,
          trigger: pendingTrigger.trigger,
          turnSkipped: gameState.turnNumber,
        },
      ],
    });

    // Record the skip event
    const lobby = await ctx.db.get(args.lobbyId);
    if (lobby?.gameId) {
      await recordEventHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId: lobby.gameId,
        turnNumber: gameState.turnNumber,
        eventType: "effect_activated",
        playerId: pendingTrigger.playerId,
        playerUsername: user.username || "Unknown",
        description: `${pendingTrigger.cardName} optional ${pendingTrigger.trigger} effect skipped`,
        metadata: {
          cardId: args.cardId,
          trigger: pendingTrigger.trigger,
          isOptional: true,
          playerChoseToActivate: false,
        },
      });
    }

    return {
      success: true,
      message: "Optional trigger skipped",
      activated: false,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clear skipped optional triggers at end of turn
 *
 * Call this during end phase to reset skipped triggers for the next turn.
 */
export async function clearSkippedOptionalTriggers(
  ctx: MutationCtx,
  gameStateId: Id<"gameStates">
): Promise<void> {
  await ctx.db.patch(gameStateId, {
    skippedOptionalTriggers: [],
  });
}

/**
 * Get all pending optional triggers for a player
 *
 * Useful for UI to display prompts for optional triggers.
 */
export function getPendingOptionalTriggersForPlayer(
  gameState: Doc<"gameStates">,
  playerId: Id<"users">
): Array<{
  cardId: Id<"cardDefinitions">;
  cardName: string;
  effectIndex: number;
  trigger: string;
  addedAt: number;
}> {
  const pending = gameState.pendingOptionalTriggers || [];
  return pending.filter((pt) => pt.playerId === playerId);
}
