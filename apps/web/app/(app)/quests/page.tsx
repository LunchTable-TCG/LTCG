"use client";

import {
  Award,
  Check,
  Clock,
  Cog,
  Coins,
  Crown,
  Droplets,
  Flame,
  Gift,
  Leaf,
  Loader2,
  Lock,
  Moon,
  Mountain,
  Package,
  RefreshCw,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sun,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Wand2,
  Wind,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks";

type TabType = "quests" | "badges" | "achievements";
type QuestType = "daily" | "weekly" | "achievement" | "event";
type QuestStatus = "active" | "completed" | "claimed";

interface Quest {
  questRecordId: string;
  name: string;
  description: string;
  questType: QuestType;
  requirementType: string;
  currentProgress: number;
  targetValue: number;
  rewardGold: number;
  rewardXp: number;
  status: QuestStatus;
  expiresAt: number;
}

interface PlayerLevel {
  currentLevel: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
}

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  rarity: "bronze" | "silver" | "gold" | "platinum";
  isUnlocked: boolean;
  unlockedAt?: number;
  requirement: string;
}

interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: string;
  isUnlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  target?: number;
  rewardGold?: number;
  rewardXp?: number;
}

// Mock data for UI development
const MOCK_QUESTS: Quest[] = [
  {
    questRecordId: "q1",
    name: "Dragon Slayer",
    description: "Win 3 games using a Fire deck",
    questType: "daily",
    requirementType: "win_with_archetype",
    currentProgress: 2,
    targetValue: 3,
    rewardGold: 150,
    rewardXp: 75,
    status: "active",
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  },
  {
    questRecordId: "q2",
    name: "Card Collector",
    description: "Play 20 cards in any game mode",
    questType: "daily",
    requirementType: "play_cards",
    currentProgress: 20,
    targetValue: 20,
    rewardGold: 100,
    rewardXp: 50,
    status: "completed",
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  },
  {
    questRecordId: "q3",
    name: "Damage Dealer",
    description: "Deal 50 damage to opponents",
    questType: "daily",
    requirementType: "deal_damage",
    currentProgress: 35,
    targetValue: 50,
    rewardGold: 120,
    rewardXp: 60,
    status: "active",
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  },
  {
    questRecordId: "q4",
    name: "Weekly Warrior",
    description: "Win 10 ranked games",
    questType: "weekly",
    requirementType: "win_games",
    currentProgress: 7,
    targetValue: 10,
    rewardGold: 500,
    rewardXp: 250,
    status: "active",
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
  },
  {
    questRecordId: "q5",
    name: "Story Explorer",
    description: "Complete 5 story stages",
    questType: "weekly",
    requirementType: "complete_story_stage",
    currentProgress: 3,
    targetValue: 5,
    rewardGold: 400,
    rewardXp: 200,
    status: "active",
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
  },
  {
    questRecordId: "q6",
    name: "Pack Opener",
    description: "Open 3 card packs",
    questType: "weekly",
    requirementType: "open_packs",
    currentProgress: 3,
    targetValue: 3,
    rewardGold: 300,
    rewardXp: 150,
    status: "completed",
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
  },
];

const MOCK_PLAYER_LEVEL: PlayerLevel = {
  currentLevel: 12,
  totalXp: 4850,
  xpInCurrentLevel: 350,
  xpToNextLevel: 500,
  progressPercent: 70,
};

// Story chapter badges - one for each chapter completion
const MOCK_BADGES: Badge[] = [
  {
    badgeId: "ch1",
    name: "Dragon Tamer",
    description: "Complete Chapter 1: Infernal Dragons",
    icon: "fire",
    rarity: "gold",
    isUnlocked: true,
    unlockedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    requirement: "Complete all 10 stages of Infernal Dragons",
  },
  {
    badgeId: "ch2",
    name: "Abyss Walker",
    description: "Complete Chapter 2: Abyssal Horrors",
    icon: "water",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Abyssal Horrors",
  },
  {
    badgeId: "ch3",
    name: "Celestial Champion",
    description: "Complete Chapter 3: Celestial Guardians",
    icon: "light",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Celestial Guardians",
  },
  {
    badgeId: "ch4",
    name: "Nature's Ally",
    description: "Complete Chapter 4: Nature Spirits",
    icon: "nature",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Nature Spirits",
  },
  {
    badgeId: "ch5",
    name: "Shadow Master",
    description: "Complete Chapter 5: Shadow Assassins",
    icon: "shadow",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Shadow Assassins",
  },
  {
    badgeId: "ch6",
    name: "Storm Bringer",
    description: "Complete Chapter 6: Storm Elementals",
    icon: "wind",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Storm Elementals",
  },
  {
    badgeId: "ch7",
    name: "Death Knight",
    description: "Complete Chapter 7: Undead Legion",
    icon: "skull",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Undead Legion",
  },
  {
    badgeId: "ch8",
    name: "Archmage",
    description: "Complete Chapter 8: Arcane Mages",
    icon: "arcane",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Arcane Mages",
  },
  {
    badgeId: "ch9",
    name: "Iron Forger",
    description: "Complete Chapter 9: Mechanical Constructs",
    icon: "gear",
    rarity: "gold",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Mechanical Constructs",
  },
  {
    badgeId: "ch10",
    name: "Divine Crusader",
    description: "Complete Chapter 10: Divine Knights",
    icon: "crown",
    rarity: "platinum",
    isUnlocked: false,
    requirement: "Complete all 10 stages of Divine Knights - The Final Chapter",
  },
];

const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    achievementId: "a1",
    name: "First Victory",
    description: "Win your first game",
    category: "Combat",
    isUnlocked: true,
    unlockedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    rewardGold: 100,
    rewardXp: 50,
  },
  {
    achievementId: "a2",
    name: "Deck Builder",
    description: "Create your first custom deck",
    category: "Collection",
    isUnlocked: true,
    unlockedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    rewardGold: 150,
    rewardXp: 75,
  },
  {
    achievementId: "a3",
    name: "Story Beginner",
    description: "Complete Chapter 1 Stage 1",
    category: "Story",
    isUnlocked: true,
    unlockedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    rewardGold: 100,
    rewardXp: 50,
  },
  {
    achievementId: "a4",
    name: "Winning Streak",
    description: "Win 5 games in a row",
    category: "Combat",
    isUnlocked: false,
    progress: 3,
    target: 5,
    rewardGold: 300,
    rewardXp: 150,
  },
  {
    achievementId: "a5",
    name: "Card Hoarder",
    description: "Collect 50 unique cards",
    category: "Collection",
    isUnlocked: false,
    progress: 32,
    target: 50,
    rewardGold: 500,
    rewardXp: 250,
  },
  {
    achievementId: "a6",
    name: "Chapter Master",
    description: "Complete an entire story chapter",
    category: "Story",
    isUnlocked: false,
    progress: 7,
    target: 10,
    rewardGold: 1000,
    rewardXp: 500,
  },
  {
    achievementId: "a7",
    name: "Veteran",
    description: "Play 100 games",
    category: "Combat",
    isUnlocked: false,
    progress: 45,
    target: 100,
    rewardGold: 750,
    rewardXp: 400,
  },
  {
    achievementId: "a8",
    name: "Perfectionist",
    description: "Win a game without losing any health",
    category: "Combat",
    isUnlocked: false,
    rewardGold: 500,
    rewardXp: 250,
  },
];

const questTypeColors = {
  daily: "from-blue-500 to-cyan-500 border-blue-500/30",
  weekly: "from-purple-500 to-indigo-500 border-purple-500/30",
  achievement: "from-yellow-500 to-orange-500 border-yellow-500/30",
  event: "from-pink-500 to-rose-500 border-pink-500/30",
};

const requirementIcons: Record<string, typeof Swords> = {
  win_games: Swords,
  play_cards: Package,
  deal_damage: Zap,
  win_with_archetype: Award,
  complete_story_stage: Target,
  spend_gold: Coins,
  trade_cards: RefreshCw,
  open_packs: Gift,
  craft_cards: Sparkles,
  evolve_cards: TrendingUp,
};

const badgeIcons: Record<string, typeof Flame> = {
  fire: Flame,
  water: Droplets,
  earth: Mountain,
  wind: Wind,
  star: Star,
  light: Sun,
  nature: Leaf,
  shadow: Moon,
  skull: Skull,
  arcane: Wand2,
  gear: Cog,
  crown: Crown,
};

const rarityColors = {
  bronze: {
    bg: "from-amber-700/20 to-orange-900/20",
    border: "border-amber-600/40",
    text: "text-amber-500",
    glow: "shadow-amber-500/20",
  },
  silver: {
    bg: "from-gray-400/20 to-slate-500/20",
    border: "border-gray-400/40",
    text: "text-gray-300",
    glow: "shadow-gray-400/20",
  },
  gold: {
    bg: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    glow: "shadow-yellow-500/30",
  },
  platinum: {
    bg: "from-cyan-400/20 to-blue-500/20",
    border: "border-cyan-400/40",
    text: "text-cyan-300",
    glow: "shadow-cyan-400/30",
  },
};

function formatTimeRemaining(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  return `${hours}h remaining`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function QuestsPage() {
  const { profile: currentUser, isLoading: profileLoading } = useProfile();

  const [activeTab, setActiveTab] = useState<TabType>("quests");
  const [claimingQuest, setClaimingQuest] = useState<string | null>(null);
  const [refreshingQuest, setRefreshingQuest] = useState<string | null>(null);

  // Using mock data for now
  const quests = MOCK_QUESTS;
  const playerLevel = MOCK_PLAYER_LEVEL;
  const badges = MOCK_BADGES;
  const achievements = MOCK_ACHIEVEMENTS;

  const handleClaim = async (questRecordId: string) => {
    setClaimingQuest(questRecordId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setClaimingQuest(null);
  };

  const handleRefresh = async (questRecordId: string) => {
    setRefreshingQuest(questRecordId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshingQuest(null);
  };

  const dailyQuests = quests.filter((q) => q.questType === "daily");
  const weeklyQuests = quests.filter((q) => q.questType === "weekly");
  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const lockedBadges = badges.filter((b) => !b.isUnlocked);
  const unlockedAchievements = achievements.filter((a) => a.isUnlocked);
  const lockedAchievements = achievements.filter((a) => !a.isUnlocked);

  if (profileLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm uppercase tracking-widest font-bold">
            Loading Quests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/backgrounds/quests-bg.png')" }}
      />
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="absolute inset-0 bg-vignette z-0" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-8 h-8 text-purple-400" />
              <h1 className="text-3xl font-bold text-[#e8e0d5]">Progress</h1>
            </div>
            <p className="text-[#a89f94]">Complete quests, earn badges, and unlock achievements</p>
          </div>
        </div>

        {/* Player Level Card */}
        <div className="mb-8 p-6 rounded-xl bg-linear-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 tcg-chat-leather">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{playerLevel.currentLevel}</span>
              </div>
              <div>
                <p className="text-sm text-[#a89f94]">Player Level</p>
                <p className="text-xl font-semibold text-[#e8e0d5]">
                  Level {playerLevel.currentLevel}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#a89f94]">Total XP</p>
              <p className="text-xl font-semibold text-purple-400">
                {playerLevel.totalXp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#a89f94]">
                Progress to Level {playerLevel.currentLevel + 1}
              </span>
              <span className="text-purple-400">
                {playerLevel.xpInCurrentLevel.toLocaleString()} /{" "}
                {playerLevel.xpToNextLevel.toLocaleString()} XP
              </span>
            </div>
            <Progress value={playerLevel.progressPercent} className="h-3" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
          {[
            {
              id: "quests" as TabType,
              label: "Quests",
              icon: Target,
              count: quests.filter((q) => q.status !== "claimed").length,
            },
            {
              id: "badges" as TabType,
              label: "Badges",
              icon: Shield,
              count: unlockedBadges.length,
            },
            {
              id: "achievements" as TabType,
              label: "Achievements",
              icon: Trophy,
              count: unlockedAchievements.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
                  isActive
                    ? "bg-[#d4af37] text-[#1a1614]"
                    : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    isActive ? "bg-black/20 text-[#1a1614]" : "bg-white/10 text-[#a89f94]"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "quests" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Daily Quests */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-[#e8e0d5]">Daily Quests</h2>
                <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400">
                  Resets at midnight UTC
                </span>
              </div>
              <div className="space-y-4">
                {dailyQuests.length === 0 ? (
                  <div className="p-8 rounded-xl bg-white/5 border border-[#3d2b1f] text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-[#a89f94]/50" />
                    <p className="text-[#a89f94]">No daily quests available</p>
                    <p className="text-sm text-[#a89f94]/60">Check back tomorrow!</p>
                  </div>
                ) : (
                  dailyQuests.map((quest) => (
                    <QuestCard
                      key={quest.questRecordId}
                      quest={quest}
                      onClaim={() => handleClaim(quest.questRecordId)}
                      onRefresh={() => handleRefresh(quest.questRecordId)}
                      isClaiming={claimingQuest === quest.questRecordId}
                      isRefreshing={refreshingQuest === quest.questRecordId}
                      canRefresh
                    />
                  ))
                )}
              </div>
            </div>

            {/* Weekly Quests */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-[#e8e0d5]">Weekly Quests</h2>
                <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-400">
                  Resets Monday UTC
                </span>
              </div>
              <div className="space-y-4">
                {weeklyQuests.length === 0 ? (
                  <div className="p-8 rounded-xl bg-white/5 border border-[#3d2b1f] text-center">
                    <Target className="w-12 h-12 mx-auto mb-3 text-[#a89f94]/50" />
                    <p className="text-[#a89f94]">No weekly quests available</p>
                    <p className="text-sm text-[#a89f94]/60">Check back next week!</p>
                  </div>
                ) : (
                  weeklyQuests.map((quest) => (
                    <QuestCard
                      key={quest.questRecordId}
                      quest={quest}
                      onClaim={() => handleClaim(quest.questRecordId)}
                      isClaiming={claimingQuest === quest.questRecordId}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "badges" && (
          <div className="space-y-8">
            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-[#d4af37]" />
                  <h2 className="text-xl font-semibold text-[#e8e0d5]">Earned Badges</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[#d4af37]/30 text-[#d4af37]">
                    {unlockedBadges.length} unlocked
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unlockedBadges.map((badge) => (
                    <BadgeCard key={badge.badgeId} badge={badge} />
                  ))}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {lockedBadges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-[#a89f94]" />
                  <h2 className="text-xl font-semibold text-[#e8e0d5]">Locked Badges</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[#3d2b1f] text-[#a89f94]">
                    {lockedBadges.length} remaining
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {lockedBadges.map((badge) => (
                    <BadgeCard key={badge.badgeId} badge={badge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="space-y-8">
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-semibold text-[#e8e0d5]">Completed</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-500/30 text-yellow-400">
                    {unlockedAchievements.length} unlocked
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {unlockedAchievements.map((achievement) => (
                    <AchievementCard key={achievement.achievementId} achievement={achievement} />
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Achievements */}
            {lockedAchievements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-[#a89f94]" />
                  <h2 className="text-xl font-semibold text-[#e8e0d5]">In Progress</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-[#3d2b1f] text-[#a89f94]">
                    {lockedAchievements.length} remaining
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {lockedAchievements.map((achievement) => (
                    <AchievementCard key={achievement.achievementId} achievement={achievement} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Badge Card Component
function BadgeCard({ badge }: { badge: Badge }) {
  const Icon = badgeIcons[badge.icon] || Star;
  const colors = rarityColors[badge.rarity];

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border bg-linear-to-br transition-all",
        colors.bg,
        colors.border,
        badge.isUnlocked ? `shadow-lg ${colors.glow}` : "opacity-60 grayscale"
      )}
    >
      {/* Rarity Badge */}
      <div
        className={cn(
          "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
          colors.text,
          "bg-black/30"
        )}
      >
        {badge.rarity}
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            badge.isUnlocked ? "bg-white/10" : "bg-black/30"
          )}
        >
          {badge.isUnlocked ? (
            <Icon className={cn("w-6 h-6", colors.text)} />
          ) : (
            <Lock className="w-5 h-5 text-[#a89f94]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "font-bold truncate",
              badge.isUnlocked ? "text-[#e8e0d5]" : "text-[#a89f94]"
            )}
          >
            {badge.name}
          </h3>
          <p className="text-xs text-[#a89f94] line-clamp-2 mt-1">{badge.description}</p>
          {badge.isUnlocked && badge.unlockedAt && (
            <p className="text-[10px] text-[#a89f94]/60 mt-2">
              Earned {formatTimeAgo(badge.unlockedAt)}
            </p>
          )}
          {!badge.isUnlocked && (
            <p className="text-[10px] text-[#a89f94]/60 mt-2 line-clamp-1">{badge.requirement}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Achievement Card Component
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const progress =
    achievement.progress && achievement.target
      ? Math.min((achievement.progress / achievement.target) * 100, 100)
      : 0;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all",
        achievement.isUnlocked
          ? "bg-linear-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
          : "bg-black/20 border-[#3d2b1f]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
            achievement.isUnlocked ? "bg-yellow-500/20" : "bg-black/30"
          )}
        >
          {achievement.isUnlocked ? (
            <Trophy className="w-6 h-6 text-yellow-400" />
          ) : (
            <Trophy className="w-6 h-6 text-[#a89f94]/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                className={cn(
                  "font-bold",
                  achievement.isUnlocked ? "text-[#e8e0d5]" : "text-[#a89f94]"
                )}
              >
                {achievement.name}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-[#a89f94] uppercase tracking-wider">
                {achievement.category}
              </span>
            </div>
            {achievement.isUnlocked && <Check className="w-5 h-5 text-green-400 shrink-0" />}
          </div>
          <p className="text-sm text-[#a89f94] mt-2">{achievement.description}</p>

          {/* Progress Bar (for locked achievements with progress) */}
          {!achievement.isUnlocked && achievement.progress !== undefined && achievement.target && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#a89f94]">Progress</span>
                <span className="text-[#e8e0d5]">
                  {achievement.progress} / {achievement.target}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-purple-500 to-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Rewards */}
          {(achievement.rewardGold || achievement.rewardXp) && (
            <div className="flex items-center gap-3 mt-3">
              {achievement.rewardGold && (
                <div className="flex items-center gap-1 text-xs">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className={achievement.isUnlocked ? "text-yellow-400" : "text-[#a89f94]"}>
                    {achievement.rewardGold}
                  </span>
                </div>
              )}
              {achievement.rewardXp && (
                <div className="flex items-center gap-1 text-xs">
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span className={achievement.isUnlocked ? "text-blue-400" : "text-[#a89f94]"}>
                    {achievement.rewardXp} XP
                  </span>
                </div>
              )}
            </div>
          )}

          {achievement.isUnlocked && achievement.unlockedAt && (
            <p className="text-[10px] text-[#a89f94]/60 mt-2">
              Unlocked {formatTimeAgo(achievement.unlockedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuestCardProps {
  quest: Quest;
  onClaim: () => void;
  onRefresh?: () => void;
  isClaiming: boolean;
  isRefreshing?: boolean;
  canRefresh?: boolean;
}

function QuestCard({
  quest,
  onClaim,
  onRefresh,
  isClaiming,
  isRefreshing,
  canRefresh,
}: QuestCardProps) {
  const ReqIcon = requirementIcons[quest.requirementType] || Target;
  const colorClass = questTypeColors[quest.questType];
  const progress = Math.min((quest.currentProgress / quest.targetValue) * 100, 100);
  const isCompleted = quest.status === "completed";

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-linear-to-br transition-all tcg-chat-leather",
        colorClass,
        isCompleted && "ring-2 ring-green-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-white/10">
            <ReqIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#e8e0d5]">{quest.name}</h3>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                  <Check className="w-3 h-3" />
                  Ready to claim
                </span>
              )}
            </div>
            <p className="text-sm text-[#a89f94] mt-1">{quest.description}</p>

            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#a89f94]">Progress</span>
                <span className="text-[#e8e0d5]">
                  {quest.currentProgress.toLocaleString()} / {quest.targetValue.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    isCompleted ? "bg-green-500" : "bg-linear-to-r from-purple-500 to-indigo-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {quest.rewardGold > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{quest.rewardGold}</span>
                </div>
              )}
              {quest.rewardXp > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400">{quest.rewardXp} XP</span>
                </div>
              )}
            </div>

            <p className="text-xs text-[#a89f94]/60 mt-2">{formatTimeRemaining(quest.expiresAt)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isCompleted ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={isClaiming}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm flex items-center gap-1 transition-all disabled:opacity-50"
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  Claim
                </>
              )}
            </button>
          ) : canRefresh && quest.questType === "daily" ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-lg border border-white/20 text-[#a89f94] hover:text-white hover:border-white/40 text-sm flex items-center gap-1 transition-all disabled:opacity-50"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-xs">50</span>
                  <Coins className="w-3 h-3 text-yellow-400" />
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
