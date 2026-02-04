"use client";

/**
 * Player Detail Page
 *
 * Full player profile with stats, moderation history, and action buttons.
 */

import { PageWrapper } from "@/components/layout";
import {
  ModerationActions,
  ModerationTimeline,
  PlayerStatsDisplay,
  PlayerStatus,
  WinLossChart,
} from "@/components/players";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { api, useMutation, useQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Flex, Text, Title } from "@tremor/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface EngagementData {
  metrics: {
    totalGames: number;
    daysActive: number;
    wins: number;
    losses: number;
    avgSessionMinutes?: number;
  };
}

interface ModerationStatus {
  isBanned: boolean;
  isSuspended: boolean;
  warningCount: number;
  banReason?: string;
  bannedAt?: number;
  suspendedUntil?: number;
  suspensionReason?: string;
}

interface PlayerProfile {
  _id: string;
  name: string;
  type: "human" | "ai";
  eloRating: number;
  seasonRating?: number;
  peakRating: number;
  rank: number;
  percentile: number;
  createdAt: number;
  lastActiveAt: number;
  aiDifficulty?: string;
  aiPersonality?: string;
  seasonId?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    currentStreak?: number;
    totalScore: number;
  };
}

interface PlayerInventory {
  gold: number;
  totalCards: number;
  uniqueCards: number;
  byRarity: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  cards: Array<{
    playerCardId: string;
    cardDefinitionId: string;
    name: string;
    rarity: string;
    archetype: string;
    cardType: string;
    attack: number | null;
    defense: number | null;
    cost: number;
    quantity: number;
    isFavorite: boolean;
    acquiredAt: number;
    imageUrl?: string;
  }>;
}

interface ModerationHistoryEntry {
  _id: string;
  action: string;
  reason?: string;
  timestamp?: number;
  createdAt?: number;
}

// =============================================================================
// Component
// =============================================================================

export default function PlayerDetailPage() {
  const params = useParams<{ playerId: string }>();
  const router = useRouter();
  const playerId = params.playerId as Id<"users">;

  // State
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch player data
  const profile = useQuery(api.admin.admin.getPlayerProfile, { playerId }) as
    | PlayerProfile
    | undefined;
  const moderationStatus = useQuery(api.admin.moderation.getPlayerModerationStatus, {
    playerId,
  }) as ModerationStatus | undefined;
  const moderationHistory = useQuery(api.admin.moderation.getModerationHistory, {
    playerId,
    limit: 20,
  }) as ModerationHistoryEntry[] | undefined;
  // Fetch player engagement data
  const engagementData = useQuery(api.admin.analytics.getPlayerEngagement, {
    userId: playerId,
    days: 30,
  }) as EngagementData | undefined;
  // Fetch player inventory
  const inventory = useQuery(api.admin.admin.getPlayerInventory, { playerId }) as
    | PlayerInventory
    | undefined;

  // Transform engagement data to match expected format
  const engagement = engagementData
    ? {
        totals: {
          gamesPlayed: engagementData.metrics.totalGames,
          daysActive: engagementData.metrics.daysActive,
          avgSessionLength: 0,
          totalSessions: engagementData.metrics.daysActive,
          totalSessionTime: 0,
          totalGamesPlayed: engagementData.metrics.totalGames,
          totalGamesWon: 0,
          totalCardsPlayed: 0,
          totalPacksOpened: 0,
        },
        metrics: engagementData.metrics,
        currentStreak: 0,
        dailyData: [], // TODO: Backend doesn't provide daily breakdown yet
      }
    : undefined;

  // Mutations
  const updateUsernameMutation = useMutation(api.core.users.adminUpdateUsername);
  const addModerationNote = useMutation(api.admin.moderation.addModerationNote);

  const updatePlayerName = async (newName: string) => {
    await updateUsernameMutation({ userId: playerId, newUsername: newName });
  };

  const isLoading = profile === undefined;
  const isBanned = moderationStatus?.isBanned ?? false;
  const isSuspended = moderationStatus?.isSuspended ?? false;

  // Format dates
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handlers
  const handleOpenEditName = () => {
    setEditName(profile?.name ?? "");
    setEditNameOpen(true);
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsUpdating(true);
    try {
      await updatePlayerName(editName.trim());
      toast.success("Player name updated");
      setEditNameOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update name");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    setIsUpdating(true);
    try {
      await addModerationNote({
        playerId,
        note: noteText.trim(),
      });
      toast.success("Note added");
      setAddNoteOpen(false);
      setNoteText("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add note");
    } finally {
      setIsUpdating(false);
    }
  };

  if (profile === null) {
    return (
      <PageWrapper
        title="Player Not Found"
        description="The requested player could not be found"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
        }
      >
        <Card>
          <div className="text-center py-8">
            <Text>This player does not exist or has been deleted.</Text>
            <Button className="mt-4" onClick={() => router.push("/players")}>
              View All Players
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isLoading ? "Loading..." : profile.name}
      description={isLoading ? "" : "Player profile and moderation tools"}
      actions={
        <Button variant="outline" onClick={() => router.back()}>
          ← Back to Players
        </Button>
      }
    >
      {/* Header Card with Player Info */}
      <Card className="mb-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-96" />
          </div>
        ) : (
          <>
            <Flex justifyContent="between" alignItems="start">
              <div>
                <div className="flex items-center gap-2">
                  <Title className="text-2xl">{profile.name}</Title>
                  <RoleGuard permission="player.edit">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={handleOpenEditName}
                    >
                      Edit
                    </Button>
                  </RoleGuard>
                </div>
                <div className="mt-2">
                  <PlayerStatus
                    type={profile.type}
                    isBanned={isBanned}
                    isSuspended={isSuspended}
                    warningCount={moderationStatus?.warningCount}
                    rating={profile.eloRating}
                  />
                </div>
                <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                  <p>
                    <strong>Rank:</strong> #{profile.rank} (Top {profile.percentile}%)
                  </p>
                  <p>
                    <strong>Member since:</strong> {formatDate(profile.createdAt)}
                  </p>
                  <p>
                    <strong>Last active:</strong> {formatDate(profile.lastActiveAt)}
                  </p>
                  {profile.type === "ai" && profile.aiDifficulty && (
                    <p>
                      <strong>AI Difficulty:</strong> {profile.aiDifficulty}
                      {profile.aiPersonality && ` • ${profile.aiPersonality}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <RoleGuard permission="player.warn">
                  <ModerationActions
                    playerId={playerId}
                    playerName={profile.name}
                    isBanned={isBanned}
                    isSuspended={isSuspended}
                  />
                </RoleGuard>
              </div>
            </Flex>

            {/* Ban/Suspension Alert */}
            {isBanned && moderationStatus && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <Text className="text-red-500 font-medium">
                  🚫 This player is permanently banned
                </Text>
                {moderationStatus.banReason && (
                  <Text className="text-sm text-muted-foreground mt-1">
                    Reason: {moderationStatus.banReason}
                  </Text>
                )}
                {moderationStatus.bannedAt && (
                  <Text className="text-xs text-muted-foreground">
                    Banned on: {formatDate(moderationStatus.bannedAt)}
                  </Text>
                )}
              </div>
            )}

            {isSuspended && moderationStatus?.suspendedUntil && (
              <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/50 rounded-lg">
                <Text className="text-orange-500 font-medium">⏸️ This player is suspended</Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  Until: {formatDate(moderationStatus.suspendedUntil)}
                </Text>
                {moderationStatus.suspensionReason && (
                  <Text className="text-sm text-muted-foreground">
                    Reason: {moderationStatus.suspensionReason}
                  </Text>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Stats Cards */}
      {!isLoading && profile && (
        <PlayerStatsDisplay
          stats={profile.stats}
          eloRating={profile.eloRating}
          seasonRating={profile.seasonRating}
          isLoading={isLoading}
        />
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="moderation">Moderation History</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <Title>Win/Loss Ratio</Title>
              {isLoading ? (
                <Skeleton className="h-48 w-full mt-4" />
              ) : (
                <WinLossChart
                  gamesWon={profile.stats.gamesWon}
                  gamesPlayed={profile.stats.gamesPlayed}
                />
              )}
            </Card>

            <Card>
              <Title>Player Information</Title>
              {isLoading ? (
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <Text className="text-muted-foreground">Player ID</Text>
                    <code className="text-sm">{profile._id}</code>
                  </div>
                  <div className="flex justify-between">
                    <Text className="text-muted-foreground">Type</Text>
                    <Text>{profile.type === "human" ? "Human Player" : "AI Player"}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text className="text-muted-foreground">Peak Rating</Text>
                    <Text>{profile.peakRating}</Text>
                  </div>
                  {profile.seasonId && (
                    <div className="flex justify-between">
                      <Text className="text-muted-foreground">Current Season</Text>
                      <Text>{profile.seasonId}</Text>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Summary Cards */}
            <Card>
              <div className="p-4 text-center">
                <Text className="text-3xl font-bold text-amber-500">
                  {inventory?.gold?.toLocaleString() ?? "..."}
                </Text>
                <Text className="text-sm text-muted-foreground">Gold</Text>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <Text className="text-3xl font-bold text-blue-500">
                  {inventory?.totalCards ?? "..."}
                </Text>
                <Text className="text-sm text-muted-foreground">Total Cards</Text>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <Text className="text-3xl font-bold text-emerald-500">
                  {inventory?.uniqueCards ?? "..."}
                </Text>
                <Text className="text-sm text-muted-foreground">Unique Cards</Text>
              </div>
            </Card>
            <Card>
              <div className="p-4 text-center">
                <Text className="text-3xl font-bold text-violet-500">
                  {inventory?.byRarity?.legendary ?? "..."}
                </Text>
                <Text className="text-sm text-muted-foreground">Legendary</Text>
              </div>
            </Card>
          </div>

          {/* Rarity Breakdown */}
          {inventory && (
            <Card className="mt-6">
              <Title>Card Rarity Breakdown</Title>
              <div className="mt-4 flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <span className="text-amber-500 font-medium">{inventory.byRarity.legendary}</span>
                  <span className="text-sm text-muted-foreground">Legendary</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <span className="text-purple-500 font-medium">{inventory.byRarity.epic}</span>
                  <span className="text-sm text-muted-foreground">Epic</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-blue-500 font-medium">{inventory.byRarity.rare}</span>
                  <span className="text-sm text-muted-foreground">Rare</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-emerald-500 font-medium">
                    {inventory.byRarity.uncommon}
                  </span>
                  <span className="text-sm text-muted-foreground">Uncommon</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/30">
                  <span className="text-gray-400 font-medium">{inventory.byRarity.common}</span>
                  <span className="text-sm text-muted-foreground">Common</span>
                </div>
              </div>
            </Card>
          )}

          {/* Card List */}
          <Card className="mt-6">
            <Flex justifyContent="between" alignItems="center">
              <Title>Card Collection</Title>
              <RoleGuard permission="batch.operations">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/batch?playerId=${playerId}`}>Grant Cards/Gold</a>
                </Button>
              </RoleGuard>
            </Flex>
            <div className="mt-4">
              {inventory === undefined ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : inventory === null ? (
                <div className="py-8 text-center text-muted-foreground">Player not found</div>
              ) : inventory.cards.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  This player has no cards in their collection
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Card Name</th>
                        <th className="text-left py-2 px-3">Rarity</th>
                        <th className="text-left py-2 px-3">Type</th>
                        <th className="text-center py-2 px-3">Cost</th>
                        <th className="text-center py-2 px-3">ATK</th>
                        <th className="text-center py-2 px-3">DEF</th>
                        <th className="text-center py-2 px-3">Qty</th>
                        <th className="text-left py-2 px-3">Acquired</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.cards.map(
                        (card: {
                          playerCardId: string;
                          cardDefinitionId: string;
                          name: string;
                          rarity: string;
                          archetype: string;
                          cardType: string;
                          attack: number | null;
                          defense: number | null;
                          cost: number;
                          quantity: number;
                          isFavorite: boolean;
                          acquiredAt: number;
                          imageUrl?: string;
                        }) => (
                          <tr key={card.playerCardId} className="border-b hover:bg-muted/30">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {card.isFavorite && <span title="Favorite">⭐</span>}
                                <span className="font-medium">{card.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  card.rarity === "legendary"
                                    ? "bg-amber-500/20 text-amber-500"
                                    : card.rarity === "epic"
                                      ? "bg-purple-500/20 text-purple-500"
                                      : card.rarity === "rare"
                                        ? "bg-blue-500/20 text-blue-500"
                                        : card.rarity === "uncommon"
                                          ? "bg-emerald-500/20 text-emerald-500"
                                          : "bg-gray-500/20 text-gray-400"
                                }`}
                              >
                                {card.rarity}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">{card.cardType}</td>
                            <td className="py-2 px-3 text-center">{card.cost}</td>
                            <td className="py-2 px-3 text-center">{card.attack ?? "-"}</td>
                            <td className="py-2 px-3 text-center">{card.defense ?? "-"}</td>
                            <td className="py-2 px-3 text-center font-medium">{card.quantity}</td>
                            <td className="py-2 px-3 text-muted-foreground text-xs">
                              {new Date(card.acquiredAt).toLocaleDateString()}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <Title>Engagement Summary (30 days)</Title>
              {engagement === undefined ? (
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                      <Text className="text-2xl font-bold text-blue-500">
                        {engagement.totals.totalSessions}
                      </Text>
                      <Text className="text-sm text-muted-foreground">Sessions</Text>
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                      <Text className="text-2xl font-bold text-emerald-500">
                        {engagement.totals.daysActive}
                      </Text>
                      <Text className="text-sm text-muted-foreground">Days Active</Text>
                    </div>
                    <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/30 text-center">
                      <Text className="text-2xl font-bold text-violet-500">
                        {Math.round(engagement.totals.totalSessionTime / 60000)}m
                      </Text>
                      <Text className="text-sm text-muted-foreground">Total Time</Text>
                    </div>
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                      <Text className="text-2xl font-bold text-amber-500">
                        {engagement.currentStreak}
                      </Text>
                      <Text className="text-sm text-muted-foreground">Day Streak</Text>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <Text className="text-muted-foreground">Games Played</Text>
                      <Text className="font-medium">{engagement.totals.totalGamesPlayed}</Text>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <Text className="text-muted-foreground">Games Won</Text>
                      <Text className="font-medium">{engagement.totals.totalGamesWon}</Text>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <Text className="text-muted-foreground">Cards Played</Text>
                      <Text className="font-medium">{engagement.totals.totalCardsPlayed}</Text>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <Text className="text-muted-foreground">Packs Opened</Text>
                      <Text className="font-medium">{engagement.totals.totalPacksOpened}</Text>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <Title>Daily Activity</Title>
              <Text className="text-muted-foreground">Session activity over the last 30 days</Text>
              {engagement === undefined ? (
                <Skeleton className="h-48 w-full mt-4" />
              ) : engagement.dailyData.length > 0 ? (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {engagement.dailyData.slice(0, 14).map(
                    (day: {
                      date: string;
                      sessions: number;
                      sessionTime: number;
                      gamesPlayed: number;
                      gamesWon: number;
                    }) => (
                      <div
                        key={day.date}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                      >
                        <Text className="font-medium">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>{day.sessions} sessions</span>
                          <span>{Math.round(day.sessionTime / 60000)}m</span>
                          <span>{day.gamesPlayed} games</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="mt-4 py-8 text-center text-muted-foreground">
                  No engagement data available for this player
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="mt-4">
          <Card>
            <Title>Recent Games</Title>
            <Text className="text-muted-foreground">
              This player&apos;s game history will be shown here when implemented.
            </Text>
            <div className="mt-4 py-8 text-center text-muted-foreground">
              Game history feature coming soon
            </div>
          </Card>
        </TabsContent>

        {/* Moderation History Tab */}
        <TabsContent value="moderation" className="mt-4">
          <Card>
            <Flex justifyContent="between" alignItems="center">
              <div className="flex items-center gap-4">
                <Title>Moderation History</Title>
                {moderationStatus && (
                  <Text className="text-muted-foreground">
                    {moderationStatus.warningCount} warning
                    {moderationStatus.warningCount !== 1 ? "s" : ""} total
                  </Text>
                )}
              </div>
              <RoleGuard permission="player.view">
                <Button variant="outline" size="sm" onClick={() => setAddNoteOpen(true)}>
                  Add Note
                </Button>
              </RoleGuard>
            </Flex>
            <div className="mt-4">
              {moderationHistory === undefined ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <ModerationTimeline
                  entries={
                    moderationHistory?.map((h) => ({
                      action: h.action,
                      reason: h.reason,
                      createdAt: h.timestamp ?? h.createdAt ?? Date.now(),
                    })) ?? []
                  }
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="apikeys" className="mt-4">
          <Card>
            <Flex justifyContent="between" alignItems="center">
              <Title>API Keys</Title>
              <RoleGuard permission="player.edit">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api-keys">Manage All Keys</a>
                </Button>
              </RoleGuard>
            </Flex>
            <div className="mt-4 py-8 text-center text-muted-foreground">
              API key management for this player coming soon
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player Name</DialogTitle>
            <DialogDescription>Change the display name for this player.</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="player-name">Player Name</Label>
            <Input
              id="player-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter new name"
              maxLength={50}
              className="mt-2"
            />
            <Text className="text-xs text-muted-foreground mt-1">1-50 characters</Text>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateName} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Moderation Note</DialogTitle>
            <DialogDescription>
              Add a note to this player&apos;s moderation history. Notes are visible to all
              moderators.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="mod-note">Note</Label>
            <Textarea
              id="mod-note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={isUpdating}>
              {isUpdating ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
