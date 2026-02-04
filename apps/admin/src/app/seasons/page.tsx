"use client";

/**
 * Seasons Management Page
 *
 * Browse and manage competitive seasons with rewards configuration.
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
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useMutation, useQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import { CalendarIcon, PlayIcon, PlusIcon, StopCircleIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type SeasonStatus = "upcoming" | "active" | "ended";
type RankResetType = "full" | "soft" | "none";

const STATUS_CONFIG: Record<SeasonStatus, { label: string; color: "yellow" | "emerald" | "gray" }> =
  {
    upcoming: { label: "Upcoming", color: "yellow" },
    active: { label: "Active", color: "emerald" },
    ended: { label: "Ended", color: "gray" },
  };

const RESET_TYPE_LABELS: Record<RankResetType, string> = {
  full: "Full Reset (back to 1000)",
  soft: "Soft Reset (keep %)",
  none: "No Reset",
};

// =============================================================================
// Create Season Dialog
// =============================================================================

interface CreateSeasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateSeasonDialog({ open, onOpenChange }: CreateSeasonDialogProps) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rankResetType, setRankResetType] = useState<RankResetType>("soft");
  const [softResetPercentage, setSoftResetPercentage] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSeason = useMutation(typedApi.admin.seasons.createSeason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = (await createSeason({
        name,
        number: Number.parseInt(number, 10),
        description: description || undefined,
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        rankResetType,
        softResetPercentage:
          rankResetType === "soft" ? Number.parseInt(softResetPercentage, 10) : undefined,
      })) as { message: string };

      toast.success(result.message);
      onOpenChange(false);

      // Reset form
      setName("");
      setNumber("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setRankResetType("soft");
      setSoftResetPercentage("50");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create season");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Season</DialogTitle>
          <DialogDescription>
            Set up a new competitive season with rewards and rank reset configuration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Season Name</Label>
              <Input
                id="name"
                placeholder="Season 1: Dawn of Cards"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="number">Season Number</Label>
              <Input
                id="number"
                type="number"
                min="1"
                placeholder="1"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
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
              <div className="col-span-2">
                <Label htmlFor="softReset">Soft Reset Percentage (0-100)</Label>
                <Input
                  id="softReset"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={softResetPercentage}
                  onChange={(e) => setSoftResetPercentage(e.target.value)}
                />
                <Text className="text-xs text-muted-foreground mt-1">
                  Players keep {softResetPercentage}% of ELO above/below 1000
                </Text>
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
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Enter season description..."
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
              {isSubmitting ? "Creating..." : "Create Season"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Season Actions Component
// =============================================================================

interface SeasonActionsProps {
  season: {
    _id: string;
    name: string;
    status: SeasonStatus;
  };
}

function SeasonActions({ season }: SeasonActionsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const startSeason = useMutation(typedApi.admin.seasons.startSeason);
  const endSeason = useMutation(typedApi.admin.seasons.endSeason);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const result = (await startSeason({ seasonId: season._id as Id<"seasons"> })) as {
        message: string;
      };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start season");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEnd = async (distributeRewards: boolean) => {
    setIsEnding(true);
    try {
      const result = (await endSeason({
        seasonId: season._id as Id<"seasons">,
        distributeRewards,
      })) as { message: string };
      toast.success(result.message);
      setShowEndConfirm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to end season");
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {season.status === "upcoming" && (
          <RoleGuard permission="config.edit">
            <Button size="sm" variant="default" onClick={handleStart} disabled={isStarting}>
              <PlayIcon className="h-3 w-3 mr-1" />
              {isStarting ? "Starting..." : "Start"}
            </Button>
          </RoleGuard>
        )}

        {season.status === "active" && (
          <RoleGuard permission="config.edit">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowEndConfirm(true)}
              disabled={isEnding}
            >
              <StopCircleIcon className="h-3 w-3 mr-1" />
              End Season
            </Button>
          </RoleGuard>
        )}

        <Button variant="outline" size="sm" asChild>
          <Link href={`/seasons/${season._id}`}>View</Link>
        </Button>
      </div>

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
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SeasonsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const seasonsResult = useQuery(typedApi.admin.seasons.listSeasons, {
    status: statusFilter !== "all" ? (statusFilter as SeasonStatus) : undefined,
  });

  const seasonStats = useQuery(typedApi.admin.seasons.getSeasonStats, {});

  const isLoading = seasonsResult === undefined;

  return (
    <PageWrapper
      title="Season Management"
      description="Manage competitive ranked seasons with rewards and leaderboards"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold">{seasonStats?.totalSeasons ?? "..."}</Text>
              <Text className="text-sm text-muted-foreground">Total Seasons</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-emerald-500">
                {seasonStats?.activeSeason?.name ?? "None"}
              </Text>
              <Text className="text-sm text-muted-foreground">Current Season</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-yellow-500">
                {seasonStats?.upcomingSeasons ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Upcoming</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-blue-500">
                {seasonStats?.activeSeasonPlayers ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Active Players</Text>
            </div>
          </Card>
        </div>

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
                New Season
              </Button>
            </RoleGuard>
          </div>
        </Card>

        {/* Seasons List */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Title>Seasons ({seasonsResult?.totalCount ?? 0})</Title>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : seasonsResult?.seasons.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <TrophyIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No seasons found. Create your first season to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3">#</th>
                    <th className="text-left py-3 px-3">Season</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-left py-3 px-3">Dates</th>
                    <th className="text-left py-3 px-3">Rank Reset</th>
                    <th className="text-right py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonsResult?.seasons.map(
                    (season: {
                      _id: Id<"seasons">;
                      name: string;
                      status: SeasonStatus;
                      startDate: number;
                      endDate: number;
                      number?: number;
                      description?: string;
                      rankResetType?: string;
                      softResetPercentage?: number;
                    }) => {
                      const statusConfig = STATUS_CONFIG[season.status as SeasonStatus];
                      return (
                        <tr
                          key={season._id}
                          className={`border-b hover:bg-muted/30 ${
                            season.status === "active" ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-3 px-3 font-mono text-muted-foreground">
                            {season.number}
                          </td>
                          <td className="py-3 px-3">
                            <Link
                              href={`/seasons/${season._id}`}
                              className="font-medium hover:underline text-primary"
                            >
                              {season.name}
                            </Link>
                            {season.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {season.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Badge color={statusConfig.color}>{statusConfig.label}</Badge>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            <div className="flex items-center gap-1 text-xs">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(season.startDate), "MMM d, yyyy")}
                              <span className="mx-1">-</span>
                              {format(new Date(season.endDate), "MMM d, yyyy")}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs">
                            {RESET_TYPE_LABELS[season.rankResetType as RankResetType]}
                            {season.rankResetType === "soft" &&
                              season.softResetPercentage !== undefined &&
                              ` (${season.softResetPercentage}%)`}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <SeasonActions season={season} />
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <CreateSeasonDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </PageWrapper>
  );
}
