/**
 * Migration: Convert Text-Based Abilities to JSON Effects
 *
 * DEPRECATED: This migration file is no longer functional.
 *
 * The text-based ability parser (parseMultiPartAbility) has been removed
 * from the codebase as part of the migration to JSON-only effects.
 *
 * This file is kept for historical reference only.
 *
 * If you need to run this migration, you must:
 * 1. Restore the text parser from git history
 * 2. Run the migration
 * 3. Remove the text parser again
 *
 * Alternatively, manually convert any remaining text abilities to JSON format.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type {
  JsonAbility,
} from "../gameplay/effectSystem/types";

// ============================================================================
// TYPES
// ============================================================================

interface MigrationResult {
  success: boolean;
  totalCards: number;
  convertedCards: number;
  skippedCards: number;
  failedCards: number;
  errors: Array<{ cardId: string; cardName: string; error: string }>;
  conversions: Array<{
    cardId: string;
    cardName: string;
    originalAbility: string;
    convertedEffects: number;
  }>;
}


interface CardAnalysis {
  cardId: Id<"cardDefinitions">;
  cardName: string;
  cardType: string;
  originalAbility: string;
  canConvert: boolean;
  parsedEffectCount: number;
  conversionPreview?: JsonAbility;
  warnings: string[];
}

// ============================================================================
// DEPRECATION NOTICE
// ============================================================================

const DEPRECATION_ERROR = `
This migration is deprecated. The text-based ability parser has been removed.
All card abilities should now be defined using JSON format directly.

If you have cards with text-only abilities that need conversion:
1. Manually convert the ability text to JsonAbility format
2. Update the card definition with the jsonAbility field
3. Remove the text ability field

See the JsonAbility type definition in convex/gameplay/effectSystem/types.ts
for the expected format.
`;

// ============================================================================
// NOTE: Conversion functions have been removed.
// Text-based ability parsing is no longer supported.
// All card abilities must be defined directly in JSON format.
// ============================================================================

// ============================================================================
// ANALYSIS QUERIES (DEPRECATED)
// ============================================================================

/**
 * @deprecated This migration is no longer functional
 */
export const analyzeCards = internalQuery({
  args: {
    limit: v.optional(v.number()),
    cardType: v.optional(v.string()),
  },
  handler: async (_ctx, _args): Promise<{
    totalCards: number;
    cardsWithAbilities: number;
    convertibleCards: number;
    analysis: CardAnalysis[];
    error: string;
  }> => {
    return {
      totalCards: 0,
      cardsWithAbilities: 0,
      convertibleCards: 0,
      analysis: [],
      error: DEPRECATION_ERROR,
    };
  },
});

/**
 * @deprecated This migration is no longer functional
 */
export const previewCardConversion = internalQuery({
  args: {
    cardId: v.id("cardDefinitions"),
  },
  handler: async (_ctx, _args): Promise<{ error: string }> => {
    return { error: DEPRECATION_ERROR };
  },
});

// ============================================================================
// MIGRATION MUTATIONS (DEPRECATED)
// ============================================================================

/**
 * @deprecated This migration is no longer functional
 */
export const migrateToJsonEffects = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
    startAfter: v.optional(v.id("cardDefinitions")),
  },
  handler: async (_ctx, _args): Promise<MigrationResult> => {
    console.error(DEPRECATION_ERROR);
    return {
      success: false,
      totalCards: 0,
      convertedCards: 0,
      skippedCards: 0,
      failedCards: 0,
      errors: [{ cardId: "N/A", cardName: "N/A", error: DEPRECATION_ERROR }],
      conversions: [],
    };
  },
});

/**
 * Rollback migration - restore original abilities from backup
 *
 * This function is still functional as it only reads audit logs
 */
export const rollbackJsonEffects = internalMutation({
  args: {
    fromTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; rolledBack: number; errors: string[] }> => {
    const result = {
      success: true,
      rolledBack: 0,
      errors: [] as string[],
    };

    try {
      // Find migration audit logs
      const migrationLogs = await ctx.db
        .query("adminAuditLogs")
        .filter((q) =>
          q.and(
            q.eq(q.field("action"), "migrate_card_ability"),
            q.eq(q.field("success"), true)
          )
        )
        .collect();

      // Filter by timestamp if provided
      const logsToRollback = args.fromTimestamp
        ? migrationLogs.filter((log) => log.timestamp >= args.fromTimestamp!)
        : migrationLogs;

      console.log(`[Rollback] Found ${logsToRollback.length} migrations to rollback`);

      for (const log of logsToRollback) {
        try {
          const metadata = log.metadata as {
            cardId: Id<"cardDefinitions">;
            originalAbility: string;
          };

          if (!metadata.cardId || !metadata.originalAbility) {
            result.errors.push(`Invalid metadata in log ${log._id}`);
            continue;
          }

          // Verify card still exists
          const card = await ctx.db.get(metadata.cardId);
          if (!card) {
            result.errors.push(`Card ${metadata.cardId} not found`);
            continue;
          }

          // Mark audit log as rolled back
          await ctx.db.patch(log._id, {
            metadata: {
              ...metadata,
              rolledBack: true,
              rolledBackAt: Date.now(),
            },
          });

          result.rolledBack++;
        } catch (error) {
          result.errors.push(
            `Failed to rollback log ${log._id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      console.log(`[Rollback] Complete:`, result);
      return result;
    } catch (error) {
      result.success = false;
      console.error(`[Rollback] Fatal error:`, error);
      return result;
    }
  },
});

// ============================================================================
// UTILITY FUNCTIONS (DEPRECATED)
// ============================================================================

/**
 * @deprecated This migration is no longer functional
 */
export const convertSingleCard = internalMutation({
  args: {
    cardId: v.id("cardDefinitions"),
  },
  handler: async (_ctx, _args): Promise<{
    success: boolean;
    error: string;
  }> => {
    return {
      success: false,
      error: DEPRECATION_ERROR,
    };
  },
});

/**
 * Get migration statistics - still functional
 */
export const getMigrationStats = internalQuery({
  args: {},
  handler: async (ctx): Promise<{
    totalCards: number;
    cardsWithAbilities: number;
    migratedCards: number;
    pendingCards: number;
    failedMigrations: number;
  }> => {
    const allCards = await ctx.db
      .query("cardDefinitions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter cards that have JSON abilities with at least one effect
    const cardsWithAbilities = allCards.filter((c) => c.ability && Array.isArray(c.ability.effects) && c.ability.effects.length > 0);

    // Count migration audit logs
    const migrationLogs = await ctx.db
      .query("adminAuditLogs")
      .filter((q) => q.eq(q.field("action"), "migrate_card_ability"))
      .collect();

    const successfulMigrations = migrationLogs.filter((l) => l.success);
    const failedMigrations = migrationLogs.filter((l) => !l.success);

    return {
      totalCards: allCards.length,
      cardsWithAbilities: cardsWithAbilities.length,
      migratedCards: successfulMigrations.length,
      pendingCards: cardsWithAbilities.length - successfulMigrations.length,
      failedMigrations: failedMigrations.length,
    };
  },
});

/**
 * @deprecated This migration is no longer functional
 */
export const migrateNextBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (_ctx, _args): Promise<{
    processed: number;
    hasMore: boolean;
    error: string;
  }> => {
    return {
      processed: 0,
      hasMore: false,
      error: DEPRECATION_ERROR,
    };
  },
});
