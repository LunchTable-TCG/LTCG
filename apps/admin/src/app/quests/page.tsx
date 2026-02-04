"use client";

/**
 * Quests & Achievements Management Page
 *
 * Browse and manage quest definitions and achievements.
 */

import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { AchievementId, QuestId } from "@/lib/convexTypes";
import type { Id } from "@convex/_generated/dataModel";
import { Badge, Card, Text, Title } from "@tremor/react";
import {
  CalendarIcon,
  Clock3Icon,
  PlusIcon,
  SearchIcon,
  TargetIcon,
  TrophyIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type QuestType = "daily" | "weekly" | "achievement";
type AchievementCategory =
  | "wins"
  | "games_played"
  | "collection"
  | "social"
  | "story"
  | "ranked"
  | "special";
type BadgeColor = "amber" | "violet" | "blue" | "emerald" | "rose" | "indigo" | "gray" | "slate";
type Rarity = "common" | "rare" | "epic" | "legendary";

interface Quest {
  _id: Id<"questDefinitions">;
  questId: string;
  name: string;
  questType: QuestType;
  isActive: boolean;
  requirementType: string;
  targetValue: number;
  rewards: {
    gold: number;
    xp: number;
    gems?: number;
  };
}

interface Achievement {
  _id: Id<"achievementDefinitions">;
  achievementId: string;
  name: string;
  icon: string;
  category: AchievementCategory;
  rarity: Rarity;
  isActive: boolean;
  requirementType: string;
  targetValue: number;
  isSecret: boolean;
}

const QUEST_TYPE_CONFIG: Record<
  QuestType,
  { label: string; color: BadgeColor; icon: React.ReactNode }
> = {
  daily: { label: "Daily", color: "blue", icon: <CalendarIcon className="h-4 w-4" /> },
  weekly: { label: "Weekly", color: "violet", icon: <Clock3Icon className="h-4 w-4" /> },
  achievement: { label: "Achievement", color: "amber", icon: <TrophyIcon className="h-4 w-4" /> },
};

const ACHIEVEMENT_CATEGORIES: { value: AchievementCategory; label: string }[] = [
  { value: "wins", label: "Wins" },
  { value: "games_played", label: "Games Played" },
  { value: "collection", label: "Collection" },
  { value: "social", label: "Social" },
  { value: "story", label: "Story" },
  { value: "ranked", label: "Ranked" },
  { value: "special", label: "Special" },
];

const RARITY_COLORS: Record<Rarity, BadgeColor> = {
  common: "gray",
  rare: "blue",
  epic: "violet",
  legendary: "amber",
};

// =============================================================================
// Quest List Component
// =============================================================================

function QuestList() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  const questsResult = useConvexQuery(typedApi.admin.quests.listQuests, {
    search: search || undefined,
    questType: typeFilter !== "all" ? (typeFilter as QuestType) : undefined,
    includeInactive: showInactive,
  });

  const questStats = useConvexQuery(typedApi.admin.quests.getQuestStats, {});
  const toggleActive = useConvexMutation(typedApi.admin.quests.toggleQuestActive);

  const handleToggleActive = async (questDbId: QuestId, _name: string) => {
    try {
      const result = (await toggleActive({ questDbId })) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle quest status");
    }
  };

  const isLoading = questsResult === undefined;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{questStats?.totalQuests ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Quests</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-blue-500">
              {questStats?.byType?.daily ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Daily</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-violet-500">
              {questStats?.byType?.weekly ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Weekly</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">
              {questStats?.byType?.achievement ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Achievement</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">
              {questStats?.completedToday ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Completed Today</Text>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Text className="text-sm text-muted-foreground mb-1">Search</Text>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Type</Text>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="achievement">Achievement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Text className="text-sm">Show Inactive</Text>
          </div>
        </div>
      </Card>

      {/* Quest List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Quests ({questsResult?.totalCount ?? 0})</Title>
          <RoleGuard permission="config.edit">
            <Button asChild>
              <Link href="/quests/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                New Quest
              </Link>
            </Button>
          </RoleGuard>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : questsResult?.quests.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No quests found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3">Quest</th>
                  <th className="text-left py-3 px-3">Type</th>
                  <th className="text-left py-3 px-3">Requirement</th>
                  <th className="text-left py-3 px-3">Rewards</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(questsResult?.quests as unknown as Quest[])?.map((quest) => {
                  const typeConfig = QUEST_TYPE_CONFIG[quest.questType as QuestType];
                  return (
                    <tr
                      key={quest._id}
                      className={`border-b hover:bg-muted/30 ${!quest.isActive ? "opacity-50" : ""}`}
                    >
                      <td className="py-3 px-3">
                        <Link
                          href={`/quests/${quest._id}`}
                          className="font-medium hover:underline text-primary"
                        >
                          {quest.name}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {quest.questId}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge color={typeConfig.color} size="sm">
                          <span className="flex items-center gap-1">
                            {typeConfig.icon}
                            {typeConfig.label}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {quest.requirementType}: {quest.targetValue}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs space-y-0.5">
                          {quest.rewards.gold > 0 && <div>{quest.rewards.gold} Gold</div>}
                          {quest.rewards.xp > 0 && <div>{quest.rewards.xp} XP</div>}
                          {quest.rewards.gems && quest.rewards.gems > 0 && (
                            <div>{quest.rewards.gems} Gems</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge color={quest.isActive ? "emerald" : "gray"} size="sm">
                          {quest.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/quests/${quest._id}`}>Edit</Link>
                          </Button>
                          <RoleGuard permission="config.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(quest._id, quest.name)}
                            >
                              {quest.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// Achievement List Component
// =============================================================================

function AchievementList() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  const achievementsResult = useConvexQuery(typedApi.admin.achievements.listAchievements, {
    search: search || undefined,
    category: categoryFilter !== "all" ? (categoryFilter as AchievementCategory) : undefined,
    rarity: rarityFilter !== "all" ? (rarityFilter as Rarity) : undefined,
    includeInactive: showInactive,
  });

  const achievementStats = useConvexQuery(typedApi.admin.achievements.getAchievementStats, {});
  const toggleActive = useConvexMutation(typedApi.admin.achievements.toggleAchievementActive);

  const handleToggleActive = async (achievementDbId: AchievementId, _name: string) => {
    try {
      const result = (await toggleActive({ achievementDbId })) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle achievement status");
    }
  };

  const isLoading = achievementsResult === undefined;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">
              {achievementStats?.totalAchievements ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Total</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-gray-500">
              {achievementStats?.byRarity?.common ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Common</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-blue-500">
              {achievementStats?.byRarity?.rare ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Rare</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-violet-500">
              {achievementStats?.byRarity?.epic ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Epic</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">
              {achievementStats?.byRarity?.legendary ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Legendary</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">
              {achievementStats?.totalUnlocks ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Total Unlocks</Text>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Text className="text-sm text-muted-foreground mb-1">Search</Text>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Category</Text>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ACHIEVEMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[150px]">
            <Text className="text-sm text-muted-foreground mb-1">Rarity</Text>
            <Select value={rarityFilter} onValueChange={setRarityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rarities</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <Text className="text-sm">Show Inactive</Text>
          </div>
        </div>
      </Card>

      {/* Achievement List */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Title>Achievements ({achievementsResult?.totalCount ?? 0})</Title>
          <RoleGuard permission="config.edit">
            <Button asChild>
              <Link href="/quests/achievement/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                New Achievement
              </Link>
            </Button>
          </RoleGuard>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : achievementsResult?.achievements.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No achievements found matching your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-3">Achievement</th>
                  <th className="text-left py-3 px-3">Category</th>
                  <th className="text-left py-3 px-3">Rarity</th>
                  <th className="text-left py-3 px-3">Requirement</th>
                  <th className="text-center py-3 px-3">Secret</th>
                  <th className="text-center py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(achievementsResult?.achievements as unknown as Achievement[])?.map((achievement) => (
                  <tr
                    key={achievement._id}
                    className={`border-b hover:bg-muted/30 ${!achievement.isActive ? "opacity-50" : ""}`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{achievement.icon}</span>
                        <div>
                          <Link
                            href={`/quests/achievement/${achievement._id}`}
                            className="font-medium hover:underline text-primary"
                          >
                            {achievement.name}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">
                            {achievement.achievementId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 capitalize">{achievement.category}</td>
                    <td className="py-3 px-3">
                      <Badge color={RARITY_COLORS[achievement.rarity]} size="sm">
                        {achievement.rarity}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {achievement.requirementType}: {achievement.targetValue}
                    </td>
                    <td className="py-3 px-3 text-center">{achievement.isSecret ? "🔒" : "-"}</td>
                    <td className="py-3 px-3 text-center">
                      <Badge color={achievement.isActive ? "emerald" : "gray"} size="sm">
                        {achievement.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/quests/achievement/${achievement._id}`}>Edit</Link>
                        </Button>
                        <RoleGuard permission="config.edit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(achievement._id, achievement.name)}
                          >
                            {achievement.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </RoleGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function QuestsPage() {
  return (
    <PageWrapper
      title="Quests & Achievements"
      description="Manage quest definitions and achievements"
    >
      <Tabs defaultValue="quests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quests" className="flex items-center gap-2">
            <TargetIcon className="h-4 w-4" />
            Quests
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <TrophyIcon className="h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quests">
          <QuestList />
        </TabsContent>

        <TabsContent value="achievements">
          <AchievementList />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
