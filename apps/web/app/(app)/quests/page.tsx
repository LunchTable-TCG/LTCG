"use client";

import { Progress } from "@/components/ui/progress";
import { useAchievements, useProfile, useQuests } from "@/hooks";
import { cn } from "@/lib/utils";
import { Award, CheckCircle2, Clock, Gift, Loader2, Sparkles, Star, Trophy } from "lucide-react";
import { useState } from "react";

export default function QuestsPage() {
  const { profile, isLoading } = useProfile();
  const {
    quests,
    activeQuests,
    completedQuests,
    claimQuestReward,
    isLoading: questsLoading,
  } = useQuests();
  const {
    achievements,
    unlockedAchievements,
    completionPercent,
    isLoading: achievementsLoading,
  } = useAchievements();

  const [activeTab, setActiveTab] = useState<"quests" | "achievements">("quests");

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
      </div>
    );
  }

  // Calculate XP progress
  const xpInLevel = (profile.xp ?? 0) % 1000;
  const xpToNext = 1000;
  const progressPercent = (xpInLevel / xpToNext) * 100;

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-yellow-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[#d4af37]" />
            <h1 className="text-3xl font-bold text-[#e8e0d5]">Quests & Achievements</h1>
          </div>
          <p className="text-[#a89f94]">Track your progress and earn rewards</p>
        </div>

        {/* Level Progress */}
        <div className="mb-8 p-6 rounded-xl bg-black/40 border border-[#3d2b1f]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[#e8e0d5]">
                Level {profile.level ?? 1}
              </h2>
              <p className="text-sm text-[#a89f94]">
                {xpInLevel.toLocaleString()} / {xpToNext.toLocaleString()} XP
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-[#d4af37]" />
              <span className="text-xl font-bold text-[#d4af37]">
                {(profile.xp ?? 0).toLocaleString()} Total XP
              </span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3 bg-black/50" />
          <p className="text-xs text-[#a89f94] mt-2 text-right">
            {Math.ceil((xpToNext - xpInLevel) / 100)} more wins to level up
          </p>
        </div>

        {/* Player Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-linear-to-br from-green-500/10 to-green-600/5 border border-green-500/30">
            <Trophy className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-2xl font-black text-[#e8e0d5]">{profile.totalWins || 0}</p>
            <p className="text-xs text-[#a89f94]">Total Wins</p>
          </div>
          <div className="p-4 rounded-xl bg-linear-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30">
            <Award className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-2xl font-black text-[#e8e0d5]">
              {(profile.totalWins || 0) + (profile.totalLosses || 0)}
            </p>
            <p className="text-xs text-[#a89f94]">Games Played</p>
          </div>
          <div className="p-4 rounded-xl bg-linear-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30">
            <Sparkles className="w-8 h-8 text-purple-400 mb-2" />
            <p className="text-2xl font-black text-[#e8e0d5]">
              {profile.rankedElo || 1000}
            </p>
            <p className="text-xs text-[#a89f94]">Ranked ELO</p>
          </div>
          <div className="p-4 rounded-xl bg-linear-to-br from-[#d4af37]/10 to-[#d4af37]/5 border border-[#d4af37]/30">
            <Star className="w-8 h-8 text-[#d4af37] mb-2" />
            <p className="text-2xl font-black text-[#e8e0d5]">
              {(profile.totalWins || 0) > 0
                ? Math.round(
                    ((profile.totalWins || 0) /
                      ((profile.totalWins || 0) + (profile.totalLosses || 0))) *
                      100
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-[#a89f94]">Win Rate</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("quests")}
            className={cn(
              "flex-1 py-3 px-6 rounded-lg font-bold transition-all",
              activeTab === "quests"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "bg-black/40 text-[#a89f94] border border-[#3d2b1f] hover:border-[#d4af37]/50"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" />
              <span>Quests</span>
              {activeQuests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                  {activeQuests.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={cn(
              "flex-1 py-3 px-6 rounded-lg font-bold transition-all",
              activeTab === "achievements"
                ? "bg-[#d4af37] text-[#1a1614]"
                : "bg-black/40 text-[#a89f94] border border-[#3d2b1f] hover:border-[#d4af37]/50"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Award className="w-5 h-5" />
              <span>Achievements</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                {unlockedAchievements.length}/{achievements.length}
              </span>
            </div>
          </button>
        </div>

        {/* Quests Tab */}
        {activeTab === "quests" && (
          <div className="space-y-4">
            {questsLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin mx-auto" />
              </div>
            ) : quests.length === 0 ? (
              <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
                <Trophy className="w-16 h-16 text-[#a89f94]/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#e8e0d5] mb-2">No Active Quests</h3>
                <p className="text-[#a89f94]">
                  New daily quests will appear soon. Check back later!
                </p>
              </div>
            ) : (
              <>
                {/* Active Quests */}
                {activeQuests.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#e8e0d5]">Active Quests</h3>
                    {activeQuests.map((quest: (typeof activeQuests)[number]) => {
                      const progress = Math.min(
                        (quest.currentProgress / quest.targetValue) * 100,
                        100
                      );
                      const isExpiring = quest.expiresAt && quest.expiresAt - Date.now() < 3600000; // 1 hour

                      return (
                        <div
                          key={quest.questRecordId}
                          className="p-4 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/30 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-[#e8e0d5] font-bold">{quest.name}</h4>
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                                    quest.questType === "daily"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : quest.questType === "weekly"
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-[#d4af37]/20 text-[#d4af37]"
                                  )}
                                >
                                  {quest.questType}
                                </span>
                              </div>
                              <p className="text-sm text-[#a89f94] mb-3">{quest.description}</p>

                              {/* Progress Bar */}
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1 text-xs">
                                  <span className="text-[#a89f94]">Progress</span>
                                  <span className="text-[#e8e0d5] font-bold">
                                    {quest.currentProgress} / {quest.targetValue}
                                  </span>
                                </div>
                                <Progress value={progress} className="h-2 bg-black/50" />
                              </div>

                              {/* Timer */}
                              {quest.expiresAt && quest.expiresAt > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Clock className="w-3 h-3" />
                                  <span
                                    className={cn(isExpiring ? "text-red-400" : "text-[#a89f94]")}
                                  >
                                    Expires in{" "}
                                    {Math.floor((quest.expiresAt - Date.now()) / 3600000)}h{" "}
                                    {Math.floor(((quest.expiresAt - Date.now()) % 3600000) / 60000)}
                                    m
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Rewards */}
                            <div className="ml-4 text-right">
                              <div className="flex flex-col gap-1 text-sm">
                                {quest.rewardGold > 0 && (
                                  <div className="flex items-center gap-1 text-[#d4af37]">
                                    <span className="font-bold">{quest.rewardGold}</span>
                                    <span>Gold</span>
                                  </div>
                                )}
                                {quest.rewardXp > 0 && (
                                  <div className="flex items-center gap-1 text-purple-400">
                                    <span className="font-bold">{quest.rewardXp}</span>
                                    <span>XP</span>
                                  </div>
                                )}
                                {quest.rewardGems && quest.rewardGems > 0 && (
                                  <div className="flex items-center gap-1 text-blue-400">
                                    <span className="font-bold">{quest.rewardGems}</span>
                                    <span>Gems</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Completed Quests */}
                {completedQuests.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[#e8e0d5]">Completed Quests</h3>
                    {completedQuests.map((quest: (typeof completedQuests)[number]) => (
                      <div
                        key={quest.questRecordId}
                        className="p-4 rounded-xl bg-green-500/10 border border-green-500/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                              <h4 className="text-[#e8e0d5] font-bold">{quest.name}</h4>
                            </div>
                            <p className="text-sm text-[#a89f94]">{quest.description}</p>
                          </div>

                          <button
                            onClick={() => claimQuestReward(quest.questRecordId)}
                            className="ml-4 px-4 py-2 rounded-lg bg-[#d4af37] hover:bg-[#f9e29f] text-[#1a1614] font-bold transition-all flex items-center gap-2"
                          >
                            <Gift className="w-4 h-4" />
                            Claim Rewards
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (
          <div className="space-y-4">
            {achievementsLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin mx-auto" />
              </div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
                <Award className="w-16 h-16 text-[#a89f94]/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#e8e0d5] mb-2">No Achievements Yet</h3>
                <p className="text-[#a89f94]">Start playing to unlock achievements!</p>
              </div>
            ) : (
              <>
                {/* Completion Stats */}
                <div className="p-4 rounded-xl bg-black/40 border border-[#3d2b1f] mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-[#e8e0d5]">Overall Progress</h3>
                    <div className="text-2xl font-bold text-[#d4af37]">{completionPercent}%</div>
                  </div>
                  <Progress value={completionPercent} className="h-3 bg-black/50" />
                  <p className="text-sm text-[#a89f94] mt-2">
                    {unlockedAchievements.length} of {achievements.length} achievements unlocked
                  </p>
                </div>

                {/* Achievement List */}
                <div className="grid gap-4 md:grid-cols-2">
                  {achievements.map((achievement: (typeof achievements)[number]) => {
                    const progress = Math.min(
                      (achievement.currentProgress / achievement.targetValue) * 100,
                      100
                    );

                    return (
                      <div
                        key={achievement.achievementId}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          achievement.isUnlocked
                            ? "bg-[#d4af37]/10 border-[#d4af37]/30"
                            : "bg-black/40 border-[#3d2b1f] opacity-70"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div
                            className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center",
                              achievement.isUnlocked ? "bg-[#d4af37]/20" : "bg-black/30"
                            )}
                          >
                            {achievement.isUnlocked ? (
                              <Trophy className="w-6 h-6 text-[#d4af37]" />
                            ) : (
                              <Trophy className="w-6 h-6 text-[#a89f94]/50" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-[#e8e0d5] font-bold">{achievement.name}</h4>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                                  achievement.rarity === "common"
                                    ? "bg-gray-500/20 text-gray-400"
                                    : achievement.rarity === "rare"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : achievement.rarity === "epic"
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-[#d4af37]/20 text-[#d4af37]"
                                )}
                              >
                                {achievement.rarity}
                              </span>
                            </div>
                            <p className="text-sm text-[#a89f94] mb-2">{achievement.description}</p>

                            {/* Progress */}
                            {!achievement.isUnlocked && (
                              <div className="mb-2">
                                <div className="flex items-center justify-between mb-1 text-xs">
                                  <span className="text-[#a89f94]">Progress</span>
                                  <span className="text-[#e8e0d5] font-bold">
                                    {achievement.currentProgress} / {achievement.targetValue}
                                  </span>
                                </div>
                                <Progress value={progress} className="h-1.5 bg-black/50" />
                              </div>
                            )}

                            {/* Rewards */}
                            {achievement.rewards && (
                              <div className="flex items-center gap-3 text-xs">
                                {achievement.rewards.gold && (
                                  <span className="text-[#d4af37]">
                                    +{achievement.rewards.gold} Gold
                                  </span>
                                )}
                                {achievement.rewards.xp && (
                                  <span className="text-purple-400">
                                    +{achievement.rewards.xp} XP
                                  </span>
                                )}
                                {achievement.rewards.gems && (
                                  <span className="text-blue-400">
                                    +{achievement.rewards.gems} Gems
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Unlocked Status */}
                            {achievement.isUnlocked && achievement.unlockedAt && (
                              <div className="flex items-center gap-1 text-xs text-green-400 mt-2">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>
                                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
