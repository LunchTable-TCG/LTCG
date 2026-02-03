"use client";

/**
 * Battle Pass Management Page
 *
 * Browse and manage battle pass seasons with tier definitions.
 */

import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Card, Text, Title } from "@tremor/react";
import {
  CalendarIcon,
  CrownIcon,
  GemIcon,
  LayersIcon,
  PlayIcon,
  PlusIcon,
  StopCircleIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type BattlePassStatus = "upcoming" | "active" | "ended";

const STATUS_CONFIG: Record<
  BattlePassStatus,
  { label: string; color: "yellow" | "emerald" | "gray" }
> = {
  upcoming: { label: "Upcoming", color: "yellow" },
  active: { label: "Active", color: "emerald" },
  ended: { label: "Ended", color: "gray" },
};

// =============================================================================
// Create Battle Pass Dialog
// =============================================================================

interface CreateBattlePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateBattlePassDialog({ open, onOpenChange }: CreateBattlePassDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [totalTiers, setTotalTiers] = useState("50");
  const [xpPerTier, setXpPerTier] = useState("1000");
  const [premiumPrice, setPremiumPrice] = useState("1000");
  const [useDefaultRewards, setUseDefaultRewards] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSeasons = useConvexQuery(
    apiAny.admin.battlePass.getAvailableSeasonsForBattlePass,
    {}
  );
  const createBattlePass = useConvexMutation(apiAny.admin.battlePass.createBattlePassSeason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonId) {
      toast.error("Please select a season");
      return;
    }
    setIsSubmitting(true);

    try {
      const result = await createBattlePass({
        seasonId: seasonId as any,
        name,
        description: description || undefined,
        totalTiers: Number.parseInt(totalTiers, 10),
        xpPerTier: Number.parseInt(xpPerTier, 10),
        premiumPrice: Number.parseInt(premiumPrice, 10),
        useDefaultRewards,
      });

      toast.success(result.message);
      onOpenChange(false);

      // Reset form
      setName("");
      setDescription("");
      setSeasonId("");
      setTotalTiers("50");
      setXpPerTier("1000");
      setPremiumPrice("1000");
      setUseDefaultRewards(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create battle pass");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Battle Pass</DialogTitle>
          <DialogDescription>
            Set up a new battle pass season with rewards and progression.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="season">Link to Season *</Label>
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger id="season">
                  <SelectValue placeholder="Select a season..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSeasons?.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available seasons. Create a season first.
                    </div>
                  )}
                  {availableSeasons?.map((s: any) => (
                    <SelectItem key={s._id} value={s._id}>
                      Season {s.number}: {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="name">Battle Pass Name *</Label>
              <Input
                id="name"
                placeholder="Season 1 Battle Pass"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="totalTiers">Total Tiers</Label>
              <Input
                id="totalTiers"
                type="number"
                min="10"
                max="100"
                placeholder="50"
                value={totalTiers}
                onChange={(e) => setTotalTiers(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="xpPerTier">XP Per Tier</Label>
              <Input
                id="xpPerTier"
                type="number"
                min="100"
                placeholder="1000"
                value={xpPerTier}
                onChange={(e) => setXpPerTier(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="premiumPrice" className="flex items-center gap-2">
                <GemIcon className="h-4 w-4 text-violet-500" />
                Premium Price (Gems)
              </Label>
              <Input
                id="premiumPrice"
                type="number"
                min="0"
                placeholder="1000"
                value={premiumPrice}
                onChange={(e) => setPremiumPrice(e.target.value)}
              />
            </div>

            <div className="col-span-2 flex items-center justify-between py-2">
              <div>
                <Label>Auto-generate Default Rewards</Label>
                <Text className="text-xs text-muted-foreground">
                  Creates standard tier rewards (gold & gems)
                </Text>
              </div>
              <Switch checked={useDefaultRewards} onCheckedChange={setUseDefaultRewards} />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter battle pass description..."
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
              {isSubmitting ? "Creating..." : "Create Battle Pass"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Battle Pass Actions Component
// =============================================================================

interface BattlePassActionsProps {
  battlePass: {
    _id: string;
    name: string;
    status: BattlePassStatus;
  };
}

function BattlePassActions({ battlePass }: BattlePassActionsProps) {
  const [isActivating, setIsActivating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const activateBattlePass = useConvexMutation(apiAny.admin.battlePass.activateBattlePass);
  const endBattlePass = useConvexMutation(apiAny.admin.battlePass.endBattlePass);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const result = await activateBattlePass({ battlePassId: battlePass._id as any });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to activate battle pass");
    } finally {
      setIsActivating(false);
    }
  };

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      const result = await endBattlePass({ battlePassId: battlePass._id as any });
      toast.success(result.message);
      setShowEndConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to end battle pass");
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {battlePass.status === "upcoming" && (
          <RoleGuard permission="config.edit">
            <Button size="sm" variant="default" onClick={handleActivate} disabled={isActivating}>
              <PlayIcon className="h-3 w-3 mr-1" />
              {isActivating ? "Activating..." : "Activate"}
            </Button>
          </RoleGuard>
        )}

        {battlePass.status === "active" && (
          <RoleGuard permission="config.edit">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowEndConfirm(true)}
              disabled={isEnding}
            >
              <StopCircleIcon className="h-3 w-3 mr-1" />
              End
            </Button>
          </RoleGuard>
        )}

        <Button variant="outline" size="sm" asChild>
          <Link href={`/battle-pass/${battlePass._id}`}>Edit</Link>
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <Link href={`/battle-pass/${battlePass._id}/tiers`}>
            <LayersIcon className="h-3 w-3 mr-1" />
            Tiers
          </Link>
        </Button>
      </div>

      {/* End Battle Pass Confirmation Dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Battle Pass "{battlePass.name}"?</DialogTitle>
            <DialogDescription>
              This will end the battle pass and prevent players from earning more progress. Players
              will keep their current progress and claimed rewards.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEndConfirm(false)} disabled={isEnding}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEnd} disabled={isEnding}>
              {isEnding ? "Ending..." : "End Battle Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function BattlePassPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const battlePassResult = useConvexQuery(apiAny.admin.battlePass.listBattlePassSeasons, {
    status: statusFilter !== "all" ? (statusFilter as BattlePassStatus) : undefined,
  });

  const battlePassStats = useConvexQuery(apiAny.admin.battlePass.getBattlePassStats, {});

  const isLoading = battlePassResult === undefined;

  return (
    <PageWrapper title="Battle Pass" description="Manage battle pass seasons and rewards">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold">
                {battlePassStats?.totalBattlePasses ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Total Battle Passes</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-emerald-500">
                {battlePassStats?.activeBattlePass?.name ?? "None"}
              </Text>
              <Text className="text-sm text-muted-foreground">Active</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-violet-500">
                {battlePassStats?.activeBattlePass?.premiumPlayers ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Premium Users</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-blue-500">
                {battlePassStats?.activeBattlePass?.totalPlayers ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Total Users</Text>
            </div>
          </Card>
        </div>

        {/* Active Battle Pass Quick Stats */}
        {battlePassStats?.activeBattlePass && (
          <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <Title className="flex items-center gap-2">
                  <CrownIcon className="h-5 w-5 text-amber-500" />
                  {battlePassStats.activeBattlePass.name}
                </Title>
                <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-4 w-4" />
                    {battlePassStats.activeBattlePass.totalPlayers} players
                  </div>
                  <div className="flex items-center gap-1">
                    <GemIcon className="h-4 w-4 text-violet-500" />
                    {battlePassStats.activeBattlePass.premiumPlayers} premium
                  </div>
                  <div className="flex items-center gap-1">
                    <LayersIcon className="h-4 w-4" />
                    Avg Tier: {battlePassStats.activeBattlePass.averageTier}
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    {battlePassStats.activeBattlePass.daysRemaining} days left
                  </div>
                </div>
              </div>
              <Button asChild>
                <Link
                  href={`/battle-pass/${battlePassResult?.battlePasses.find((bp: any) => bp.status === "active")?._id}`}
                >
                  Manage Active
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Filters & Actions */}
        <Card>
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="w-[150px]">
              <Text className="text-sm text-muted-foreground mb-1">Status</Text>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <RoleGuard permission="config.edit">
              <Button onClick={() => setShowCreateDialog(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Battle Pass
              </Button>
            </RoleGuard>
          </div>
        </Card>

        {/* Battle Pass List */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Title>Battle Passes ({battlePassResult?.totalCount ?? 0})</Title>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : battlePassResult?.battlePasses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CrownIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No battle passes found. Create your first battle pass to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3">Name</th>
                    <th className="text-left py-3 px-3">Season</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-center py-3 px-3">Tiers</th>
                    <th className="text-center py-3 px-3">Premium Price</th>
                    <th className="text-center py-3 px-3">Users</th>
                    <th className="text-center py-3 px-3">Premium</th>
                    <th className="text-right py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {battlePassResult?.battlePasses.map((bp: any) => {
                    const statusConfig = STATUS_CONFIG[bp.status as BattlePassStatus];
                    return (
                      <tr
                        key={bp._id}
                        className={`border-b hover:bg-muted/30 ${
                          bp.status === "active" ? "bg-emerald-500/5" : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <Link
                            href={`/battle-pass/${bp._id}`}
                            className="font-medium hover:underline text-primary"
                          >
                            {bp.name}
                          </Link>
                          {bp.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {bp.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-xs">
                            <div className="font-medium">S{bp.seasonNumber}</div>
                            <div className="text-muted-foreground">{bp.seasonName}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge color={statusConfig.color}>{statusConfig.label}</Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <LayersIcon className="h-3 w-3 text-muted-foreground" />
                            {bp.tierCount}/{bp.totalTiers}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-violet-600">
                            <GemIcon className="h-3 w-3" />
                            {bp.premiumPrice?.toLocaleString() ?? 0}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-muted-foreground">-</td>
                        <td className="py-3 px-3 text-center text-muted-foreground">-</td>
                        <td className="py-3 px-3 text-right">
                          <BattlePassActions battlePass={bp} />
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

      <CreateBattlePassDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </PageWrapper>
  );
}
