"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import type { CompleteChapterResult } from "@/types";
import { handleHookError } from "@/lib/errorHandling";
import { useAuth } from "../auth/useConvexAuthHook";

interface UseStoryProgressReturn {
  progress: ReturnType<typeof useQuery<typeof api.progression.story.getPlayerProgress>> | undefined;
  availableChapters:
    | ReturnType<typeof useQuery<typeof api.progression.story.getAvailableChapters>>
    | undefined;
  isLoading: boolean;
  startChapter: (
    actNumber: number,
    chapterNumber: number,
    difficulty: "normal" | "hard" | "legendary"
  ) => Promise<void>;
  completeChapter: (
    attemptId: Id<"storyBattleAttempts">,
    won: boolean,
    finalLP: number
  ) => Promise<CompleteChapterResult>;
  abandonChapter: (attemptId: Id<"storyBattleAttempts">) => Promise<void>;
}

/**
 * Story mode chapter progression and management.
 *
 * Manages story mode progression including chapter unlocks, difficulty levels,
 * and star ratings. Players progress through acts and chapters, earning stars
 * based on performance. Completing chapters unlocks new content and rewards.
 *
 * Features:
 * - View player's story progress
 * - Get available chapters (unlocked)
 * - Start chapters with difficulty selection (normal/hard/legendary)
 * - Complete chapters with star rating
 * - Abandon ongoing chapters
 * - Track rewards (gold, XP, cards)
 *
 * @example
 * ```typescript
 * const {
 *   progress,
 *   availableChapters,
 *   startChapter,
 *   completeChapter,
 *   abandonChapter
 * } = useStoryProgress();
 *
 * // Start a chapter
 * await startChapter(1, 1, "normal"); // Act 1, Chapter 1, Normal
 *
 * // Complete chapter after battle
 * const result = await completeChapter(attemptId, true, 6500);
 * console.log(`Earned ${result.starsEarned}/3 stars`);
 * console.log(`Rewards: ${result.rewards.gold} gold, ${result.rewards.xp} XP`);
 *
 * // Abandon if needed
 * await abandonChapter(attemptId);
 * ```
 *
 * @returns {UseStoryProgressReturn} Story progression interface
 *
 * @throws {Error} When user is not authenticated
 */
export function useStoryProgress(): UseStoryProgressReturn {
  const { isAuthenticated } = useAuth();

  // Queries
  const progress = useQuery(api.story.getPlayerProgress, isAuthenticated ? {} : "skip");

  const availableChapters = useQuery(api.story.getAvailableChapters, isAuthenticated ? {} : "skip");

  // Mutations
  const startMutation = useMutation(api.story.startChapter);
  const completeMutation = useMutation(api.story.completeChapter);
  const abandonMutation = useMutation(api.story.abandonChapter);

  // Actions
  const startChapter = async (
    actNumber: number,
    chapterNumber: number,
    difficulty: "normal" | "hard" | "legendary"
  ) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await startMutation({ actNumber, chapterNumber, difficulty });
      toast.success("Chapter started!");
    } catch (error) {
      const message = handleHookError(error, "Failed to start chapter");
      toast.error(message);
      throw error;
    }
  };

  const completeChapter = async (
    attemptId: Id<"storyBattleAttempts">,
    won: boolean,
    finalLP: number
  ): Promise<CompleteChapterResult> => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      const mutationResult = await completeMutation({
        attemptId,
        won,
        finalLP,
      });
      toast.success(`Chapter complete! +${mutationResult.rewards.xp} XP, +${mutationResult.rewards.gold} gold`);

      // Transform mutation result to match CompleteChapterResult interface
      // Mutation returns `success`, but interface expects `won`
      return {
        won: mutationResult.success,
        rewards: mutationResult.rewards,
        starsEarned: mutationResult.starsEarned,
        levelUp: mutationResult.levelUp,
        newBadges: mutationResult.newBadges,
        cardsReceived: mutationResult.cardsReceived,
      };
    } catch (error) {
      const message = handleHookError(error, "Failed to complete chapter");
      toast.error(message);
      throw error;
    }
  };

  const abandonChapter = async (attemptId: Id<"storyBattleAttempts">) => {
    if (!isAuthenticated) throw new Error("Not authenticated");
    try {
      await abandonMutation({ attemptId });
      toast.info("Chapter abandoned");
    } catch (error) {
      const message = handleHookError(error, "Failed to abandon chapter");
      toast.error(message);
      throw error;
    }
  };

  return {
    progress,
    availableChapters,
    isLoading: progress === undefined,
    startChapter,
    completeChapter,
    abandonChapter,
  };
}
