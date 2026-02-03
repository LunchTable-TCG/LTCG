"use client";

import {
  type DifficultyId,
  type DifficultyLevel,
  DifficultySelector,
} from "@/components/story/DifficultySelector";
import { StoryStageNode } from "@/components/story/StoryStageNode";
import { FantasyFrame } from "@/components/ui/FantasyFrame";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { getAssetUrl } from "@/lib/blob";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Clock, Gift, Loader2, Lock, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Format milliseconds until reset into a human-readable string
 */
function formatTimeUntilReset(resetsAt: number) {
  const now = Date.now();
  const milliseconds = Math.max(0, resetsAt - now);

  if (milliseconds <= 0) return "now";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return "less than a minute";
}

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

export default function ChapterPage({ params }: ChapterPageProps) {
  const resolvedParams = use(params);
  const chapterId = resolvedParams.chapterId;
  const [actNumber, chapterNumber] = chapterId.split("-").map(Number);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(apiAny.core.users.currentUser, isAuthenticated ? {} : "skip");
  const chapterDetails = useConvexQuery(
    apiAny.progression.story.getChapterDetails,
    isAuthenticated && actNumber && chapterNumber ? { actNumber, chapterNumber } : "skip"
  );

  const [selectedStage, setSelectedStage] = useState<{
    stageNumber: number;
    name: string;
    description: string;
    rewardGold: number;
    rewardXp: number;
    firstClearBonus: number;
    firstClearClaimed: boolean;
    aiDifficulty: "easy" | "medium" | "hard" | "extreme";
    status: "locked" | "available" | "completed" | "starred";
  } | null>(null);

  // Selected difficulty for the battle
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>("normal");

  // Fetch difficulty requirements and retry limits
  const difficultyRequirements = useConvexQuery(
    apiAny.progression.storyBattle.getDifficultyRequirements,
    isAuthenticated ? {} : "skip"
  );
  const retryLimits = useConvexQuery(
    apiAny.progression.story.getRetryLimits,
    isAuthenticated ? {} : "skip"
  );
  const playerXPInfo = useConvexQuery(
    apiAny.progression.story.getPlayerXPInfo,
    isAuthenticated ? {} : "skip"
  );

  // Build difficulty levels array for the DifficultySelector
  const difficulties: DifficultyLevel[] = useMemo(() => {
    if (!difficultyRequirements) return [];

    return [
      {
        id: "normal" as DifficultyId,
        label: "Normal",
        requiredLevel: difficultyRequirements.normal.requiredLevel,
        unlocked: difficultyRequirements.normal.unlocked,
        rewards: "1x rewards",
        attemptsRemaining: -1, // Unlimited
        maxAttempts: -1,
      },
      {
        id: "hard" as DifficultyId,
        label: "Hard",
        requiredLevel: difficultyRequirements.hard.requiredLevel,
        unlocked: difficultyRequirements.hard.unlocked,
        rewards: "2x rewards",
        attemptsRemaining: retryLimits?.hard.remaining ?? 3,
        maxAttempts: retryLimits?.hard.max ?? 3,
        resetsIn: retryLimits?.hard.resetsAt
          ? formatTimeUntilReset(retryLimits.hard.resetsAt)
          : undefined,
      },
      {
        id: "legendary" as DifficultyId,
        label: "Legendary",
        requiredLevel: difficultyRequirements.legendary.requiredLevel,
        unlocked: difficultyRequirements.legendary.unlocked,
        rewards: "3x rewards",
        attemptsRemaining: retryLimits?.legendary.remaining ?? 1,
        maxAttempts: retryLimits?.legendary.max ?? 1,
        resetsIn: retryLimits?.legendary.resetsAt
          ? formatTimeUntilReset(retryLimits.legendary.resetsAt)
          : undefined,
      },
    ];
  }, [difficultyRequirements, retryLimits]);

  const initializeStageProgress = useConvexMutation(
    apiAny.progression.storyStages.initializeChapterStageProgress
  );

  // Initialize stage progress when chapter loads
  useEffect(() => {
    if (chapterDetails?._id) {
      // Check if any stage has progress - if not, initialize
      const hasProgress = chapterDetails.stages?.some(
        (s: { status?: string; timesCompleted?: number }) =>
          s.status !== "locked" || (s.timesCompleted ?? 0) > 0
      );
      if (!hasProgress) {
        initializeStageProgress({ chapterId: chapterDetails._id }).catch(console.error);
      }
    }
  }, [chapterDetails, initializeStageProgress]);

  if (!currentUser || chapterDetails === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          <p className="text-[#a89f94]">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapterDetails) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <FantasyFrame className="w-full max-w-md p-8 text-center bg-black/80 backdrop-blur-md">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h1 className="text-2xl font-bold mb-2 text-white">Chapter Not Found</h1>
          <p className="text-[#a89f94] mb-6">
            This chapter is not available or hasn't been unlocked yet.
          </p>
          <Link
            href="/play/story"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3d2b1f] text-[#e8e0d5] hover:bg-[#3d2b1f]/30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Chapters
          </Link>
        </FantasyFrame>
      </div>
    );
  }

  const chapter = chapterDetails;
  const stages = chapter.stages || [];
  const assetName = chapter.archetype || "infernal_dragons";

  const completedStages = stages.filter(
    (s: { status?: string }) => s.status === "starred" || s.status === "completed"
  ).length;
  const starCount = stages.filter((s: { status?: string }) => s.status === "starred").length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0" data-testid="chapter-artwork">
        <Image
          src={getAssetUrl(`/assets/story/${assetName}.png`)}
          alt={chapter.title}
          fill
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/80 to-black" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 md:p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <Link
            href="/play/story"
            className="inline-flex items-center gap-2 text-[#a89f94] hover:text-[#e8e0d5] transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Chapters
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-bold text-[#e8e0d5] mb-2 drop-shadow-lg"
              >
                {chapter.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[#a89f94] text-lg max-w-2xl"
              >
                {chapter.description}
              </motion.p>
            </div>

            <div className="flex items-center gap-6 text-center">
              <div data-testid="chapter-progress">
                <div className="text-3xl font-bold text-[#e8e0d5]">
                  {completedStages}/{stages.length}
                </div>
                <div className="text-xs text-[#a89f94] uppercase tracking-wider">Stages</div>
              </div>
              <div data-testid="stage-stars">
                <div className="flex items-center gap-1 text-3xl font-bold text-yellow-400">
                  <Star className="w-7 h-7 fill-yellow-400" />
                  {starCount}
                </div>
                <div className="text-xs text-[#a89f94] uppercase tracking-wider">Stars</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Map */}
        <div className="max-w-7xl mx-auto">
          {stages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {stages.map((stage: any, index: number) => {
                const stageData = {
                  stageNumber: stage.stageNumber,
                  name: stage.name,
                  description: stage.description,
                  rewardGold: stage.rewardGold,
                  rewardXp: stage.rewardXp,
                  firstClearBonus: stage.firstClearBonus,
                  firstClearClaimed: stage.firstClearClaimed,
                  aiDifficulty: stage.aiDifficulty,
                  status: stage.status,
                };
                return (
                  <motion.div
                    key={stage.stageNumber}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <StoryStageNode
                      stage={stageData}
                      onClick={() => {
                        // Check if stage is locked based on progress status
                        if (stageData.status === "locked") {
                          toast.error("Complete the previous stage first!");
                          return;
                        }
                        setSelectedStage(stageData);
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-[#a89f94]">No stages available for this chapter yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage Detail Dialog */}
      <AnimatePresence>
        {selectedStage && (
          <Dialog open={!!selectedStage} onOpenChange={() => setSelectedStage(null)}>
            <DialogContent className="bg-black/95 border-[#3d2b1f] max-w-md">
              <DialogTitle className="text-2xl font-bold text-[#e8e0d5] mb-2">
                Stage {selectedStage.stageNumber}: {selectedStage.name}
              </DialogTitle>

              <p className="text-[#a89f94] mb-6" data-testid="story-dialogue">
                {selectedStage.description}
              </p>

              {/* Rewards */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
                  <span className="text-sm text-[#a89f94]">Reward</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#d4af37] font-bold">
                      {selectedStage.rewardGold} Gold
                    </span>
                    <span className="text-purple-400 font-bold">{selectedStage.rewardXp} XP</span>
                  </div>
                </div>

                {!selectedStage.firstClearClaimed && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-blue-400">First Clear Bonus</span>
                    </div>
                    <span className="text-blue-400 font-bold">
                      +{selectedStage.firstClearBonus} Gold
                    </span>
                  </div>
                )}
              </div>

              {/* AI Difficulty Badge (stage base difficulty) */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[#a89f94]">Stage AI</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    selectedStage.aiDifficulty === "easy"
                      ? "bg-green-500/20 text-green-400"
                      : selectedStage.aiDifficulty === "medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : selectedStage.aiDifficulty === "hard"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-purple-500/20 text-purple-400"
                  )}
                  data-testid="stage-difficulty"
                >
                  {selectedStage.aiDifficulty}
                </span>
              </div>

              {/* Difficulty Selector */}
              {difficulties.length > 0 && (
                <div className="mb-6">
                  <DifficultySelector
                    difficulties={difficulties}
                    selected={selectedDifficulty}
                    onSelect={setSelectedDifficulty}
                    playerLevel={playerXPInfo?.currentLevel ?? 1}
                  />
                </div>
              )}

              {/* Retry Limits Info */}
              {selectedDifficulty !== "normal" && retryLimits && (
                <div className="mb-6 p-3 rounded-lg bg-[#1a1510] border border-[#3d2b1f]/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#a89f94]" />
                      <span className="text-sm text-[#a89f94]">Attempts</span>
                    </div>
                    <div className="text-sm">
                      {selectedDifficulty === "hard" ? (
                        <span
                          className={cn(
                            "font-medium",
                            retryLimits.hard.remaining > 0 ? "text-orange-400" : "text-red-400"
                          )}
                        >
                          {retryLimits.hard.remaining}/{retryLimits.hard.max} remaining
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "font-medium",
                            retryLimits.legendary.remaining > 0 ? "text-purple-400" : "text-red-400"
                          )}
                        >
                          {retryLimits.legendary.remaining}/{retryLimits.legendary.max} remaining
                        </span>
                      )}
                    </div>
                  </div>
                  {((selectedDifficulty === "hard" && retryLimits.hard.remaining === 0) ||
                    (selectedDifficulty === "legendary" &&
                      retryLimits.legendary.remaining === 0)) && (
                    <div className="mt-2 text-xs text-[#a89f94]/70 text-center">
                      Resets in{" "}
                      {selectedDifficulty === "hard"
                        ? formatTimeUntilReset(retryLimits.hard.resetsAt)
                        : formatTimeUntilReset(retryLimits.legendary.resetsAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (!currentUser?.activeDeckId) {
                    const shouldNavigate = confirm(
                      "You must select a deck before starting a battle.\n\nWould you like to go to your profile to select a deck?"
                    );
                    if (shouldNavigate) {
                      router.push("/profile");
                    }
                    return;
                  }

                  // Check if difficulty is unlocked
                  const selectedDiffData = difficulties.find((d) => d.id === selectedDifficulty);
                  if (!selectedDiffData?.unlocked) {
                    toast.error(
                      `Reach level ${selectedDiffData?.requiredLevel} to unlock ${selectedDifficulty} mode`
                    );
                    return;
                  }

                  // Check if attempts are available
                  const attemptsRemaining = selectedDiffData.attemptsRemaining ?? -1;
                  if (attemptsRemaining !== -1 && attemptsRemaining <= 0) {
                    toast.error(
                      `No attempts remaining for ${selectedDifficulty} mode. Resets in ${selectedDiffData.resetsIn}`
                    );
                    return;
                  }

                  const battleUrl = `/play/story/${chapterId}/battle/${selectedStage.stageNumber}?difficulty=${selectedDifficulty}`;
                  console.log("Navigating to battle:", battleUrl);
                  router.push(battleUrl);
                }}
                disabled={selectedStage.status === "locked"}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all",
                  selectedStage.status === "locked"
                    ? "bg-gray-600/20 text-gray-400 cursor-not-allowed"
                    : "bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614]"
                )}
              >
                {selectedStage.status === "locked" ? (
                  <>
                    <Lock className="w-5 h-5" />
                    Locked
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {selectedStage.status === "starred" ? "Replay" : "Start Battle"}
                  </>
                )}
              </button>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
