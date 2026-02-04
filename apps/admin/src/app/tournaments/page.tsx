"use client";

/**
 * Tournament Management Page
 *
 * Browse and manage tournaments with participants and settings.
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
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Text, Title } from "@tremor/react";
import {
  CalendarIcon,
  CoinsIcon,
  PlusIcon,
  TrophyIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type TournamentStatus = "registration" | "checkin" | "active" | "completed" | "cancelled";
type TournamentFormat = "single_elimination";
type TournamentMode = "ranked" | "casual";

const STATUS_CONFIG: Record<
  TournamentStatus,
  { label: string; color: "yellow" | "blue" | "emerald" | "gray" | "red" }
> = {
  registration: { label: "Registration", color: "yellow" },
  checkin: { label: "Check-in", color: "blue" },
  active: { label: "Active", color: "emerald" },
  completed: { label: "Completed", color: "gray" },
  cancelled: { label: "Cancelled", color: "red" },
};

const FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elimination: "Single Elimination",
};

const MODE_LABELS: Record<TournamentMode, string> = {
  ranked: "Ranked",
  casual: "Casual",
};

// =============================================================================
// Create Tournament Dialog
// =============================================================================

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateTournamentDialog({ open, onOpenChange }: CreateTournamentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [maxPlayers, setMaxPlayers] = useState<8 | 16 | 32>(16);
  const [entryFee, setEntryFee] = useState("100");
  const [mode, setMode] = useState<TournamentMode>("ranked");
  const [prizeFirst, setPrizeFirst] = useState("500");
  const [prizeSecond, setPrizeSecond] = useState("300");
  const [prizeThirdFourth, setPrizeThirdFourth] = useState("100");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date/time fields - default to 1 hour from now for registration start
  const defaultRegStart = new Date(Date.now() + 60 * 60 * 1000);
  const defaultRegEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultTourneyStart = new Date(Date.now() + 25 * 60 * 60 * 1000);

  const [registrationStartsAt, setRegistrationStartsAt] = useState(
    defaultRegStart.toISOString().slice(0, 16)
  );
  const [registrationEndsAt, setRegistrationEndsAt] = useState(
    defaultRegEnd.toISOString().slice(0, 16)
  );
  const [scheduledStartAt, setScheduledStartAt] = useState(
    defaultTourneyStart.toISOString().slice(0, 16)
  );

  const createTournament = useConvexMutation(typedApi.admin.tournaments.createTournament);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Tournament name is required");
      return;
    }
    setIsSubmitting(true);

    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
      const result = (await createTournament({
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        maxPlayers,
        entryFee: Number.parseInt(entryFee, 10),
        mode,
        prizePool: {
          first: Number.parseInt(prizeFirst, 10),
          second: Number.parseInt(prizeSecond, 10),
          thirdFourth: Number.parseInt(prizeThirdFourth, 10),
        },
        registrationStartsAt: new Date(registrationStartsAt).getTime(),
        registrationEndsAt: new Date(registrationEndsAt).getTime(),
        scheduledStartAt: new Date(scheduledStartAt).getTime(),
      })) as unknown as { message: string; warning?: string };

      toast.success(result.message);
      if (result.warning) {
        toast.warning(result.warning);
      }
      onOpenChange(false);

      // Reset form
      setName("");
      setDescription("");
      setFormat("single_elimination");
      setMaxPlayers(16);
      setEntryFee("100");
      setMode("ranked");
      setPrizeFirst("500");
      setPrizeSecond("300");
      setPrizeThirdFourth("100");
      setRegistrationStartsAt(defaultRegStart.toISOString().slice(0, 16));
      setRegistrationEndsAt(defaultRegEnd.toISOString().slice(0, 16));
      setScheduledStartAt(defaultTourneyStart.toISOString().slice(0, 16));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create tournament");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
          <DialogDescription>
            Set up a new tournament with registration, check-in, and bracket phases.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                placeholder="Weekend Championship"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter tournament description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as TournamentFormat)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as TournamentMode)}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ranked">Ranked</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxPlayers">Max Players</Label>
              <Select
                value={maxPlayers.toString()}
                onValueChange={(v) => setMaxPlayers(Number.parseInt(v) as 8 | 16 | 32)}
              >
                <SelectTrigger id="maxPlayers">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="16">16</SelectItem>
                  <SelectItem value="32">32</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entryFee" className="flex items-center gap-2">
                <CoinsIcon className="h-4 w-4 text-amber-500" />
                Entry Fee (Gold)
              </Label>
              <Input
                id="entryFee"
                type="number"
                min="0"
                placeholder="100"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label className="mb-2 block">Prize Pool (Gold)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="prizeFirst" className="text-xs text-muted-foreground">
                    1st Place
                  </Label>
                  <Input
                    id="prizeFirst"
                    type="number"
                    min="0"
                    placeholder="500"
                    value={prizeFirst}
                    onChange={(e) => setPrizeFirst(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="prizeSecond" className="text-xs text-muted-foreground">
                    2nd Place
                  </Label>
                  <Input
                    id="prizeSecond"
                    type="number"
                    min="0"
                    placeholder="300"
                    value={prizeSecond}
                    onChange={(e) => setPrizeSecond(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="prizeThirdFourth" className="text-xs text-muted-foreground">
                    3rd-4th (each)
                  </Label>
                  <Input
                    id="prizeThirdFourth"
                    type="number"
                    min="0"
                    placeholder="100"
                    value={prizeThirdFourth}
                    onChange={(e) => setPrizeThirdFourth(e.target.value)}
                  />
                </div>
              </div>
              <Text className="text-xs text-muted-foreground mt-1">
                Total:{" "}
                {Number.parseInt(prizeFirst || "0") +
                  Number.parseInt(prizeSecond || "0") +
                  Number.parseInt(prizeThirdFourth || "0") * 2}{" "}
                gold
              </Text>
            </div>

            <div className="col-span-2 border-t pt-3">
              <Label className="mb-2 block">Schedule</Label>
            </div>

            <div>
              <Label htmlFor="registrationStartsAt">Registration Starts</Label>
              <Input
                id="registrationStartsAt"
                type="datetime-local"
                value={registrationStartsAt}
                onChange={(e) => setRegistrationStartsAt(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="registrationEndsAt">Registration Ends</Label>
              <Input
                id="registrationEndsAt"
                type="datetime-local"
                value={registrationEndsAt}
                onChange={(e) => setRegistrationEndsAt(e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="scheduledStartAt">Tournament Start</Label>
              <Input
                id="scheduledStartAt"
                type="datetime-local"
                value={scheduledStartAt}
                onChange={(e) => setScheduledStartAt(e.target.value)}
                required
              />
              <Text className="text-xs text-muted-foreground mt-1">
                Check-in phase will auto-calculate between registration end and tournament start
              </Text>
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
              {isSubmitting ? "Creating..." : "Create Tournament"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Tournament Actions Component
// =============================================================================

interface TournamentActionsProps {
  tournament: {
    _id: string;
    name: string;
    status: TournamentStatus;
  };
}

function TournamentActions({ tournament }: TournamentActionsProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const cancelTournament = useConvexMutation(typedApi.admin.tournaments.cancelTournament);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    setIsCancelling(true);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
      const result = (await cancelTournament({
        tournamentId: tournament._id as Id<"tournaments">,
        reason: cancelReason.trim(),
      })) as unknown as { message: string; refundedCount: number; totalRefunded: number };
      toast.success(result.message);
      if (result.refundedCount > 0) {
        toast.info(`Refunded ${result.refundedCount} players (${result.totalRefunded} gold total)`);
      }
      setShowCancelConfirm(false);
      setCancelReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel tournament");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tournaments/${tournament._id}`}>View</Link>
        </Button>

        {tournament.status !== "completed" && tournament.status !== "cancelled" && (
          <RoleGuard permission="admin.manage">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowCancelConfirm(true)}
              disabled={isCancelling}
            >
              <XCircleIcon className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </RoleGuard>
        )}
      </div>

      {/* Cancel Tournament Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Tournament "{tournament.name}"?</DialogTitle>
            <DialogDescription>
              This will cancel the tournament and refund entry fees to all participants. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancelReason">Reason for cancellation *</Label>
            <Textarea
              id="cancelReason"
              placeholder="e.g., Technical issues, insufficient participants..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelConfirm(false);
                setCancelReason("");
              }}
              disabled={isCancelling}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling..." : "Cancel Tournament"}
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

export default function TournamentsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const tournamentsResult = useConvexQuery(typedApi.admin.tournaments.listTournaments, {
    status: statusFilter !== "all" ? (statusFilter as TournamentStatus) : undefined,
    limit: 50,
    offset: 0,
  }) as any;

  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg types
  const tournamentStats = useConvexQuery(
    typedApi.admin.tournaments.getTournamentStats,
    {} as any
  ) as any;

  const isLoading = tournamentsResult === undefined;

  return (
    <PageWrapper title="Tournaments" description="Manage tournaments and competitive events">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold">
                {tournamentStats?.totalTournaments ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Total Tournaments</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-emerald-500">
                {tournamentStats?.activeTournaments ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Active</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-blue-500">
                {tournamentStats?.completedTournaments ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Completed</Text>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <Text className="text-2xl font-bold text-amber-500">
                {tournamentStats?.totalPrizeDistributed?.toLocaleString() ?? "..."}
              </Text>
              <Text className="text-sm text-muted-foreground">Total Prizes Awarded</Text>
            </div>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card>
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="w-[200px]">
              <Text className="text-sm text-muted-foreground mb-1">Status</Text>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="registration">Registration</SelectItem>
                  <SelectItem value="checkin">Check-in</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <RoleGuard permission="admin.manage">
              <Button onClick={() => setShowCreateDialog(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Tournament
              </Button>
            </RoleGuard>
          </div>
        </Card>

        {/* Tournament List */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Title>Tournaments ({tournamentsResult?.totalCount ?? 0})</Title>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tournamentsResult?.tournaments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <TrophyIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tournaments found. Create your first tournament to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3">Name</th>
                    <th className="text-left py-3 px-3">Type</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-center py-3 px-3">Players</th>
                    <th className="text-center py-3 px-3">Entry Fee</th>
                    <th className="text-center py-3 px-3">Prize Pool</th>
                    <th className="text-left py-3 px-3">Start Time</th>
                    <th className="text-right py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentsResult?.tournaments.map(
                    (tournament: {
                      _id: Id<"tournaments">;
                      name: string;
                      status: TournamentStatus;
                      scheduledStartAt: number;
                      description?: string;
                      format: string;
                      mode: string;
                      registeredCount: number;
                      maxPlayers: number;
                      entryFee: number;
                      potentialPrize: number;
                      creatorUsername: string;
                      totalPrizeDistributed: number;
                    }) => {
                      const statusConfig = STATUS_CONFIG[tournament.status as TournamentStatus];
                      const startDate = new Date(tournament.scheduledStartAt);

                      return (
                        <tr
                          key={tournament._id}
                          className={`border-b hover:bg-muted/30 ${
                            tournament.status === "active" ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="py-3 px-3">
                            <Link
                              href={`/tournaments/${tournament._id}`}
                              className="font-medium hover:underline text-primary"
                            >
                              {tournament.name}
                            </Link>
                            {tournament.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {tournament.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-xs">
                              <div className="font-medium">
                                {FORMAT_LABELS[tournament.format as TournamentFormat]}
                              </div>
                              <div className="text-muted-foreground">
                                {MODE_LABELS[tournament.mode as TournamentMode]}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge color={statusConfig.color}>{statusConfig.label}</Badge>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <UsersIcon className="h-3 w-3 text-muted-foreground" />
                              {tournament.registeredCount}/{tournament.maxPlayers}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-amber-600">
                              <CoinsIcon className="h-3 w-3" />
                              {tournament.entryFee.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-emerald-600">
                              <TrophyIcon className="h-3 w-3" />
                              {tournament.potentialPrize.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-xs">
                              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{startDate.toLocaleDateString()}</div>
                                <div className="text-muted-foreground">
                                  {startDate.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <TournamentActions tournament={tournament} />
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

      <CreateTournamentDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </PageWrapper>
  );
}
