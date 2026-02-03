"use client";

/**
 * Tournament Detail/Editor Page
 *
 * View and edit tournament settings, manage participants, and perform admin actions.
 */

import { PageWrapper } from "@/components/layout";
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
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Card, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  Loader2Icon,
  PlayIcon,
  SaveIcon,
  ShieldAlertIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type TournamentStatus = "registration" | "checkin" | "active" | "completed" | "cancelled";
type ParticipantStatus =
  | "registered"
  | "checked_in"
  | "active"
  | "eliminated"
  | "winner"
  | "forfeit"
  | "refunded";

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

const PARTICIPANT_STATUS_CONFIG: Record<
  ParticipantStatus,
  { label: string; color: "yellow" | "blue" | "emerald" | "gray" | "red" }
> = {
  registered: { label: "Registered", color: "yellow" },
  checked_in: { label: "Checked In", color: "blue" },
  active: { label: "Active", color: "emerald" },
  eliminated: { label: "Eliminated", color: "gray" },
  winner: { label: "Winner", color: "emerald" },
  forfeit: { label: "Forfeit", color: "red" },
  refunded: { label: "Refunded", color: "gray" },
};

// =============================================================================
// Grant Entry Dialog
// =============================================================================

interface GrantEntryDialogProps {
  tournamentId: string;
  tournamentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GrantEntryDialog({
  tournamentId,
  tournamentName,
  open,
  onOpenChange,
}: GrantEntryDialogProps) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grantEntry = useConvexMutation(apiAny.admin.tournaments.grantTournamentEntry);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error("User ID is required");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setIsSubmitting(true);

    try {
      const result = await grantEntry({
        tournamentId: tournamentId as any,
        userId: userId.trim() as any,
        reason: reason.trim(),
      });
      toast.success(result.message);
      onOpenChange(false);
      setUserId("");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Free Entry</DialogTitle>
          <DialogDescription>
            Grant a user free entry to "{tournamentName}" without charging the entry fee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="userId">User ID *</Label>
            <Input
              id="userId"
              placeholder="k1234567890abcdef"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Community event prize, compensation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
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
              {isSubmitting ? "Granting..." : "Grant Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = params["tournamentId"] as string;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [prizeFirst, setPrizeFirst] = useState("");
  const [prizeSecond, setPrizeSecond] = useState("");
  const [prizeThirdFourth, setPrizeThirdFourth] = useState("");
  const [registrationStartsAt, setRegistrationStartsAt] = useState("");
  const [registrationEndsAt, setRegistrationEndsAt] = useState("");
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showGrantDialog, setShowGrantDialog] = useState(false);

  // Queries and mutations
  const tournament = useConvexQuery(apiAny.admin.tournaments.getTournament, {
    tournamentId: tournamentId as any,
  });

  const updateTournament = useConvexMutation(apiAny.admin.tournaments.updateTournament);
  const forceStart = useConvexMutation(apiAny.admin.tournaments.forceStartTournament);
  const removeParticipant = useConvexMutation(apiAny.admin.tournaments.removeParticipant);
  const disqualifyParticipant = useConvexMutation(apiAny.admin.tournaments.disqualifyParticipant);

  // Populate form with existing data
  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDescription(tournament.description ?? "");
      setEntryFee(tournament.entryFee?.toString() ?? "0");
      setPrizeFirst(tournament.prizePool.first?.toString() ?? "0");
      setPrizeSecond(tournament.prizePool.second?.toString() ?? "0");
      setPrizeThirdFourth(tournament.prizePool.thirdFourth?.toString() ?? "0");
      if (tournament.registrationStartsAt) {
        setRegistrationStartsAt(
          format(new Date(tournament.registrationStartsAt), "yyyy-MM-dd'T'HH:mm")
        );
      }
      if (tournament.registrationEndsAt) {
        setRegistrationEndsAt(
          format(new Date(tournament.registrationEndsAt), "yyyy-MM-dd'T'HH:mm")
        );
      }
      if (tournament.scheduledStartAt) {
        setScheduledStartAt(format(new Date(tournament.scheduledStartAt), "yyyy-MM-dd'T'HH:mm"));
      }
    }
  }, [tournament]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateTournament({
        tournamentId: tournamentId as any,
        updates: {
          name: name.trim(),
          description: description.trim() || undefined,
          entryFee: Number.parseInt(entryFee, 10),
          prizePool: {
            first: Number.parseInt(prizeFirst, 10),
            second: Number.parseInt(prizeSecond, 10),
            thirdFourth: Number.parseInt(prizeThirdFourth, 10),
          },
          registrationStartsAt: registrationStartsAt
            ? new Date(registrationStartsAt).getTime()
            : undefined,
          registrationEndsAt: registrationEndsAt
            ? new Date(registrationEndsAt).getTime()
            : undefined,
          scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt).getTime() : undefined,
        },
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save tournament");
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceStart = async (reason: string) => {
    try {
      const result = await forceStart({
        tournamentId: tournamentId as any,
        reason,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to force start tournament");
    }
  };

  const handleRemoveParticipant = async (
    userId: string,
    _username: string,
    refundEntry: boolean,
    reason: string
  ) => {
    try {
      const result = await removeParticipant({
        tournamentId: tournamentId as any,
        userId: userId as any,
        reason,
        refundEntry,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove participant");
    }
  };

  const handleDisqualify = async (userId: string, _username: string, reason: string) => {
    try {
      const result = await disqualifyParticipant({
        tournamentId: tournamentId as any,
        userId: userId as any,
        reason,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disqualify participant");
    }
  };

  if (tournament === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading tournament data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (tournament === null) {
    return (
      <PageWrapper title="Not Found" description="Tournament not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Tournament Not Found</Text>
            <Text className="text-muted-foreground">
              The tournament you're looking for doesn't exist.
            </Text>
            <Button asChild className="mt-4">
              <Link href="/tournaments">Back to Tournaments</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const statusConfig = STATUS_CONFIG[tournament.status as TournamentStatus];
  const isEditable = tournament.status === "registration";

  return (
    <PageWrapper
      title={tournament.name}
      description={`${tournament.format} • ${tournament.mode}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/tournaments">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {isEditable && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <Title>Basic Information</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label>Tournament Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Weekend Championship"
                  disabled={!isEditable}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tournament description..."
                  rows={3}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </Card>

          {/* Settings */}
          <Card>
            <Title>Settings</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Entry Fee (Gold)</Label>
                <Input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  placeholder="100"
                  min="0"
                  disabled={!isEditable || tournament.registeredCount > 0}
                />
                {tournament.registeredCount > 0 && (
                  <Text className="text-xs text-muted-foreground">
                    Cannot change entry fee after players register
                  </Text>
                )}
              </div>

              <div className="space-y-2">
                <Label>Max Players</Label>
                <Input type="number" value={tournament.maxPlayers} disabled className="bg-muted" />
                <Text className="text-xs text-muted-foreground">
                  Cannot be changed after creation
                </Text>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Prize Pool (Gold)</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">1st Place</Label>
                    <Input
                      type="number"
                      value={prizeFirst}
                      onChange={(e) => setPrizeFirst(e.target.value)}
                      min="0"
                      disabled={!isEditable}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">2nd Place</Label>
                    <Input
                      type="number"
                      value={prizeSecond}
                      onChange={(e) => setPrizeSecond(e.target.value)}
                      min="0"
                      disabled={!isEditable}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">3rd-4th (each)</Label>
                    <Input
                      type="number"
                      value={prizeThirdFourth}
                      onChange={(e) => setPrizeThirdFourth(e.target.value)}
                      min="0"
                      disabled={!isEditable}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Registration Starts</Label>
                <Input
                  type="datetime-local"
                  value={registrationStartsAt}
                  onChange={(e) => setRegistrationStartsAt(e.target.value)}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label>Registration Ends</Label>
                <Input
                  type="datetime-local"
                  value={registrationEndsAt}
                  onChange={(e) => setRegistrationEndsAt(e.target.value)}
                  disabled={!isEditable}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Tournament Start</Label>
                <Input
                  type="datetime-local"
                  value={scheduledStartAt}
                  onChange={(e) => setScheduledStartAt(e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </Card>

          {/* Participants */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Title>Participants ({tournament.participants.length})</Title>
              {tournament.status === "registration" && (
                <RoleGuard permission="admin.manage">
                  <Button size="sm" onClick={() => setShowGrantDialog(true)}>
                    <UserPlusIcon className="mr-2 h-4 w-4" />
                    Grant Entry
                  </Button>
                </RoleGuard>
              )}
            </div>

            {tournament.participants.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Username</th>
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-center py-2 px-2">Seed Rating</th>
                      <th className="text-center py-2 px-2">Round</th>
                      <th className="text-center py-2 px-2">Placement</th>
                      <th className="text-center py-2 px-2">Prize</th>
                      <th className="text-right py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.participants.map((participant: any) => {
                      const pStatusConfig =
                        PARTICIPANT_STATUS_CONFIG[participant.status as ParticipantStatus];
                      return (
                        <tr key={participant._id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-2 font-medium">{participant.username}</td>
                          <td className="py-2 px-2">
                            <Badge color={pStatusConfig.color} size="sm">
                              {pStatusConfig.label}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-center text-muted-foreground">
                            {participant.seedRating}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {participant.currentRound ?? "-"}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {participant.finalPlacement ?? "-"}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {participant.prizeAwarded ? (
                              <span className="text-emerald-600 font-medium">
                                {participant.prizeAwarded.toLocaleString()}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <ParticipantActions
                              participant={participant}
                              tournament={tournament}
                              onRemove={handleRemoveParticipant}
                              onDisqualify={handleDisqualify}
                            />
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

        {/* Sidebar - Stats & Status */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <Title>Status</Title>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Status</Text>
                <Badge color={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Format</Text>
                <Text className="font-medium capitalize">
                  {tournament.format.replace("_", " ")}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Mode</Text>
                <Text className="font-medium capitalize">{tournament.mode}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Created By</Text>
                <Text>{tournament.creatorUsername}</Text>
              </div>
            </div>
          </Card>

          {/* Participant Stats */}
          <Card>
            <Title>Participant Stats</Title>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Registered</Text>
                <Text className="text-xl font-bold">{tournament.stats.registeredCount}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Checked In</Text>
                <Text className="text-xl font-bold">{tournament.stats.checkedInCount}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Active</Text>
                <Text className="text-xl font-bold text-emerald-600">
                  {tournament.stats.activeCount}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Eliminated</Text>
                <Text className="text-xl font-bold">{tournament.stats.eliminatedCount}</Text>
              </div>
            </div>
          </Card>

          {/* Match Stats */}
          <Card>
            <Title>Match Stats</Title>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Round</Text>
                <Text className="text-xl font-bold">
                  {tournament.currentRound}/{tournament.totalRounds || "?"}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Completed</Text>
                <Text className="text-xl font-bold">{tournament.stats.totalMatchesPlayed}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Pending</Text>
                <Text className="text-xl font-bold">{tournament.stats.pendingMatches}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Active</Text>
                <Text className="text-xl font-bold text-emerald-600">
                  {tournament.stats.activeMatches}
                </Text>
              </div>
            </div>
          </Card>

          {/* Prize Stats */}
          <Card>
            <Title>Prize Pool</Title>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Total Pool</Text>
                <Text className="text-xl font-bold text-amber-600">
                  {tournament.stats.potentialPrize.toLocaleString()}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Distributed</Text>
                <Text className="text-xl font-bold text-emerald-600">
                  {tournament.stats.totalPrizeDistributed.toLocaleString()}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Entry Fees</Text>
                <Text className="text-xl font-bold">
                  {tournament.stats.totalEntryFees.toLocaleString()}
                </Text>
              </div>
            </div>
          </Card>

          {/* Admin Actions */}
          <Card>
            <Title>Admin Actions</Title>
            <div className="mt-4 space-y-2">
              {(tournament.status === "registration" || tournament.status === "checkin") && (
                <RoleGuard permission="admin.manage">
                  <ForceStartButton tournamentName={tournament.name} onConfirm={handleForceStart} />
                </RoleGuard>
              )}
            </div>
          </Card>
        </div>
      </div>

      <GrantEntryDialog
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        open={showGrantDialog}
        onOpenChange={setShowGrantDialog}
      />
    </PageWrapper>
  );
}

// =============================================================================
// Participant Actions Component
// =============================================================================

interface ParticipantActionsProps {
  participant: any;
  tournament: any;
  onRemove: (userId: string, username: string, refund: boolean, reason: string) => void;
  onDisqualify: (userId: string, username: string, reason: string) => void;
}

function ParticipantActions({
  participant,
  tournament,
  onRemove,
  onDisqualify,
}: ParticipantActionsProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removeRefund, setRemoveRefund] = useState(true);
  const [disqualifyReason, setDisqualifyReason] = useState("");

  const canRemove = participant.status !== "refunded" && tournament.status !== "completed";
  const canDisqualify = participant.status === "active" && tournament.status === "active";

  if (!canRemove && !canDisqualify) return null;

  return (
    <>
      <div className="flex gap-1">
        {canRemove && (
          <RoleGuard permission="admin.manage">
            <Button size="sm" variant="outline" onClick={() => setShowRemoveDialog(true)}>
              <UserMinusIcon className="h-3 w-3" />
            </Button>
          </RoleGuard>
        )}
        {canDisqualify && (
          <RoleGuard permission="admin.manage">
            <Button size="sm" variant="destructive" onClick={() => setShowDisqualifyDialog(true)}>
              <ShieldAlertIcon className="h-3 w-3" />
            </Button>
          </RoleGuard>
        )}
      </div>

      {/* Remove Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Participant</DialogTitle>
            <DialogDescription>
              Remove {participant.username} from the tournament?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="removeReason">Reason *</Label>
              <Textarea
                id="removeReason"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                rows={3}
                placeholder="e.g., Requested withdrawal, rule violation..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="removeRefund"
                checked={removeRefund}
                onChange={(e) => setRemoveRefund(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="removeRefund" className="cursor-pointer">
                Refund entry fee ({tournament.entryFee} gold)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onRemove(participant.userId, participant.username, removeRefund, removeReason);
                setShowRemoveDialog(false);
                setRemoveReason("");
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disqualify Dialog */}
      <Dialog open={showDisqualifyDialog} onOpenChange={setShowDisqualifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disqualify Participant</DialogTitle>
            <DialogDescription>
              Disqualify {participant.username} from the active tournament? They will forfeit any
              active matches.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="disqualifyReason">Reason *</Label>
            <Textarea
              id="disqualifyReason"
              value={disqualifyReason}
              onChange={(e) => setDisqualifyReason(e.target.value)}
              rows={3}
              placeholder="e.g., Cheating, unsportsmanlike conduct..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisqualifyDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDisqualify(participant.userId, participant.username, disqualifyReason);
                setShowDisqualifyDialog(false);
                setDisqualifyReason("");
              }}
            >
              Disqualify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Force Start Button Component
// =============================================================================

interface ForceStartButtonProps {
  tournamentName: string;
  onConfirm: (reason: string) => void;
}

function ForceStartButton({ tournamentName, onConfirm }: ForceStartButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <Button className="w-full" onClick={() => setShowDialog(true)}>
        <PlayIcon className="mr-2 h-4 w-4" />
        Force Start
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Start Tournament</DialogTitle>
            <DialogDescription>
              Force start "{tournamentName}"? This will skip the check-in phase and start the
              tournament immediately with all registered or checked-in players.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="forceStartReason">Reason *</Label>
            <Textarea
              id="forceStartReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g., Early start requested, testing..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (reason.trim()) {
                  onConfirm(reason.trim());
                  setShowDialog(false);
                  setReason("");
                } else {
                  toast.error("Reason is required");
                }
              }}
            >
              Force Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
