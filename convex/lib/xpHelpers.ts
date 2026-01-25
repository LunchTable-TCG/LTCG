// XP and Level System Helpers
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { XP_PER_LEVEL, LEVEL_MILESTONES } from "./storyConstants";

/**
 * Calculate player level based on total XP using binary search
 */
export function calculateLevel(xp: number): number {
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
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= XP_PER_LEVEL.length) {
    return 0; // Max level reached
  }
  const nextLevelXP = XP_PER_LEVEL[currentLevel];
  return nextLevelXP ?? 0;
}

/**
 * Calculate XP progress within current level (0-1)
 */
export function getLevelProgress(currentXP: number, currentLevel: number): number {
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
    throw new Error("Failed to create player XP record");
  }

  return newRecord;
}

/**
 * Get player XP record (read-only, for queries)
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
 * Returns: { newLevel, oldLevel, xpAdded, leveledUp, badgesAwarded }
 */
export async function addXP(
  ctx: MutationCtx,
  userId: Id<"users">,
  xpAmount: number
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
}> {
  if (xpAmount < 0) {
    throw new Error("Cannot add negative XP");
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
        }
      }
    }
  }

  return {
    newLevel,
    oldLevel,
    xpAdded: xpAmount,
    totalXP: newXP,
    leveledUp,
    levelsGained,
    badgesAwarded,
  };
}

/**
 * Check if player has reached a specific level
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
