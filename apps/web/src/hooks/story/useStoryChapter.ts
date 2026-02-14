"use client";

import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useStoryChapter(chapterId: string) {
  const [actNumber, chapterNumber] = chapterId.split("-").map(Number);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  const chapterDetails = useConvexQuery(
    typedApi.progression.story.getChapterDetails,
    isAuthenticated && actNumber && chapterNumber ? { actNumber, chapterNumber } : "skip"
  );

  type StageData = {
    stageNumber: number;
    name: string;
    description: string;
    rewardGold: number;
    rewardXp: number;
    firstClearBonus: number;
    firstClearClaimed: boolean;
    aiDifficulty: string;
    status: string;
  };

  const [selectedStage, setSelectedStage] = useState<StageData | null>(null);

  const initializeStageProgress = useConvexMutation(
    typedApi.progression.storyStages.initializeChapterStageProgress
  );

  // Initialize stage progress when chapter loads
  useEffect(() => {
    if (chapterDetails?._id) {
      type StageWithProgress = { status?: string; timesCompleted?: number };
      const stages = chapterDetails.stages as StageWithProgress[] | undefined;
      const hasProgress = stages?.some((s) => s.status !== "locked" || (s.timesCompleted ?? 0) > 0);
      if (!hasProgress) {
        initializeStageProgress({ chapterId: chapterDetails._id }).catch(console.error);
      }
    }
  }, [chapterDetails, initializeStageProgress]);

  const handleStageSelect = (stageData: StageData) => {
    if (stageData.status === "locked") {
      toast.error("Complete the previous stage first!");
      return;
    }
    setSelectedStage(stageData);
  };

  const startBattle = () => {
    if (!selectedStage) return;

    if (!currentUser?.activeDeckId) {
      const shouldNavigate = confirm(
        "You must select a deck before starting a battle.\n\nWould you like to go to your profile to select a deck?"
      );
      if (shouldNavigate) {
        navigate({ to: "/profile" });
      }
      return;
    }

    const battleUrl = `/play/story/${chapterId}/battle/${selectedStage.stageNumber}`;
    navigate({ to: battleUrl });
  };

  const isLoading = !currentUser || chapterDetails === undefined;
  const isMissing = !chapterDetails;

  return {
    chapterDetails,
    selectedStage,
    setSelectedStage,
    handleStageSelect,
    startBattle,
    isLoading,
    isMissing,
    currentUser,
  };
}
