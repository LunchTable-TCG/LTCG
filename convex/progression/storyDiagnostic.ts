/**
 * Story Battle Diagnostic Mutations
 *
 * Simple diagnostic mutations to help debug story battle initialization issues.
 * These can be called from the frontend to test authentication and story setup.
 */

import { ConvexError, v } from "convex/values";
import { mutation } from "../functions";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

/**
 * Super simple test to verify ConvexError works
 */
export const testConvexError = mutation({
  args: {},
  handler: async () => {
    console.log("[TestConvexError] About to throw ConvexError");
    throw new ConvexError({
      code: "TEST_ERROR",
      message: "This is a test error message that should be visible on client",
    });
  },
});

/**
 * Test createError function
 */
export const testCreateError = mutation({
  args: {},
  handler: async () => {
    console.log("[TestCreateError] About to throw via createError");
    throw createError(ErrorCode.AUTH_REQUIRED);
  },
});

/**
 * Simple diagnostic to test authentication
 * Returns user info if auth works, errors if not
 */
export const testAuth = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("[TestAuth] Starting auth test...");
    try {
      const identity = await ctx.auth.getUserIdentity();
      console.log("[TestAuth] Identity:", identity?.subject);

      if (!identity) {
        return { success: false, reason: "No identity from ctx.auth" };
      }

      const { userId, username } = await requireAuthMutation(ctx);
      console.log("[TestAuth] Authenticated:", userId, username);

      const user = await ctx.db.get(userId);
      console.log("[TestAuth] User record:", user?._id, user?.activeDeckId);

      return {
        success: true,
        userId,
        username,
        hasActiveDeck: !!user?.activeDeckId,
        privyId: identity.subject,
      };
    } catch (error) {
      console.error("[TestAuth] Error:", error);
      return {
        success: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Test story battle initialization with detailed step logging
 */
export const testInitStoryBattle = mutation({
  args: {
    chapterId: v.string(),
    stageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const steps: Array<{ step: string; status: "pass" | "fail"; detail?: string }> = [];

    try {
      // Step 1: Auth
      steps.push({ step: "1. Auth check", status: "pass" });
      console.log("[TestInit] Step 1: Checking auth...");
      const { userId, username } = await requireAuthMutation(ctx);
      steps[steps.length - 1] = {
        step: "1. Auth check",
        status: "pass",
        detail: `User: ${username} (${userId})`,
      };

      // Step 2: Parse chapter ID
      console.log("[TestInit] Step 2: Parsing chapter ID...");
      const [actNum, chapNum] = args.chapterId.split("-").map(Number);
      if (!actNum || !chapNum) {
        steps.push({ step: "2. Parse chapter", status: "fail", detail: "Invalid format" });
        return { success: false, steps };
      }
      steps.push({
        step: "2. Parse chapter",
        status: "pass",
        detail: `Act ${actNum}, Chapter ${chapNum}`,
      });

      // Step 3: Find chapter
      console.log("[TestInit] Step 3: Finding chapter...");
      const chapter = await ctx.db
        .query("storyChapters")
        .withIndex("by_act_chapter", (q) => q.eq("actNumber", actNum).eq("chapterNumber", chapNum))
        .first();
      if (!chapter) {
        steps.push({ step: "3. Find chapter", status: "fail", detail: "Not found in DB" });
        return { success: false, steps };
      }
      steps.push({
        step: "3. Find chapter",
        status: "pass",
        detail: `${chapter.title} (archetype: ${chapter.archetype})`,
      });

      // Step 4: Check user deck
      console.log("[TestInit] Step 4: Checking user deck...");
      const user = await ctx.db.get(userId);
      if (!user?.activeDeckId) {
        steps.push({ step: "4. Check deck", status: "fail", detail: "No active deck" });
        return { success: false, steps };
      }
      steps.push({ step: "4. Check deck", status: "pass", detail: `Deck: ${user.activeDeckId}` });

      // Step 5: Build AI deck
      console.log("[TestInit] Step 5: Building AI deck...");
      // Use aiOpponentDeckCode (lowercase) which maps to actual card archetypes
      const deckArchetype = (chapter.aiOpponentDeckCode ?? "infernal_dragons").toLowerCase() as
        | "infernal_dragons"
        | "abyssal_horrors"
        | "nature_spirits"
        | "storm_elementals"
        | "neutral";
      const archetypeCards = await ctx.db
        .query("cardDefinitions")
        .withIndex("by_archetype", (q) => q.eq("archetype", deckArchetype))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      steps.push({
        step: "5. Build AI deck",
        status: "pass",
        detail: `${archetypeCards.length} cards found for ${chapter.aiOpponentDeckCode ?? "default"}`,
      });

      return { success: true, steps };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "No stack";
      console.error("[TestInit] Error:", errorMsg);
      console.error("[TestInit] Stack:", errorStack);
      steps.push({ step: "Error", status: "fail", detail: errorMsg });
      return { success: false, steps, error: errorMsg };
    }
  },
});
