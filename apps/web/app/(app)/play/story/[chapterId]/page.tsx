"use client";

import { StoryStageNode } from "@/components/story/StoryStageNode";
import { FantasyFrame } from "@/components/ui/FantasyFrame";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Gift, Loader2, Lock, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

export default function ChapterPage({ params }: ChapterPageProps) {
  const resolvedParams = use(params);
  const chapterId = resolvedParams.chapterId;
  const [actNumber, chapterNumber] = chapterId.split("-").map(Number);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(api.core.users.currentUser, isAuthenticated ? {} : "skip");
  const chapterDetails = useConvexQuery(
    api.progression.story.getChapterDetails,
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

  const initializeStageProgress = useConvexMutation(
    api.progression.storyStages.initializeChapterStageProgress
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

  // Check if chapter is locked
  if (false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 z-0">
          <Image
            src={`/assets/story/${assetName}.png`}
            alt="Chapter Background"
            fill
            className="object-cover opacity-30 blur-sm"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <FantasyFrame className="relative z-10 w-full max-w-md p-8 text-center bg-black/80 backdrop-blur-md">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h1 className="text-2xl font-bold mb-2 text-white">Chapter Locked</h1>
          <p className="text-[#a89f94] mb-6">
            Complete the previous chapter or reach the required level to unlock.
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

  const completedStages = stages.filter(
    (s: { status?: string }) => s.status === "starred" || s.status === "completed"
  ).length;
  const starCount = stages.filter((s: { status?: string }) => s.status === "starred").length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0" data-testid="chapter-artwork">
        <Image
          src={`/assets/story/${assetName}.png`}
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
                    <StoryStageNode stage={stageData} onClick={() => setSelectedStage(stageData)} />
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

              {/* Status Badge */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-[#a89f94]">Difficulty</span>
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

                  const battleUrl = `/play/story/${chapterId}/battle/${selectedStage.stageNumber}`;
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
