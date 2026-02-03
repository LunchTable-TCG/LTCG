import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
// Workaround for TS2589 (excessively deep type instantiation)
// biome-ignore lint/style/noNamespaceImport: Required for Convex internal API type workaround
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internalAny = (generatedApi as any).internal;
import { ErrorCode, createError } from "./errorCodes";
import { LEVEL_MILESTONES, XP_PER_LEVEL } from "./storyConstants";

/**
 * Check if we're running in a test environment
 * convex-test doesn't fully support scheduler operations
 */
function isTestEnvironment(ctx: MutationCtx): boolean {
  // Check if scheduler has the test environment marker
  // In convex-test, scheduler operations cause "Write outside of transaction" errors
  try {
    // @ts-ignore - Check for test environment marker
    return ctx.scheduler?._isTest === true || process.env.NODE_ENV === "test";
  } catch {
    return false;
  }
}

/**
 * Safe scheduler wrapper for test environments
 * Prevents "Write outside of transaction" errors in convex-test
 */
async function safeSchedule(ctx: MutationCtx, fn: () => Promise<unknown>): Promise<void> {
  // Skip scheduling in test environments to prevent errors
  if (isTestEnvironment(ctx)) {
    return;
  }
  await fn();
}

/**
 * Calculate player level based on total XP using binary search
 *
 * Uses binary search for O(log n) performance on the XP_PER_LEVEL lookup table.
 * Handles edge cases for negative XP (returns level 1) and max level (returns max).
 *
 * @param xp - Total XP earned by the player
 * @returns Player level (1-indexed, minimum 1)
 */
export function calculateLevel(xp: number) {
  if (xp < 0) return 1;
  const maxLevelXP = XP_PER_LEVEL[XP_PER_LEVEL.length - 1];
  if (maxLevelXP !== undefined && xp >= maxLevelXP) {
    return XP_PER_LEVEL.length;
  }

  // Binary search to find the highest level where XP_PER_LEVEL[level] <= xp
  let left = 0;
  let right = XP_PER_LEVEL.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2);
    const midXP = XP_PER_LEVEL[mid];
    if (midXP !== undefined && midXP <= xp) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }

  return left + 1; // Level is 1-indexed
}

/**
 * Calculate XP required for next level
 *
 * Returns the total XP threshold needed to reach the next level.
 * Returns 0 if player is at max level.
 *
 * @param currentLevel - Player's current level (1-indexed)
 * @returns Total XP required for next level, or 0 if max level reached
 */
export function getXPForNextLevel(currentLevel: number) {
  if (currentLevel >= XP_PER_LEVEL.length) {
    return 0; // Max level reached
  }
  const nextLevelXP = XP_PER_LEVEL[currentLevel];
  return nextLevelXP ?? 0;
}

/**
 * Calculate XP progress within current level (0-1)
 *
 * Returns a normalized progress value for progress bars and UI display.
 * Calculates how much XP has been earned within the current level range.
 *
 * @param currentXP - Player's current total XP
 * @param currentLevel - Player's current level (1-indexed)
 * @returns Progress value from 0.0 (just leveled up) to 1.0 (about to level up)
 */
export function getLevelProgress(currentXP: number, currentLevel: number) {
  if (currentLevel >= XP_PER_LEVEL.length) {
    return 1; // Max level
  }

  const levelStartXP = XP_PER_LEVEL[currentLevel - 1] ?? 0;
  const levelEndXP = XP_PER_LEVEL[currentLevel] ?? XP_PER_LEVEL[XP_PER_LEVEL.length - 1] ?? 0;
  const xpInLevel = currentXP - levelStartXP;
  const xpForLevel = levelEndXP - levelStartXP;

  // Avoid division by zero
  if (xpForLevel === 0) return 1;

  return Math.min(1, Math.max(0, xpInLevel / xpForLevel));
}

/**
 * Get or create player XP record
 *
 * Helper to ensure every player has an XP record before awarding XP.
 * Creates a new record with level 1 and 0 XP if none exists.
 *
 * @internal
 * @param ctx - Mutation context
 * @param userId - User ID to get or create XP record for
 * @returns Player XP document
 * @throws If XP record creation fails
 */
export async function getOrCreatePlayerXP(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"playerXP">> {
  const existing = await ctx.db
    .query("playerXP")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    return existing;
  }

  // Create new XP record (level 1, 0 XP)
  const xpId = await ctx.db.insert("playerXP", {
    userId,
    currentXP: 0,
    currentLevel: 1,
    lifetimeXP: 0,
    lastUpdatedAt: Date.now(),
  });

  const newRecord = await ctx.db.get(xpId);
  if (!newRecord) {
    throw createError(ErrorCode.LIBRARY_XP_CREATION_FAILED, { userId });
  }

  return newRecord;
}

/**
 * Get player XP record (read-only, for queries)
 *
 * Query-safe version that doesn't create records. Returns null if player has no XP record yet.
 * Use this in query handlers where mutations are not allowed.
 *
 * @internal
 * @param ctx - Query context (read-only)
 * @param userId - User ID to get XP record for
 * @returns Player XP document or null if not found
 */
export async function getPlayerXP(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Doc<"playerXP"> | null> {
  return await ctx.db
    .query("playerXP")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/**
 * Add XP to player and handle level ups
 *
 * Core XP system function that awards XP, calculates level progression,
 * awards milestone badges, and creates notifications for level ups and badge unlocks.
 * Handles multiple level gains in a single call.
 *
 * Also grants battle pass XP if an active battle pass exists.
 *
 * @internal
 * @param ctx - Mutation context
 * @param userId - User ID to award XP to
 * @param xpAmount - Amount of XP to add (must be non-negative)
 * @param options - Optional configuration
 * @param options.source - Source of XP for battle pass tracking (default: "general")
 * @param options.skipBattlePass - If true, skip granting battle pass XP
 * @returns Level up result with old level, new level, XP added, and badges awarded
 * @throws If xpAmount is negative
 */
export async function addXP(
  ctx: MutationCtx,
  userId: Id<"users">,
  xpAmount: number,
  options?: {
    source?: string;
    skipBattlePass?: boolean;
  }
): Promise<{
  newLevel: number;
  oldLevel: number;
  xpAdded: number;
  totalXP: number;
  leveledUp: boolean;
  levelsGained: number;
  badgesAwarded: Array<{
    badgeId: string;
    displayName: string;
    description: string;
  }>;
  battlePass?: {
    tiersGained: number;
    newTier: number;
  };
}> {
  if (xpAmount < 0) {
    throw createError(ErrorCode.LIBRARY_INVALID_XP, { xpAmount });
  }

  const xpRecord = await getOrCreatePlayerXP(ctx, userId);
  const oldLevel = xpRecord.currentLevel;
  const oldXP = xpRecord.currentXP;
  const newXP = oldXP + xpAmount;
  const newLevel = calculateLevel(newXP);

  // Update XP record
  await ctx.db.patch(xpRecord._id, {
    currentXP: newXP,
    currentLevel: newLevel,
    lifetimeXP: xpRecord.lifetimeXP + xpAmount,
    lastUpdatedAt: Date.now(),
  });

  const leveledUp = newLevel > oldLevel;
  const levelsGained = newLevel - oldLevel;
  const badgesAwarded: Array<{
    badgeId: string;
    displayName: string;
    description: string;
  }> = [];

  // Award milestone badges for each level reached
  if (leveledUp) {
    // Create level up notification (wrapped to prevent test errors)
    await safeSchedule(ctx, async () => {
      await ctx.scheduler.runAfter(
        0,
        internalAny.progression.notifications.createLevelUpNotification,
        {
          userId,
          newLevel,
          oldLevel,
        }
      );
    });

    for (const milestone of LEVEL_MILESTONES) {
      if (newLevel >= milestone.level && oldLevel < milestone.level) {
        // Check if badge already exists
        const existingBadge = await ctx.db
          .query("playerBadges")
          .withIndex("by_badge", (q) => q.eq("badgeId", milestone.badgeId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        if (!existingBadge) {
          await ctx.db.insert("playerBadges", {
            userId,
            badgeType: "milestone",
            badgeId: milestone.badgeId,
            displayName: milestone.displayName,
            description: milestone.description,
            earnedAt: Date.now(),
          });

          badgesAwarded.push({
            badgeId: milestone.badgeId,
            displayName: milestone.displayName,
            description: milestone.description,
          });

          // Create badge notification (wrapped to prevent test errors)
          await safeSchedule(ctx, async () => {
            await ctx.scheduler.runAfter(
              0,
              internalAny.progression.notifications.createBadgeNotification,
              {
                userId,
                badgeName: milestone.displayName,
                badgeDescription: milestone.description,
              }
            );
          });
        }
      }
    }
  }

  // Grant battle pass XP if not skipped
  let battlePassResult: { tiersGained: number; newTier: number } | undefined;
  if (!options?.skipBattlePass && xpAmount > 0) {
    // Schedule battle pass XP grant (wrapped to prevent test errors)
    await safeSchedule(ctx, async () => {
      await ctx.scheduler.runAfter(
        0,
        internalAny.progression.battlePass.addBattlePassXP,
        {
          userId,
          xpAmount,
          source: options?.source ?? "general",
        }
      );
    });
  }

  return {
    newLevel,
    oldLevel,
    xpAdded: xpAmount,
    totalXP: newXP,
    leveledUp,
    levelsGained,
    badgesAwarded,
    battlePass: battlePassResult,
  };
}

/**
 * Check if player has reached a specific level
 *
 * Used for gating content behind level requirements (e.g., story chapters, features).
 * Safe for both queries and mutations.
 *
 * @internal
 * @param ctx - Query or mutation context
 * @param userId - User ID to check level for
 * @param requiredLevel - Minimum level required
 * @returns True if player has reached the required level, false otherwise
 */
export async function hasReachedLevel(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  requiredLevel: number
): Promise<boolean> {
  const xpRecord = await ctx.db
    .query("playerXP")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  return xpRecord ? xpRecord.currentLevel >= requiredLevel : false;
}
