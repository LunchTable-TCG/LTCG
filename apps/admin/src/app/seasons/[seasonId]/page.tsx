"use client";

/**
 * Season Detail Page
 *
 * View and edit season configuration, rewards, and leaderboard.
 */

import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { api, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { SeasonId, SeasonLeaderboardEntry, TierBreakdown } from "@/lib/convexTypes";
import type { Doc } from "@convex/_generated/dataModel";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  CoinsIcon,
  GemIcon,
  GiftIcon,
  PackageIcon,
  PlayIcon,
  SaveIcon,
  StopCircleIcon,
  TrophyIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type SeasonStatus = "upcoming" | "active" | "ended";
type RankResetType = "full" | "soft" | "none";

interface RewardTier {
  tier: string;
  minElo: number;
  goldReward: number;
  gemsReward: number;
  cardPackReward?: number;
  exclusiveCardId?: string;
  titleReward?: string;
}

const STATUS_CONFIG: Record<SeasonStatus, { label: string; color: "yellow" | "emerald" | "gray" }> =
  {
    upcoming: { label: "Upcoming", color: "yellow" },
    active: { label: "Active", color: "emerald" },
    ended: { label: "Ended", color: "gray" },
  };

const TIER_COLORS: Record<string, string> = {
  Bronze: "text-orange-600",
  Silver: "text-gray-400",
  Gold: "text-yellow-500",
  Platinum: "text-cyan-400",
  Diamond: "text-blue-400",
  Master: "text-purple-500",
  Legend: "text-red-500",
};

// =============================================================================
// Edit Season Dialog
// =============================================================================

interface EditSeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season: Doc<"seasons"> | null;
}

function EditSeasonDialog({ open, onOpenChange, season }: EditSeasonDialogProps) {
  const [name, setName] = useState(season?.name || "");
  const [description, setDescription] = useState(season?.description || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rankResetType, setRankResetType] = useState<RankResetType>(
    season?.rankResetType || "soft"
  );
  const [softResetPercentage, setSoftResetPercentage] = useState(
    season?.softResetPercentage?.toString() || "50"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateSeason = useConvexMutation(api.admin.seasons.updateSeason);

  useEffect(() => {
    if (season) {
      setName(season.name);
      setDescription(season.description || "");
      setRankResetType(season.rankResetType);
      setSoftResetPercentage(season.softResetPercentage?.toString() || "50");
      // Format dates for datetime-local input
      setStartDate(format(new Date(season.startDate), "yyyy-MM-dd'T'HH:mm"));
      setEndDate(format(new Date(season.endDate), "yyyy-MM-dd'T'HH:mm"));
    }
  }, [season]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!season) return;
    setIsSubmitting(true);

    try {
      const result = (await updateSeason({
        seasonId: season._id,
        name,
        description: description || undefined,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        rankResetType,
        softResetPercentage:
          rankResetType === "soft" ? Number.parseInt(softResetPercentage, 10) : undefined,
      })) as { message: string };

      toast.success(result.message);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update season");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!season) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Season</DialogTitle>
          <DialogDescription>Update season configuration and details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Season Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <Label htmlFor="resetType">Rank Reset Type</Label>
              <Select
                value={rankResetType}
                onValueChange={(v) => setRankResetType(v as RankResetType)}
              >
                <SelectTrigger id="resetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Reset</SelectItem>
                  <SelectItem value="soft">Soft Reset</SelectItem>
                  <SelectItem value="none">No Reset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {rankResetType === "soft" && (
              <div>
                <Label htmlFor="softReset">Soft Reset %</Label>
                <Input
                  id="softReset"
                  type="number"
                  min="0"
                  max="100"
                  value={softResetPercentage}
                  onChange={(e) => setSoftResetPercentage(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <SaveIcon className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Rewards Preview Component
// =============================================================================

interface RewardsPreviewProps {
  seasonId: string;
}

function RewardsPreview({ seasonId }: RewardsPreviewProps) {
  const preview = useConvexQuery(api.admin.seasons.previewSeasonRewards, {
    seasonId: seasonId as SeasonId,
  });

  if (!preview) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{preview.totalPlayers}</div>
          <div className="text-xs text-muted-foreground">Total Players</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-500">
            {preview.totalGold.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Gold</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-500">
            {preview.totalGems.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Gems</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-500">{preview.totalPacks}</div>
          <div className="text-xs text-muted-foreground">Total Packs</div>
        </div>
      </div>

      {/* Tier Breakdown */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">Players</TableHead>
            <TableHead className="text-right">Gold</TableHead>
            <TableHead className="text-right">Gems</TableHead>
            <TableHead className="text-right">Packs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.tierBreakdown.map((tier: TierBreakdown) => (
            <TableRow key={tier.tier}>
              <TableCell className={TIER_COLORS[tier.tier] || ""}>{tier.tier}</TableCell>
              <TableCell className="text-right">{tier.playerCount}</TableCell>
              <TableCell className="text-right">{tier.totalGold.toLocaleString()}</TableCell>
              <TableCell className="text-right">{tier.totalGems.toLocaleString()}</TableCell>
              <TableCell className="text-right">{tier.totalPacks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// =============================================================================
// Leaderboard Component
// =============================================================================

interface LeaderboardProps {
  seasonId: string;
  isEnded: boolean;
}

function Leaderboard({ seasonId, isEnded }: LeaderboardProps) {
  const leaderboard = useConvexQuery(api.admin.seasons.getSeasonLeaderboard, {
    seasonId: seasonId as SeasonId,
    limit: 100,
  });

  if (!leaderboard) {
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (leaderboard.leaderboard.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <UserIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No ranked players yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead className="text-right">ELO</TableHead>
            <TableHead className="text-right">W/L</TableHead>
            <TableHead className="text-right">Win Rate</TableHead>
            {isEnded && <TableHead className="text-center">Rewards</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.leaderboard.map((player: SeasonLeaderboardEntry) => (
            <TableRow key={player.userId}>
              <TableCell className="font-mono">
                {player.rank <= 3 ? (
                  <span
                    className={
                      player.rank === 1
                        ? "text-yellow-500"
                        : player.rank === 2
                          ? "text-gray-400"
                          : "text-orange-600"
                    }
                  >
                    #{player.rank}
                  </span>
                ) : (
                  `#${player.rank}`
                )}
              </TableCell>
              <TableCell>
                <Link href={`/players/${player.userId}`} className="hover:underline text-primary">
                  {player.username}
                </Link>
              </TableCell>
              <TableCell className={TIER_COLORS[player.tier] || ""}>{player.tier}</TableCell>
              <TableCell className="text-right font-mono">{player.elo}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {player.wins}/{player.losses}
              </TableCell>
              <TableCell className="text-right">{player.winRate}%</TableCell>
              {isEnded && (
                <TableCell className="text-center">
                  {player.rewardsDistributed ? (
                    <CheckCircleIcon className="h-4 w-4 text-emerald-500 inline" />
                  ) : (
                    <AlertCircleIcon className="h-4 w-4 text-yellow-500 inline" />
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {leaderboard.hasMore && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Showing top 100 of {leaderboard.totalCount} players
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Rewards Configuration Component
// =============================================================================

interface RewardsConfigProps {
  rewards: RewardTier[];
  isEditable: boolean;
  seasonId: string;
}

function RewardsConfig({
  rewards,
  isEditable: _isEditable,
  seasonId: _seasonId,
}: RewardsConfigProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tier</TableHead>
          <TableHead className="text-right">Min ELO</TableHead>
          <TableHead className="text-right">
            <CoinsIcon className="h-4 w-4 inline mr-1" />
            Gold
          </TableHead>
          <TableHead className="text-right">
            <GemIcon className="h-4 w-4 inline mr-1" />
            Gems
          </TableHead>
          <TableHead className="text-right">
            <PackageIcon className="h-4 w-4 inline mr-1" />
            Packs
          </TableHead>
          <TableHead>Title</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rewards.map((reward, index) => (
          <TableRow key={index}>
            <TableCell className={TIER_COLORS[reward.tier] || "font-medium"}>
              {reward.tier}
            </TableCell>
            <TableCell className="text-right font-mono">{reward.minElo}</TableCell>
            <TableCell className="text-right">{reward.goldReward.toLocaleString()}</TableCell>
            <TableCell className="text-right">{reward.gemsReward}</TableCell>
            <TableCell className="text-right">{reward.cardPackReward || "-"}</TableCell>
            <TableCell>{reward.titleReward || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SeasonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAdmin();
  const seasonId = params.seasonId as string;

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  const season = useConvexQuery(api.admin.seasons.getSeason, {
    seasonId: seasonId as SeasonId,
  });

  const startSeason = useConvexMutation(api.admin.seasons.startSeason);
  const endSeason = useConvexMutation(api.admin.seasons.endSeason);
  const distributeRewards = useConvexMutation(api.admin.seasons.distributeSeasonRewards);
  const deleteSeason = useConvexMutation(api.admin.seasons.deleteSeason);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const result = (await startSeason({ seasonId: seasonId as SeasonId })) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start season");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEnd = async (withRewards: boolean) => {
    setIsEnding(true);
    try {
      const result = (await endSeason({
        seasonId: seasonId as SeasonId,
        distributeRewards: withRewards,
      })) as { message: string };
      toast.success(result.message);
      setShowEndConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to end season");
    } finally {
      setIsEnding(false);
    }
  };

  const handleDistributeRewards = async () => {
    setIsDistributing(true);
    try {
      const result = (await distributeRewards({ seasonId: seasonId as SeasonId })) as {
        message: string;
      };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to distribute rewards");
    } finally {
      setIsDistributing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this season? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteSeason({ seasonId: seasonId as SeasonId });
      toast.success("Season deleted");
      router.push("/seasons");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete season");
    }
  };

  if (!season) {
    return (
      <PageWrapper title="Loading..." description="">
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  const statusConfig = STATUS_CONFIG[season.status as SeasonStatus];
  const isEditable = season.status !== "ended";

  return (
    <PageWrapper
      title={
        <div className="flex items-center gap-3">
          <Link href="/seasons" className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <span>
            Season {season.number}: {season.name}
          </span>
          <Badge color={statusConfig.color}>{statusConfig.label}</Badge>
        </div>
      }
      description={season.description || "Competitive ranked season"}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(season.startDate), "MMM d, yyyy HH:mm")} -{" "}
            {format(new Date(season.endDate), "MMM d, yyyy HH:mm")}
            <span className="mx-2">|</span>
            Created by {season.creatorUsername}
          </div>

          <div className="flex gap-2">
            {season.status === "upcoming" && (
              <>
                <RoleGuard permission="config.edit">
                  <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                    Edit
                  </Button>
                </RoleGuard>
                <RoleGuard permission="config.edit">
                  <Button onClick={handleStart} disabled={isStarting}>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    {isStarting ? "Starting..." : "Start Season"}
                  </Button>
                </RoleGuard>
              </>
            )}

            {season.status === "active" && (
              <>
                <RoleGuard permission="config.edit">
                  <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                    Edit
                  </Button>
                </RoleGuard>
                <RoleGuard permission="config.edit">
                  <Button
                    variant="destructive"
                    onClick={() => setShowEndConfirm(true)}
                    disabled={isEnding}
                  >
                    <StopCircleIcon className="h-4 w-4 mr-2" />
                    End Season
                  </Button>
                </RoleGuard>
              </>
            )}

            {season.status === "ended" && (season.snapshotStats?.pendingRewards ?? 0) > 0 && (
              <RoleGuard permission="config.edit">
                <Button onClick={handleDistributeRewards} disabled={isDistributing}>
                  <GiftIcon className="h-4 w-4 mr-2" />
                  {isDistributing
                    ? "Distributing..."
                    : `Distribute Rewards (${season.snapshotStats?.pendingRewards ?? 0} pending)`}
                </Button>
              </RoleGuard>
            )}

            {season.status === "upcoming" && hasPermission("admin.manage") && (
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Ended Season Stats */}
        {season.status === "ended" && season.snapshotStats && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{season.snapshotStats.totalPlayers}</div>
                  <div className="text-sm text-muted-foreground">Total Players</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-500">
                    {season.snapshotStats.rewardsDistributed}
                  </div>
                  <div className="text-sm text-muted-foreground">Rewards Sent</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {season.snapshotStats.pendingRewards}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {Object.keys(season.snapshotStats.tierDistribution || {}).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Tiers Reached</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="leaderboard">
          <TabsList>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <TrophyIcon className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <GiftIcon className="h-4 w-4" />
              Rewards Config
            </TabsTrigger>
            {season.status !== "upcoming" && (
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <CoinsIcon className="h-4 w-4" />
                Rewards Preview
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {season.status === "ended" ? "Final Standings" : "Current Rankings"}
                </CardTitle>
                <CardDescription>
                  {season.status === "ended"
                    ? "Frozen leaderboard from end of season"
                    : "Live ranked leaderboard"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Leaderboard seasonId={seasonId} isEnded={season.status === "ended"} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Reward Tiers</CardTitle>
                <CardDescription>
                  Rewards distributed to players based on their final ELO rating
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RewardsConfig
                  rewards={season.rewards}
                  isEditable={isEditable}
                  seasonId={seasonId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {season.status !== "upcoming" && (
            <TabsContent value="preview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rewards Distribution Preview</CardTitle>
                  <CardDescription>
                    Estimated rewards based on current player standings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RewardsPreview seasonId={seasonId} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <EditSeasonDialog open={showEditDialog} onOpenChange={setShowEditDialog} season={season} />

      {/* End Season Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Season "{season.name}"?</DialogTitle>
            <DialogDescription>
              This will create snapshots of all player rankings and optionally distribute rewards
              immediately. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEndConfirm(false)} disabled={isEnding}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleEnd(false)} disabled={isEnding}>
              End (No Rewards)
            </Button>
            <Button variant="default" onClick={() => handleEnd(true)} disabled={isEnding}>
              {isEnding ? "Ending..." : "End & Distribute Rewards"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
