"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Gift, Loader2, Lock, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useAuth } from "@/components/ConvexAuthProvider";
import { StoryStageNode } from "@/components/story/StoryStageNode";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FantasyFrame } from "@/components/ui/FantasyFrame";
import { cn } from "@/lib/utils";

interface ChapterPageProps {
  params: Promise<{ chapterId: string }>;
}

// Mock chapter data
const MOCK_CHAPTER_DATA: Record<
  string,
  {
    name: string;
    description: string;
    archetype: string;
    order: number;
    requiredLevel: number;
    isUnlocked: boolean;
    completedStages: number;
    totalStages: number;
    starredStages: number;
  }
> = {
  ch1: {
    name: "Infernal Dragons",
    description:
      "Face the fury of the Fire Dragon Legion. Master aggressive strategies and burn damage mechanics.",
    archetype: "infernal_dragons",
    order: 1,
    requiredLevel: 1,
    isUnlocked: true,
    completedStages: 7,
    totalStages: 10,
    starredStages: 4,
  },
  ch2: {
    name: "Abyssal Horrors",
    description:
      "Descend into the deep. Learn control tactics and master the art of freezing your opponents.",
    archetype: "abyssal_horrors",
    order: 2,
    requiredLevel: 5,
    isUnlocked: true,
    completedStages: 3,
    totalStages: 10,
    starredStages: 2,
  },
};

// Mock stages for chapter 1
const MOCK_STAGES = [
  {
    stageNumber: 1,
    name: "Trial by Fire",
    aiDifficulty: "easy",
    status: "starred",
    firstClearClaimed: true,
    rewardGold: 100,
    rewardXp: 50,
    firstClearBonus: 200,
    description: "Defeat a novice fire mage to prove your worth.",
  },
  {
    stageNumber: 2,
    name: "Ember's Path",
    aiDifficulty: "easy",
    status: "starred",
    firstClearClaimed: true,
    rewardGold: 120,
    rewardXp: 60,
    firstClearBonus: 220,
    description: "Navigate through the burning corridors.",
  },
  {
    stageNumber: 3,
    name: "Flame Warden",
    aiDifficulty: "easy",
    status: "starred",
    firstClearClaimed: true,
    rewardGold: 140,
    rewardXp: 70,
    firstClearBonus: 240,
    description: "Challenge the warden of the flame gates.",
  },
  {
    stageNumber: 4,
    name: "Scorched Earth",
    aiDifficulty: "medium",
    status: "starred",
    firstClearClaimed: true,
    rewardGold: 160,
    rewardXp: 80,
    firstClearBonus: 260,
    description: "Survive the devastating scorched earth tactics.",
  },
  {
    stageNumber: 5,
    name: "Inferno Rising",
    aiDifficulty: "medium",
    status: "completed",
    firstClearClaimed: false,
    rewardGold: 180,
    rewardXp: 90,
    firstClearBonus: 280,
    description: "Face an increasingly powerful fire mage.",
  },
  {
    stageNumber: 6,
    name: "Dragon's Breath",
    aiDifficulty: "medium",
    status: "completed",
    firstClearClaimed: false,
    rewardGold: 200,
    rewardXp: 100,
    firstClearBonus: 300,
    description: "Learn to counter the deadly dragon breath ability.",
  },
  {
    stageNumber: 7,
    name: "Volcanic Fury",
    aiDifficulty: "hard",
    status: "completed",
    firstClearClaimed: false,
    rewardGold: 220,
    rewardXp: 110,
    firstClearBonus: 320,
    description: "Survive the volcanic eruption tactics.",
  },
  {
    stageNumber: 8,
    name: "Ash and Cinders",
    aiDifficulty: "hard",
    status: "available",
    firstClearClaimed: false,
    rewardGold: 240,
    rewardXp: 120,
    firstClearBonus: 340,
    description: "Only ashes remain of those who fail here.",
  },
  {
    stageNumber: 9,
    name: "Phoenix Trial",
    aiDifficulty: "hard",
    status: "locked",
    firstClearClaimed: false,
    rewardGold: 260,
    rewardXp: 130,
    firstClearBonus: 360,
    description: "Face the immortal phoenix and its resurrection powers.",
  },
  {
    stageNumber: 10,
    name: "Dragon Lord",
    aiDifficulty: "boss",
    status: "locked",
    firstClearClaimed: false,
    rewardGold: 500,
    rewardXp: 250,
    firstClearBonus: 1000,
    description: "The ultimate challenge: defeat the Dragon Lord himself.",
  },
];

type StageData = (typeof MOCK_STAGES)[0];

export default function ChapterPage({ params }: ChapterPageProps) {
  const resolvedParams = use(params);
  const chapterId = resolvedParams.chapterId;
  const router = useRouter();
  const { token } = useAuth();
  const currentUser = useQuery(api.users.currentUser, token ? { token } : "skip");

  const [selectedStage, setSelectedStage] = useState<StageData | null>(null);

  const chapter = MOCK_CHAPTER_DATA[chapterId] ?? MOCK_CHAPTER_DATA.ch1;
  const stages = MOCK_STAGES;

  if (!currentUser || !chapter) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          <p className="text-[#a89f94]">Loading chapter...</p>
        </div>
      </div>
    );
  }

  const assetName = chapter.archetype || "infernal_dragons";

  if (!chapter.isUnlocked) {
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
            Reach level {chapter.requiredLevel} or complete the previous chapter to unlock.
          </p>
          <Link
            href="/play/story"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3d2b1f] text-[#e8e0d5] hover:bg-[#3d2b1f]/30 transition-all"
          >
            Back to Chapters
          </Link>
        </FantasyFrame>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src={`/assets/story/${assetName}.png`}
          alt={chapter.name}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/80 via-black/40 to-black/90" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex-none p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            <div>
              <Link
                href="/play/story"
                className="inline-flex items-center gap-1 mb-4 -ml-2 text-[#a89f94] hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Chapters
              </Link>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-purple-400 font-medium tracking-wide text-sm uppercase mb-1">
                  Chapter {chapter.order}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-md">
                  {chapter.name}
                </h1>
                <p className="text-[#a89f94] max-w-xl text-lg leading-relaxed drop-shadow-sm">
                  {chapter.description}
                </p>
              </motion.div>
            </div>

            {/* Progress Panel */}
            <FantasyFrame className="hidden md:block p-4 bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                    Progress
                  </div>
                  <div className="text-xl font-bold text-white">
                    {Math.round((chapter.completedStages / chapter.totalStages) * 100)}%
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <div className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">Stars</div>
                  <div className="text-xl font-bold text-yellow-400 flex items-center gap-1">
                    {chapter.starredStages} <Star className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </FantasyFrame>
          </div>
        </div>

        {/* Map Area */}
        <div className="grow flex items-center justify-center p-8 overflow-x-auto">
          <div className="relative min-w-[800px] w-full max-w-5xl aspect-video mx-auto">
            {/* Map Path SVG */}
            <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-50" aria-hidden="true">
              <title>Story path connecting stages</title>
              <path
                d="M 100 80 Q 250 80 250 250 T 400 420 T 550 250 T 700 80 T 850 250"
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="4"
                strokeDasharray="10 10"
                className="animate-pulse"
              />
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0} />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
            </svg>

            {/* Stage Nodes */}
            {stages.map((stage, index) => {
              const positions = [
                { top: "15%", left: "5%" },
                { top: "15%", left: "25%" },
                { top: "35%", left: "35%" },
                { top: "60%", left: "25%" },
                { top: "80%", left: "40%" },
                { top: "60%", left: "60%" },
                { top: "35%", left: "55%" },
                { top: "15%", left: "70%" },
                { top: "35%", left: "85%" },
                { top: "60%", left: "90%" },
              ];

              const pos = positions[index] || { top: "50%", left: "50%" };

              return (
                <div
                  key={stage.stageNumber}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <StoryStageNode stage={stage} onClick={() => setSelectedStage(stage)} />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stage Selection Dialog */}
      <AnimatePresence>
        {selectedStage && (
          <Dialog open={!!selectedStage} onOpenChange={(open) => !open && setSelectedStage(null)}>
            <DialogContent className="border-[#3d2b1f] sm:max-w-md p-0 overflow-hidden bg-black/90">
              <FantasyFrame variant="obsidian" className="border-none" noPadding>
                {/* Header */}
                <div className="relative p-6 border-b border-[#3d2b1f] bg-linear-to-r from-purple-900/20 to-transparent">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold bg-black/50 border border-white/20",
                        selectedStage.aiDifficulty === "boss"
                          ? "text-red-400 border-red-500/50"
                          : "text-white"
                      )}
                    >
                      {selectedStage.stageNumber}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-white">
                        {selectedStage.name}
                      </DialogTitle>
                      <div
                        className={cn(
                          "text-xs uppercase tracking-wider font-medium mt-1",
                          selectedStage.aiDifficulty === "easy" && "text-green-400",
                          selectedStage.aiDifficulty === "medium" && "text-yellow-400",
                          selectedStage.aiDifficulty === "hard" && "text-orange-400",
                          selectedStage.aiDifficulty === "boss" && "text-red-400"
                        )}
                      >
                        {selectedStage.aiDifficulty} Difficulty
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-[#a89f94] text-sm mb-6 leading-relaxed">
                    {selectedStage.description}
                  </p>

                  {/* Rewards Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-black/40 rounded-lg p-3 text-center border border-[#3d2b1f]">
                      <div className="text-yellow-400 font-bold">{selectedStage.rewardGold}</div>
                      <div className="text-[10px] text-[#a89f94] uppercase">Gold</div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 text-center border border-[#3d2b1f]">
                      <div className="text-blue-400 font-bold">{selectedStage.rewardXp}</div>
                      <div className="text-[10px] text-[#a89f94] uppercase">XP</div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 text-center border border-[#3d2b1f]">
                      <div className="text-purple-400 font-bold">
                        +{selectedStage.firstClearBonus}
                      </div>
                      <div className="text-[10px] text-[#a89f94] uppercase">1st Clear</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedStage.status === "locked" ? (
                    <div className="text-center py-4">
                      <Lock className="w-8 h-8 mx-auto mb-2 text-[#a89f94]" />
                      <p className="text-[#a89f94] text-sm">Complete previous stage to unlock</p>
                    </div>
                  ) : (selectedStage.status === "completed" ||
                      selectedStage.status === "starred") &&
                    !selectedStage.firstClearClaimed ? (
                    <button
                      type="button"
                      className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Gift className="w-5 h-5 animate-bounce" />
                      Claim First Clear Bonus
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/play/story/${chapterId}/battle/${selectedStage.stageNumber}`)
                      }
                      className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
                    >
                      <Play className="w-5 h-5" />
                      {selectedStage.status === "available" ? "Start Battle" : "Replay Battle"}
                    </button>
                  )}
                </div>
              </FantasyFrame>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
