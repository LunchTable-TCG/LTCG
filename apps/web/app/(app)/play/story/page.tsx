"use client";

import { StoryChapterCard } from "@/components/story/StoryChapterCard";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { getAssetUrl } from "@/lib/blob";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BookOpen, ChevronLeft, Loader2, Lock, Shield, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function StoryModePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currentUser = useConvexQuery(
    typedApi.core.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  // Feature flag check
  const { enabled: storyModeEnabled, isLoading: flagsLoading } = useFeatureFlag("storyModeEnabled");

  // Fetch real data
  const allChapters = useConvexQuery(
    typedApi.progression.story.getAvailableChapters,
    isAuthenticated ? {} : "skip"
  );
  const playerProgress = useConvexQuery(
    typedApi.progression.story.getPlayerProgress,
    isAuthenticated ? {} : "skip"
  );

  const initializeStoryProgress = useConvexMutation(
    typedApi.progression.story.initializeStoryProgress
  );

  // Initialize progress on first access
  useEffect(() => {
    if (isAuthenticated && playerProgress && !playerProgress.progressByAct) {
      // No progress exists, initialize it
      initializeStoryProgress({}).catch(console.error);
    }
  }, [isAuthenticated, playerProgress, initializeStoryProgress]);

  // Transform chapter data from database to UI format
  const chapters = useMemo(() => {
    if (!allChapters) return [];

    return allChapters.map(
      (chapter: {
        actNumber: number;
        chapterNumber: number;
        title: string;
        description: string;
        archetype?: string;
        status?: string;
        stagesCompleted?: number;
        totalStages?: number;
        starsEarned?: number;
        isUnlocked?: boolean;
        unlockRequirements?: {
          minimumLevel?: number;
        };
      }) => {
        const chapterId = `${chapter.actNumber}-${chapter.chapterNumber}`;

        // Derive required level from unlock requirements or use default progression
        const requiredLevel =
          chapter.unlockRequirements?.minimumLevel || (chapter.chapterNumber - 1) * 5 + 1;

        return {
          chapterId,
          // Use database title and description directly
          name: chapter.title || `Chapter ${chapter.chapterNumber}`,
          description: chapter.description || "",
          archetype: chapter.archetype || "mixed",
          order: chapter.chapterNumber,
          requiredLevel,
          isUnlocked: chapter.isUnlocked ?? chapter.status !== "locked",
          completedStages: chapter.stagesCompleted || 0,
          totalStages: chapter.totalStages || 10,
          starredStages: chapter.starsEarned || 0,
          isCompleted: chapter.status === "completed",
        };
      }
    );
  }, [allChapters]);

  const stats = useMemo(() => {
    // Use actual chapter count from database
    const totalChapters = allChapters?.length || 0;
    // Each chapter has 10 stages
    const totalStages = totalChapters * 10;

    if (!playerProgress) {
      return {
        completedChapters: 0,
        totalChapters,
        completedStages: 0,
        totalStages,
        starredStages: 0,
      };
    }

    // Calculate completed stages from progress
    let completedStages = 0;
    if (playerProgress.progressByAct) {
      Object.values(playerProgress.progressByAct).forEach((chapters: unknown) => {
        if (!Array.isArray(chapters)) return;
        chapters.forEach((ch: { timesCompleted?: number }) => {
          completedStages += ch.timesCompleted || 0;
        });
      });
    }

    return {
      completedChapters: playerProgress.totalChaptersCompleted || 0,
      totalChapters,
      completedStages,
      totalStages,
      starredStages: playerProgress.totalStarsEarned || 0,
    };
  }, [playerProgress, allChapters]);

  const badges = 3; // Placeholder for now

  // Loading state
  if (!currentUser || flagsLoading) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          <p className="text-[#a89f94]">Loading story mode...</p>
        </div>
      </div>
    );
  }

  // Feature flag gate - show disabled state if story mode is turned off
  if (!storyModeEnabled) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-purple-500/20 mx-auto mb-6 flex items-center justify-center border border-purple-500/30">
            <Lock className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-[#e8e0d5] mb-4">Story Mode Unavailable</h1>
          <p className="text-[#a89f94] mb-8">
            Story mode is currently disabled. Check back later for epic adventures and legendary
            battles!
          </p>
          <Link
            href="/lunchtable"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-xl text-purple-200 font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Return to Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${getAssetUrl("/assets/backgrounds/story-bg.png")}')`,
        }}
      />
      <div className="fixed inset-0 bg-black/40" />

      {/* Hero Section */}
      <div className="relative z-10 pt-24 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-sm font-medium mb-6 backdrop-blur-md">
              <BookOpen className="w-4 h-4" />
              <span>Campaign Mode</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-[#e8e0d5] drop-shadow-lg">
              Realm of{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-[#d4af37]">
                Legends
              </span>
            </h1>

            <p className="text-[#a89f94] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed drop-shadow-md">
              Embark on an epic journey through ten distinct realms. Master the elements, defeat
              ancient guardians, and forge your destiny.
            </p>
          </motion.div>

          {/* Player Stats Dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16"
          >
            {(
              [
                {
                  label: "Chapters",
                  value: `${stats.completedChapters}/${stats.totalChapters}`,
                  color: "text-purple-400",
                  icon: BookOpen,
                },
                {
                  label: "Stages Cleared",
                  value: `${stats.completedStages}/${stats.totalStages}`,
                  color: "text-blue-400",
                  icon: Shield,
                },
                {
                  label: "Stars Earned",
                  value: stats.starredStages,
                  color: "text-yellow-400",
                  icon: Star,
                  testId: "stage-stars",
                },
                { label: "Badges", value: badges, color: "text-green-400", icon: Trophy },
              ] as const
            ).map((stat) => (
              <div
                key={stat.label}
                className="bg-black/40 border border-[#3d2b1f] rounded-xl p-4 backdrop-blur-sm flex flex-col items-center"
                data-testid={"testId" in stat ? stat.testId : undefined}
              >
                <stat.icon className={cn("w-6 h-6 mb-2", stat.color)} />
                <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
                <div className="text-xs text-[#a89f94] uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Chapters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {allChapters === undefined ? (
              // Still loading from server
              <div className="col-span-full text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#d4af37] mx-auto mb-4" />
                <p className="text-[#a89f94]">Loading chapters...</p>
              </div>
            ) : chapters.length > 0 ? (
              chapters.map(
                (
                  chapter: {
                    chapterId: string;
                    name: string;
                    description: string;
                    archetype: string;
                    order: number;
                    requiredLevel: number;
                    completedStages: number;
                    totalStages: number;
                    starredStages: number;
                    isCompleted: boolean;
                    isUnlocked: boolean;
                  },
                  index: number
                ) => (
                  <motion.div
                    key={chapter.chapterId}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <StoryChapterCard
                      chapter={chapter}
                      onClick={() => {
                        if (chapter.isUnlocked) {
                          router.push(`/play/story/${chapter.chapterId}`);
                        }
                      }}
                    />
                  </motion.div>
                )
              )
            ) : (
              // No chapters found after loading
              <div className="col-span-full text-center py-16 bg-black/30 rounded-2xl border border-[#3d2b1f]">
                <div className="w-20 h-20 rounded-2xl bg-purple-500/20 mx-auto mb-6 flex items-center justify-center border border-purple-500/30">
                  <BookOpen className="w-10 h-10 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-[#e8e0d5] mb-3">Story Chapters Unavailable</p>
                <p className="text-[#a89f94] mb-6 max-w-md mx-auto">
                  The story mode chapters haven't been initialized yet. Please try again later or
                  contact support if this persists.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-xl text-purple-200 font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="fixed bottom-8 left-8 z-50">
        <Link
          href="/lunchtable"
          className="flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-[#3d2b1f] rounded-full px-6 py-3 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Return to Hub</span>
        </Link>
      </div>
    </div>
  );
}
