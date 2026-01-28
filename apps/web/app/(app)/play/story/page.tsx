"use client";

import { StoryChapterCard } from "@/components/story/StoryChapterCard";
import { useAuth } from "@/hooks/auth/useConvexAuthHook";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { BookOpen, ChevronLeft, Loader2, Shield, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

// Mock chapter metadata (UI names and descriptions)
const CHAPTER_INFO = [
  {
    chapterNumber: 1,
    name: "Infernal Dragons",
    description:
      "Face the fury of the Fire Dragon Legion. Master aggressive strategies and burn damage mechanics.",
    archetype: "infernal_dragons",
  },
  {
    chapterNumber: 2,
    name: "Abyssal Horrors",
    description:
      "Descend into the deep. Learn control tactics and master the art of freezing your opponents.",
    archetype: "abyssal_horrors",
  },
  {
    chapterNumber: 3,
    name: "Nature Spirits",
    description: "Connect with the wild. Harness growth mechanics and healing abilities.",
    archetype: "nature_spirits",
  },
  {
    chapterNumber: 4,
    name: "Storm Elementals",
    description: "Command the tempest. Unleash lightning and wind-based combos.",
    archetype: "storm_elementals",
  },
  {
    chapterNumber: 5,
    name: "Shadow Assassins",
    description: "Strike from the darkness. Master stealth and quick elimination tactics.",
    archetype: "shadow_assassins",
  },
  {
    chapterNumber: 6,
    name: "Celestial Guardians",
    description:
      "Ascend to the heavens. Discover defensive formations and divine protection spells.",
    archetype: "celestial_guardians",
  },
  {
    chapterNumber: 7,
    name: "Undead Legion",
    description: "Raise the fallen. Learn resurrection mechanics and army building.",
    archetype: "undead_legion",
  },
  {
    chapterNumber: 8,
    name: "Divine Knights",
    description: "The final trial. Face the legendary Divine Knights in the ultimate challenge.",
    archetype: "divine_knights",
  },
  {
    chapterNumber: 9,
    name: "Arcane Mages",
    description: "Wield pure magic. Master spell combinations and mana management.",
    archetype: "arcane_mages",
  },
  {
    chapterNumber: 10,
    name: "Mechanical Constructs",
    description: "Build the future. Combine units and create powerful mechanical synergies.",
    archetype: "mechanical_constructs",
  },
];

export default function StoryModePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currentUser = useQuery(api.core.users.currentUser, isAuthenticated ? {} : "skip") as any;

  // Fetch real data with type assertions to avoid deep instantiation errors
  const allChapters = useQuery(
    api.progression.story.getAvailableChapters,
    isAuthenticated ? {} : "skip"
  ) as any;
  const playerProgress = useQuery(
    api.progression.story.getPlayerProgress,
    isAuthenticated ? {} : "skip"
  ) as any;

  const initializeStoryProgress = useMutation(api.progression.story.initializeStoryProgress);

  // Initialize progress on first access
  useEffect(() => {
    if (isAuthenticated && playerProgress && !playerProgress.progressByAct) {
      // No progress exists, initialize it
      initializeStoryProgress().catch(console.error);
    }
  }, [isAuthenticated, playerProgress, initializeStoryProgress]);

  // Transform real data to match UI format
  const chapters = useMemo(() => {
    if (!allChapters) return [];

    return allChapters.map((chapter: any) => {
      const info = CHAPTER_INFO[chapter.chapterNumber - 1];
      const chapterId = `${chapter.actNumber}-${chapter.chapterNumber}`;

      return {
        chapterId,
        name: info?.name || `Chapter ${chapter.chapterNumber}`,
        description: info?.description || chapter.description || "",
        archetype: info?.archetype || chapter.archetype || "mixed",
        order: chapter.chapterNumber,
        requiredLevel: chapter.requiredLevel || (chapter.chapterNumber - 1) * 5 + 1,
        isUnlocked: chapter.status !== "locked",
        completedStages: chapter.stagesCompleted || 0,
        totalStages: 10,
        starredStages: chapter.starsEarned || 0,
        isCompleted: chapter.status === "completed",
      };
    });
  }, [allChapters]);

  const stats = useMemo(() => {
    if (!playerProgress) {
      return {
        completedChapters: 0,
        totalChapters: 10,
        completedStages: 0,
        totalStages: 100,
        starredStages: 0,
      };
    }

    // Calculate total stages from progress
    let totalStages = 0;
    if (playerProgress.progressByAct) {
      Object.values(playerProgress.progressByAct).forEach((chapters: any) => {
        chapters.forEach((ch: any) => {
          totalStages += ch.timesCompleted || 0;
        });
      });
    }

    return {
      completedChapters: playerProgress.totalChaptersCompleted || 0,
      totalChapters: 10,
      completedStages: totalStages,
      totalStages: 100,
      starredStages: playerProgress.totalStarsEarned || 0,
    };
  }, [playerProgress]);

  const badges = 3; // Placeholder for now

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          <p className="text-[#a89f94]">Loading story mode...</p>
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
          backgroundImage: "url('/assets/backgrounds/story-bg.png')",
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
            {[
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
              },
              { label: "Badges", value: badges, color: "text-green-400", icon: Trophy },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-black/40 border border-[#3d2b1f] rounded-xl p-4 backdrop-blur-sm flex flex-col items-center"
              >
                <stat.icon className={cn("w-6 h-6 mb-2", stat.color)} />
                <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
                <div className="text-xs text-[#a89f94] uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Chapters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {chapters.length > 0 ? (
              chapters.map((chapter: any, index: number) => (
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
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#d4af37] mx-auto mb-4" />
                <p className="text-[#a89f94] mb-4">Loading chapters...</p>
                <p className="text-[#a89f94] text-sm">
                  Run{" "}
                  <code className="bg-black/40 px-2 py-1 rounded">
                    bun convex run scripts/seedStoryChapters:seedStoryChapters
                  </code>{" "}
                  to initialize chapters.
                </p>
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
