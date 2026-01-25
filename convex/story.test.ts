/**
 * Tests for story.ts - Story Mode System
 *
 * Tests comprehensive story mode functionality including:
 * - Story progress initialization
 * - Chapter start/completion
 * - XP and leveling system
 * - Badge system
 * - Retry limits (hard/legendary)
 * - Difficulty unlocking
 * - Chapter progression
 * - Integration with economy system
 * - Card rewards
 * - Completion badges
 */

// @ts-nocheck - convex-test callback typing limitation
import { describe, it, expect } from "vitest";
import { createTestInstance } from "./test.setup";
import { api, internal } from "./_generated/api";
import type { TestHelper, TestMutationCtx, TestQueryCtx } from "./test.utils";
import { seedStoryCards } from "./test.utils";

// Helper to create test user with session
async function createTestUser(t: TestHelper, username = "testplayer") {
  const userId = await t.run(async (ctx: TestMutationCtx) => {
    return await ctx.db.insert("users", {
      username,
      email: `${username}@example.com`,
      
      
    });
  });

  const token = await t.run(async (ctx: TestMutationCtx) => {
    await ctx.db.insert("sessions", {
      userId,
      token: `${username}-token`,
      expiresAt: Date.now() + 3600000,
      
    });
    return `${username}-token`;
  });

  // Initialize currency
  await t.run(async (ctx: TestMutationCtx) => {
    await ctx.db.insert("playerCurrency", {
      userId,
      gold: 1000,
      gems: 100,
      lifetimeGoldEarned: 1000,
      lifetimeGoldSpent: 0,
      lifetimeGemsEarned: 100,
      lifetimeGemsSpent: 0,
      lastUpdatedAt: Date.now(),
    });
  });

  // Seed one story chapter for testing
  await t.run(async (ctx: TestMutationCtx) => {
    await ctx.db.insert("storyChapters", {
      actNumber: 1,
      chapterNumber: 1,
      title: "Test Chapter",
      description: "Test description",
      archetype: "infernal_dragons",
      archetypeImageUrl: "/test.png",
      storyText: "Test story",
      loreText: "Test lore",
      aiOpponentDeckCode: "INFERNAL_DRAGONS",
      aiDifficulty: { normal: 3, hard: 6, legendary: 9 },
      battleCount: 1,
      baseRewards: { gold: 100, xp: 150 },
      isActive: true,
      createdAt: Date.now(),
    });
  });

  return { userId, token };
}

describe("initializeStoryProgress", () => {
  it("should create XP record and first chapter progress", async () => {
    const t = createTestInstance();
    const { userId } = await createTestUser(t);

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const xpRecord = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(xpRecord!).toMatchObject({
      currentXP: 0,
      currentLevel: 1,
      lifetimeXP: 0,
    });

    const progress = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("storyProgress")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();
    });

    // Should create 3 progress records (one for each difficulty)
    expect(progress.length).toBe(3);
    expect(progress.filter((p: any) => p.difficulty === "normal")[0].status).toBe("available");
    expect(progress.filter((p: any) => p.difficulty === "hard")[0].status).toBe("locked");
    expect(progress.filter((p: any) => p.difficulty === "legendary")[0].status).toBe("locked");
  });

  it("should not duplicate XP record if called twice", async () => {
    const t = createTestInstance();
    const { userId } = await createTestUser(t);

    await t.mutation(internal.story.initializeStoryProgress, { userId });
    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const xpRecords = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();
    });

    expect(xpRecords.length).toBe(1);
  });
});

describe("startChapter", () => {
  it("should start chapter and create battle attempt", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const result = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    expect(result!).toHaveProperty("attemptId");
    expect(result.chapterInfo).toMatchObject({
      title: "Test Chapter",
      aiOpponentDeckCode: "INFERNAL_DRAGONS",
      aiDifficulty: 3,
    });

    const attempt = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.get(result.attemptId);
    });

    expect(attempt!).toMatchObject({
      userId,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
      outcome: "won",
      starsEarned: 0,
    });
  });

  it("should reject locked chapters", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    await expect(
      t.mutation(api.story.startChapter, {
        token,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "hard", // Locked by default
      })
    ).rejects.toThrowError("This chapter is locked");
  });

  it("should enforce hard mode retry limit (3 per day)", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Unlock hard mode by setting level 5
    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentLevel: 5, currentXP: 1000 });

      const hardProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "hard"))
        .first();
      await ctx.db.patch(hardProgress._id, { status: "available" });
    });

    // Create 3 attempts today
    const today = new Date().setHours(0, 0, 0, 0);
    await t.run(async (ctx: TestMutationCtx) => {
      const progress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "hard"))
        .first();

      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("storyBattleAttempts", {
          userId,
          progressId: progress._id,
          actNumber: 1,
          chapterNumber: 1,
          difficulty: "hard",
          outcome: "lost",
          starsEarned: 0,
          finalLP: 0,
          rewardsEarned: { gold: 0, xp: 0 },
          attemptedAt: today + (i * 1000),
        });
      }
    });

    // 4th attempt should fail
    await expect(
      t.mutation(api.story.startChapter, {
        token,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "hard",
      })
    ).rejects.toThrowError("Daily retry limit reached for Hard mode");
  });

  it("should enforce legendary mode retry limit (1 per week)", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Unlock legendary mode
    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentLevel: 15, currentXP: 6000 });

      const legProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "legendary"))
        .first();
      await ctx.db.patch(legProgress._id, { status: "available" });
    });

    // Create 1 attempt this week
    await t.run(async (ctx: TestMutationCtx) => {
      const progress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "legendary"))
        .first();

      await ctx.db.insert("storyBattleAttempts", {
        userId,
        progressId: progress._id,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "legendary",
        outcome: "lost",
        starsEarned: 0,
        finalLP: 0,
        rewardsEarned: { gold: 0, xp: 0 },
        attemptedAt: Date.now() - 60000, // 1 minute ago
      });
    });

    // 2nd attempt should fail
    await expect(
      t.mutation(api.story.startChapter, {
        token,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "legendary",
      })
    ).rejects.toThrowError("Weekly retry limit reached for Legendary mode");
  });

  it("should require level 5 for hard difficulty", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Unlock hard chapter but keep level 1
    await t.run(async (ctx: TestMutationCtx) => {
      const hardProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "hard"))
        .first();
      await ctx.db.patch(hardProgress._id, { status: "available" });
    });

    await expect(
      t.mutation(api.story.startChapter, {
        token,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "hard",
      })
    ).rejects.toThrowError("Level 5 required for hard difficulty");
  });

  it("should require level 15 for legendary difficulty", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentLevel: 10, currentXP: 3000 });

      const legProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "legendary"))
        .first();
      await ctx.db.patch(legProgress._id, { status: "available" });
    });

    await expect(
      t.mutation(api.story.startChapter, {
        token,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "legendary",
      })
    ).rejects.toThrowError("Level 15 required for legendary difficulty");
  });
});

describe("completeChapter", () => {
  it("should award correct rewards and stars (1 star - just completed)", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);
    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 40, // Less than 50, so 1 star
    });

    expect(result.success).toBe(true);
    expect(result.starsEarned).toBe(1);
    expect(result.rewards.gold).toBe(110); // 100 base * 1.0 difficulty * 1.1 star bonus
    expect(result.rewards.xp).toBe(180); // 150 base * 1.0 difficulty * 1.2 star bonus

    // Verify currency was awarded
    const balance = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(balance.gold).toBe(1110); // 1000 + 110
  });

  it("should award 2 stars for 50%+ LP remaining", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 60, // 60% remaining = 2 stars
    });

    expect(result.starsEarned).toBe(2);
    expect(result.rewards.gold).toBe(120); // 100 * 1.0 * 1.2 (2 stars = 20% bonus)
    expect(result.rewards.xp).toBe(210); // 150 * 1.0 * 1.4 (2 stars = 40% bonus)
  });

  it("should award 3 stars for perfect game (100 LP)", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100, // Perfect = 3 stars
    });

    expect(result.starsEarned).toBe(3);
    expect(result.rewards.gold).toBe(130); // 100 * 1.0 * 1.3 (3 stars = 30% bonus)
    expect(result.rewards.xp).toBe(240); // 150 * 1.0 * 1.6 (3 stars = 60% bonus)
  });

  it("should apply 2x multiplier for hard difficulty", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Unlock and start hard mode
    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentLevel: 5, currentXP: 1000 });

      const hardProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "hard"))
        .first();
      await ctx.db.patch(hardProgress._id, { status: "available" });
    });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "hard",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 50, // 50 LP = 2 stars
    });

    expect(result.starsEarned).toBe(2);
    expect(result.rewards.gold).toBe(240); // 100 * 2.0 * 1.2 (2 stars = 20% bonus)
    expect(result.rewards.xp).toBe(420); // 150 * 2.0 * 1.4 (2 stars = 40% bonus)
  });

  it("should apply 3x multiplier for legendary difficulty", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentLevel: 15, currentXP: 6000 });

      const legProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "legendary"))
        .first();
      await ctx.db.patch(legProgress._id, { status: "available" });
    });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "legendary",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100, // Perfect on legendary
    });

    expect(result.rewards.gold).toBe(390); // 100 * 3.0 * 1.3
    expect(result.rewards.xp).toBe(720); // 150 * 3.0 * 1.6
  });

  it("should award perfect chapter badge for 3 stars", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100,
    });

    expect(result.newBadges.length).toBeGreaterThan(0);
    expect(result.newBadges[0].displayName).toContain("Flawless");

    const badges = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerBadges")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();
    });

    expect(badges.some((b: any) => b.badgeType === "perfect_chapter")).toBe(true);
  });

  it("should handle loss correctly (no rewards)", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: false,
      finalLP: 0,
    });

    expect(result.success).toBe(false);
    expect(result.starsEarned).toBe(0);
    expect(result.rewards.gold).toBe(0);
    expect(result.rewards.xp).toBe(0);

    // Verify no currency was awarded
    const balance = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(balance.gold).toBe(1000); // Unchanged
  });

  it("should trigger level up when XP threshold reached", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Set XP to 90 (needs 100 for level 2)
    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentXP: 90 });
    });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 50, // Awards 180 XP
    });

    expect(result.levelUp).toBeDefined();
    expect(result.levelUp?.newLevel).toBeGreaterThan(1);

    const xp = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
    });

    expect(xp.currentLevel).toBeGreaterThan(1);
  });

  it("should update best score when beaten", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // First attempt - 60 LP
    const attempt1 = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    await t.mutation(api.story.completeChapter, {
      token,
      attemptId: attempt1.attemptId,
      won: true,
      finalLP: 60,
    });

    // Second attempt - 80 LP (better)
    const attempt2 = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    await t.mutation(api.story.completeChapter, {
      token,
      attemptId: attempt2.attemptId,
      won: true,
      finalLP: 80,
    });

    const progress = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "normal"))
        .first();
    });

    expect(progress.bestScore).toBe(80);
    expect(progress.starsEarned).toBe(2); // Updated to 2 stars
  });
});

describe("XP and leveling integration", () => {
  it("should award level 10 milestone badge", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Set XP to almost level 10 (2650 XP)
    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentXP: 2650, currentLevel: 9 });
    });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100, // Awards 240 XP -> reaches level 10
    });

    expect(result.levelUp?.newLevel).toBe(10);
    expect(result.newBadges.some((b: any) => b.badgeId === "milestone_novice")).toBe(true);
  });
});

describe("getPlayerProgress", () => {
  it("should return all chapter progress grouped by act", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const progress = await t.query(api.story.getPlayerProgress, { token });

    expect(progress.progressByAct[1]).toBeDefined();
    expect(progress.progressByAct[1].length).toBe(3); // 3 difficulties
    expect(progress.totalChaptersCompleted).toBe(0);
    expect(progress.totalStarsEarned).toBe(0);
  });

  it("should count completed chapters correctly", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100,
    });

    const progress = await t.query(api.story.getPlayerProgress, { token });

    expect(progress.totalChaptersCompleted).toBe(1);
    expect(progress.totalStarsEarned).toBe(3);
  });
});

describe("getPlayerXPInfo", () => {
  it("should return correct XP info and level progress", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    // Set to level 2 with 175 XP (halfway through level 2: 100-250)
    await t.run(async (ctx: TestMutationCtx) => {
      const xp = await ctx.db
        .query("playerXP")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      await ctx.db.patch(xp._id, { currentXP: 175, currentLevel: 2 });
    });

    const info = await t.query(api.story.getPlayerXPInfo, { token });

    expect(info.currentLevel).toBe(2);
    expect(info.currentXP).toBe(175);
    expect(info.xpForNextLevel).toBe(250); // Level 3 threshold
    expect(info.levelProgress).toBeCloseTo(0.5, 1); // 50% of level 2 (75/150 XP range)
  });
});

describe("abandonChapter", () => {
  it("should mark attempt as abandoned and reset progress", async () => {
    const t = createTestInstance();
    const { userId, token } = await createTestUser(t);

    await seedStoryCards(t); // Seed cards for story rewards

    await t.mutation(internal.story.initializeStoryProgress, { userId });

    const { attemptId } = await t.mutation(api.story.startChapter, {
      token,
      actNumber: 1,
      chapterNumber: 1,
      difficulty: "normal",
    });

    await t.mutation(api.story.abandonChapter, { token, attemptId });

    const attempt = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db.get(attemptId);
    });

    expect(attempt.outcome).toBe("abandoned");

    const progress = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("storyProgress")
        .withIndex("by_user_chapter", (q: any) =>
          q.eq("userId", userId).eq("actNumber", 1).eq("chapterNumber", 1)
        )
        .filter((q: any) => q.eq(q.field("difficulty"), "normal"))
        .first();
    });

    expect(progress.status).toBe("available");
  });
});

describe("completeChapter - Card Rewards", () => {
  // Helper function
  async function setupStoryTest(t: any) {
    return await t.run(async (ctx: any) => {
      const userId = await ctx.db.insert("users", {
        username: "storytester",
        email: "story@test.com",
        
        
      });

      const token = "story-token";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
        
      });

      // Initialize currency
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      // Seed story chapter
      await ctx.db.insert("storyChapters", {
        actNumber: 1,
        chapterNumber: 1,
        title: "Test Chapter",
        description: "Test description",
        archetype: "infernal_dragons",
        archetypeImageUrl: "/test.png",
        storyText: "Test story",
        loreText: "Test lore",
        aiOpponentDeckCode: "INFERNAL_DRAGONS",
        aiDifficulty: { normal: 3, hard: 6, legendary: 9 },
        battleCount: 1,
        baseRewards: { gold: 100, xp: 150 },
        isActive: true,
        createdAt: Date.now(),
        
      });

      // Create some test cards
      const cardIds = [];
      for (let i = 0; i < 10; i++) {
        const cardId = await ctx.db.insert("cardDefinitions", {
          name: `Test Card ${i}`,
          rarity: i < 5 ? "common" : "rare",
          archetype: "fire",
          cardType: "creature",
          attack: 10,
          defense: 10,
          cost: 3,
          imageUrl: "/test.png",
          isActive: true,
          createdAt: Date.now(),
        });
        cardIds.push(cardId);
      }

      const progressId = await ctx.db.insert("storyProgress", {
        userId,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "normal",
        status: "available",
        starsEarned: 0,
        timesAttempted: 0,
        timesCompleted: 0,
      });

      const attemptId = await ctx.db.insert("storyBattleAttempts", {
        userId,
        progressId,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "normal",
        outcome: "won",
        starsEarned: 0,
        finalLP: 0,
        rewardsEarned: { gold: 0, xp: 0 },
        attemptedAt: Date.now(),
      });

      // Initialize XP
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });

      return { userId, progressId, attemptId, token };
    });
  }

  it("should award 1 common card for 1-star victory", async () => {
    const t = createTestInstance();
    const { attemptId, token } = await setupStoryTest(t);

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 40,
    });

    expect(result.cardsReceived).toHaveLength(1);
    expect(result.cardsReceived[0].rarity).toBe("common");
  });

  it("should award 2 common cards for 2-star victory", async () => {
    const t = createTestInstance();
    const { attemptId, token } = await setupStoryTest(t);

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 60,
    });

    expect(result.cardsReceived).toHaveLength(2);
    result.cardsReceived.forEach(card => {
      expect(card.rarity).toBe("common");
    });
  });

  it("should award 3 rare cards for 3-star victory", async () => {
    const t = createTestInstance();
    const { attemptId, token } = await setupStoryTest(t);

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100,
    });

    expect(result.cardsReceived).toHaveLength(3);
    result.cardsReceived.forEach(card => {
      expect(card.rarity).toBe("rare");
    });
  });

  it("should not award cards on loss", async () => {
    const t = createTestInstance();
    const { attemptId, token } = await setupStoryTest(t);

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: false,
      finalLP: 0,
    });

    expect(result.cardsReceived).toHaveLength(0);
  });
});

describe("completeChapter - Completion Badges", () => {
  it("should award archetype master badge when all archetype chapters complete", async () => {
    const t = createTestInstance();

    // Import STORY_CHAPTERS
    const { STORY_CHAPTERS } = await import("./seeds/storyChapters");

    const { token, attemptId } = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "badgetester",
        email: "badge@test.com",
        
        
      });

      const token = "badge-token";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
        
      });

      // Initialize currency
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      // Initialize XP
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });

      // Get infernal_dragons chapters
      const infernalChapters = STORY_CHAPTERS.filter(ch => ch.archetype === "infernal_dragons");

      // Seed all infernal dragon chapters
      for (const chapter of infernalChapters) {
        await ctx.db.insert("storyChapters", {
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          description: chapter.description,
          archetype: chapter.archetype,
          archetypeImageUrl: chapter.archetypeImageUrl,
          storyText: chapter.storyText,
          loreText: chapter.loreText,
          aiOpponentDeckCode: chapter.aiOpponentDeckCode,
          aiDifficulty: chapter.aiDifficulty,
          battleCount: chapter.battleCount,
          baseRewards: chapter.baseRewards,
          isActive: true,
          createdAt: Date.now(),
          
        });
      }

      // Create some test cards
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("cardDefinitions", {
          name: `Test Card ${i}`,
          rarity: i < 5 ? "common" : "rare",
          archetype: "fire",
          cardType: "creature",
          attack: 10,
          defense: 10,
          cost: 3,
          imageUrl: "/test.png",
          isActive: true,
          createdAt: Date.now(),
          
        });
      }

      // Mark all but last as completed
      for (const chapter of infernalChapters.slice(0, -1)) {
        await ctx.db.insert("storyProgress", {
          userId,
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          difficulty: "normal",
          status: "completed",
          starsEarned: 3,
          timesAttempted: 1,
          timesCompleted: 1,
        });
      }

      const lastChapter = infernalChapters[infernalChapters.length - 1];
      const progressId = await ctx.db.insert("storyProgress", {
        userId,
        actNumber: lastChapter.actNumber,
        chapterNumber: lastChapter.chapterNumber,
        difficulty: "normal",
        status: "available",
        starsEarned: 0,
        timesAttempted: 0,
        timesCompleted: 0,
      });

      const attemptId = await ctx.db.insert("storyBattleAttempts", {
        userId,
        progressId,
        actNumber: lastChapter.actNumber,
        chapterNumber: lastChapter.chapterNumber,
        difficulty: "normal",
        outcome: "won",
        starsEarned: 0,
        finalLP: 0,
        rewardsEarned: { gold: 0, xp: 0 },
        attemptedAt: Date.now(),
      });

      return { token, attemptId };
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100,
    });

    const archetypeBadge = result.newBadges.find(b => b.badgeId.startsWith("archetype_master_"));
    expect(archetypeBadge).toBeDefined();
    expect(archetypeBadge?.displayName).toContain("Master");
  });

  it("should award act champion badge when all act chapters complete", async () => {
    const t = createTestInstance();
    const { STORY_CHAPTERS } = await import("./seeds/storyChapters");

    const { token, attemptId } = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "actchampion",
        email: "act@test.com",
        
        
      });

      const token = "act-token";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
        
      });

      // Initialize currency
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      // Initialize XP
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });

      // Get Act 1 chapters
      const act1Chapters = STORY_CHAPTERS.filter(ch => ch.actNumber === 1);

      // Seed all act 1 chapters
      for (const chapter of act1Chapters) {
        await ctx.db.insert("storyChapters", {
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          description: chapter.description,
          archetype: chapter.archetype,
          archetypeImageUrl: chapter.archetypeImageUrl,
          storyText: chapter.storyText,
          loreText: chapter.loreText,
          aiOpponentDeckCode: chapter.aiOpponentDeckCode,
          aiDifficulty: chapter.aiDifficulty,
          battleCount: chapter.battleCount,
          baseRewards: chapter.baseRewards,
          isActive: true,
          createdAt: Date.now(),
          
        });
      }

      // Create some test cards
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("cardDefinitions", {
          name: `Test Card ${i}`,
          rarity: i < 5 ? "common" : "rare",
          archetype: "fire",
          cardType: "creature",
          attack: 10,
          defense: 10,
          cost: 3,
          imageUrl: "/test.png",
          isActive: true,
          createdAt: Date.now(),
          
        });
      }

      // Mark all but last as completed
      for (const chapter of act1Chapters.slice(0, -1)) {
        await ctx.db.insert("storyProgress", {
          userId,
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          difficulty: "normal",
          status: "completed",
          starsEarned: 3,
          timesAttempted: 1,
          timesCompleted: 1,
        });
      }

      const lastChapter = act1Chapters[act1Chapters.length - 1];
      const progressId = await ctx.db.insert("storyProgress", {
        userId,
        actNumber: lastChapter.actNumber,
        chapterNumber: lastChapter.chapterNumber,
        difficulty: "normal",
        status: "available",
        starsEarned: 0,
        timesAttempted: 0,
        timesCompleted: 0,
      });

      const attemptId = await ctx.db.insert("storyBattleAttempts", {
        userId,
        progressId,
        actNumber: lastChapter.actNumber,
        chapterNumber: lastChapter.chapterNumber,
        difficulty: "normal",
        outcome: "won",
        starsEarned: 0,
        finalLP: 0,
        rewardsEarned: { gold: 0, xp: 0 },
        attemptedAt: Date.now(),
      });

      return { token, attemptId };
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100,
    });

    const actBadge = result.newBadges.find(b => b.badgeId.startsWith("act_"));
    expect(actBadge).toBeDefined();
    expect(actBadge?.displayName).toContain("Champion");
  });

  it("should not award duplicate archetype badges", async () => {
    const t = createTestInstance();
    const { STORY_CHAPTERS } = await import("./seeds/storyChapters");

    const { userId, token, attemptId } = await t.run(async (ctx: TestMutationCtx) => {
      const userId = await ctx.db.insert("users", {
        username: "dupetest",
        email: "dupe@test.com",
        
        
      });

      const token = "dupe-token";
      await ctx.db.insert("sessions", {
        userId,
        token,
        expiresAt: Date.now() + 86400000,
        
      });

      // Initialize currency
      await ctx.db.insert("playerCurrency", {
        userId,
        gold: 1000,
        gems: 100,
        lifetimeGoldEarned: 1000,
        lifetimeGoldSpent: 0,
        lifetimeGemsEarned: 100,
        lifetimeGemsSpent: 0,
        lastUpdatedAt: Date.now(),
      });

      // Initialize XP
      await ctx.db.insert("playerXP", {
        userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });

      const infernalChapters = STORY_CHAPTERS.filter(ch => ch.archetype === "infernal_dragons");

      // Seed all chapters
      for (const chapter of infernalChapters) {
        await ctx.db.insert("storyChapters", {
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          description: chapter.description,
          archetype: chapter.archetype,
          archetypeImageUrl: chapter.archetypeImageUrl,
          storyText: chapter.storyText,
          loreText: chapter.loreText,
          aiOpponentDeckCode: chapter.aiOpponentDeckCode,
          aiDifficulty: chapter.aiDifficulty,
          battleCount: chapter.battleCount,
          baseRewards: chapter.baseRewards,
          isActive: true,
          createdAt: Date.now(),
          
        });
      }

      // Create test cards
      for (let i = 0; i < 10; i++) {
        await ctx.db.insert("cardDefinitions", {
          name: `Test Card ${i}`,
          rarity: i < 5 ? "common" : "rare",
          archetype: "fire",
          cardType: "creature",
          attack: 10,
          defense: 10,
          cost: 3,
          imageUrl: "/test.png",
          isActive: true,
          createdAt: Date.now(),
          
        });
      }

      // Mark all as completed
      for (const chapter of infernalChapters) {
        await ctx.db.insert("storyProgress", {
          userId,
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          difficulty: "normal",
          status: "completed",
          starsEarned: 3,
          timesAttempted: 1,
          timesCompleted: 1,
        });
      }

      // Already award the badge
      await ctx.db.insert("playerBadges", {
        userId,
        badgeId: "archetype_master_infernal_dragons",
        badgeType: "archetype_complete",
        displayName: "Infernal Dragons Master",
        description: "Completed all infernal dragons archetype chapters",
        archetype: "infernal_dragons",
        earnedAt: Date.now() - 1000,
      });

      // Re-complete first chapter
      const firstChapter = infernalChapters[0];
      const firstProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .filter((q: any) =>
          q.and(
            q.eq(q.field("actNumber"), firstChapter.actNumber),
            q.eq(q.field("chapterNumber"), firstChapter.chapterNumber),
            q.eq(q.field("difficulty"), "normal")
          )
        )
        .first();

      if (firstProgress) {
        await ctx.db.patch(firstProgress._id, { status: "available" });
      }

      const attemptId = await ctx.db.insert("storyBattleAttempts", {
        userId,
        progressId: firstProgress._id,
        actNumber: firstChapter.actNumber,
        chapterNumber: firstChapter.chapterNumber,
        difficulty: "normal",
        outcome: "won",
        starsEarned: 0,
        finalLP: 0,
        rewardsEarned: { gold: 0, xp: 0 },
        attemptedAt: Date.now(),
      });

      return { userId, token, attemptId };
    });

    const result = await t.mutation(api.story.completeChapter, {
      token,
      attemptId,
      won: true,
      finalLP: 100,
    });

    const archetypeBadges = result.newBadges.filter(b => b.badgeId.startsWith("archetype_master_"));
    expect(archetypeBadges).toHaveLength(0);

    const badges = await t.run(async (ctx: TestMutationCtx) => {
      return await ctx.db
        .query("playerBadges")
        .withIndex("by_badge", (q: any) => q.eq("badgeId", "archetype_master_infernal_dragons"))
        .filter((q: any) => q.eq(q.field("userId"), userId))
        .collect();
    });
    expect(badges).toHaveLength(1);
  });
});
