/**
 * Tests for lib/xpHelpers.ts - XP and Level System
 *
 * Tests XP calculation, level progression, and badge awarding
 */

// @ts-nocheck - convex-test callback typing limitation
import { describe, it, expect } from "vitest";
import { createTestInstance } from "../test.setup";
import { calculateLevel, getXPForNextLevel, getLevelProgress } from "./xpHelpers";
import { XP_PER_LEVEL } from "./storyConstants";


describe("calculateLevel", () => {
  it("should return level 1 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("should return level 2 for 100 XP", () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it("should return level 3 for 250 XP", () => {
    expect(calculateLevel(250)).toBe(3);
  });

  it("should return level 10 for 2700 XP", () => {
    expect(calculateLevel(2700)).toBe(10);
  });

  it("should handle edge case just below level threshold", () => {
    expect(calculateLevel(99)).toBe(1); // Just below level 2
    expect(calculateLevel(249)).toBe(2); // Just below level 3
  });

  it("should handle max level (100)", () => {
    expect(calculateLevel(252450)).toBe(100);
    expect(calculateLevel(999999)).toBe(100); // Way over max
  });

  it("should handle negative XP", () => {
    expect(calculateLevel(-100)).toBe(1);
  });

  it("should match XP_PER_LEVEL array correctly", () => {
    // Test all thresholds
    for (let i = 0; i < XP_PER_LEVEL.length - 1; i++) {
      const xp = XP_PER_LEVEL[i];
      const nextXp = XP_PER_LEVEL[i + 1];

      expect(calculateLevel(xp)).toBe(i + 1);
      expect(calculateLevel(nextXp - 1)).toBe(i + 1);
    }
  });
});

describe("getXPForNextLevel", () => {
  it("should return 100 for level 1", () => {
    expect(getXPForNextLevel(1)).toBe(100);
  });

  it("should return 250 for level 2", () => {
    expect(getXPForNextLevel(2)).toBe(250);
  });

  it("should return 0 for max level", () => {
    expect(getXPForNextLevel(100)).toBe(0);
  });

  it("should return 0 for levels beyond max", () => {
    expect(getXPForNextLevel(150)).toBe(0);
  });
});

describe("getLevelProgress", () => {
  it("should return 0 at start of level", () => {
    expect(getLevelProgress(0, 1)).toBe(0); // Level 1, 0 XP
    expect(getLevelProgress(100, 2)).toBe(0); // Level 2, 100 XP
  });

  it("should return 0.5 at halfway through level", () => {
    // Level 1: 0-100 (50 XP = 50%)
    expect(getLevelProgress(50, 1)).toBeCloseTo(0.5, 2);

    // Level 2: 100-250 (175 XP = 50% of 150 XP range)
    expect(getLevelProgress(175, 2)).toBeCloseTo(0.5, 2);
  });

  it("should return close to 1.0 near end of level", () => {
    expect(getLevelProgress(99, 1)).toBeCloseTo(0.99, 2);
    expect(getLevelProgress(249, 2)).toBeCloseTo(0.993, 2);
  });

  it("should return 1.0 for max level", () => {
    expect(getLevelProgress(999999, 100)).toBe(1);
  });

  it("should clamp values between 0 and 1", () => {
    const progress = getLevelProgress(50, 1);
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });
});

describe("addXP", () => {
  it("should add XP and update level", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "xptest",
        email: "xp@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    // Add XP via internal mutation (we'll test through story.ts which uses addXP)
    await t.run(async (ctx) => {
      const { addXP } = await import("./xpHelpers");
      const result = await addXP(ctx, userId, 150);

      expect(result.newLevel).toBe(2); // 150 XP = level 2
      expect(result.oldLevel).toBe(1);
      expect(result.xpAdded).toBe(150);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
    });

    const xpRecord = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(xpRecord.currentXP).toBe(150);
    expect(xpRecord.currentLevel).toBe(2);
    expect(xpRecord.lifetimeXP).toBe(150);
  });

  it("should award milestone badge at level 10", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "milestone",
        email: "milestone@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 2600, // Just below level 10
        currentLevel: 9,
        lifetimeXP: 2600,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const { addXP } = await import("./xpHelpers");
      const result = await addXP(ctx, userId, 200); // Push to level 10

      expect(result.newLevel).toBe(10);
      expect(result.badgesAwarded.length).toBeGreaterThan(0);
      expect(result.badgesAwarded[0].badgeId).toBe("milestone_novice");
    });

    const badge = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerBadges")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(badge).toBeDefined();
    expect(badge.badgeType).toBe("milestone");
    expect(badge.displayName).toBe("Novice");
  });

  it("should not duplicate milestone badges", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "nodupe",
        email: "nodupe@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 2600,
        currentLevel: 9,
        lifetimeXP: 2600,
        lastUpdatedAt: Date.now(),
      });
    });

    // Award level 10 twice
    await t.run(async (ctx) => {
      const { addXP } = await import("./xpHelpers");
      await addXP(ctx, userId, 200);
      await addXP(ctx, userId, 100);
    });

    const badges = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerBadges")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    });

    // Should only have one milestone_novice badge
    const noviceBadges = badges.filter((b) => b.badgeId === "milestone_novice");
    expect(noviceBadges.length).toBe(1);
  });

  it("should handle multiple level ups in one XP gain", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "bigxp",
        email: "bigxp@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const { addXP } = await import("./xpHelpers");
      const result = await addXP(ctx, userId, 1000); // Jump to level 6

      expect(result.newLevel).toBe(6);
      expect(result.levelsGained).toBe(5);
      expect(result.leveledUp).toBe(true);
    });

    const xpRecord = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(xpRecord.currentLevel).toBe(6);
  });

  it("should reject negative XP", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "negative",
        email: "negative@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 500,
        currentLevel: 4,
        lifetimeXP: 500,
        lastUpdatedAt: Date.now(),
      });
    });

    await expect(
      t.run(async (ctx) => {
        const { addXP } = await import("./xpHelpers");
        await addXP(ctx, userId, -100); // Negative XP
      })
    ).rejects.toThrowError("Cannot add negative XP");
  });

  it("should track lifetime XP correctly", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "lifetime",
        email: "lifetime@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 500,
        currentLevel: 4,
        lifetimeXP: 500,
        lastUpdatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      const { addXP } = await import("./xpHelpers");
      await addXP(ctx, userId, 200);
      await addXP(ctx, userId, 300);
    });

    const xpRecord = await t.run(async (ctx) => {
      return await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    });

    expect(xpRecord.lifetimeXP).toBe(1000); // 500 + 200 + 300
  });
});

describe("hasReachedLevel", () => {
  it("should return true when level reached", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "leveled",
        email: "leveled@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 1000,
        currentLevel: 5,
        lifetimeXP: 1000,
        lastUpdatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { hasReachedLevel } = await import("./xpHelpers");
      return await hasReachedLevel(ctx, userId, 5);
    });

    expect(result).toBe(true);
  });

  it("should return false when level not reached", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "notyet",
        email: "notyet@test.com",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 100,
        currentLevel: 2,
        lifetimeXP: 100,
        lastUpdatedAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { hasReachedLevel } = await import("./xpHelpers");
      return await hasReachedLevel(ctx, userId, 10);
    });

    expect(result).toBe(false);
  });

  it("should return false when XP record doesn't exist", async () => {
    const t = createTestInstance();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        username: "newplayer",
        email: "new@test.com",
        createdAt: Date.now(),
      });
    });

    const result = await t.run(async (ctx) => {
      const { hasReachedLevel } = await import("./xpHelpers");
      return await hasReachedLevel(ctx, userId, 1);
    });

    expect(result).toBe(false);
  });
});
