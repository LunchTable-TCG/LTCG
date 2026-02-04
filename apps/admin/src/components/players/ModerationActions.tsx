"use client";

/**
 * ModerationActions Component
 *
 * Reusable moderation action buttons and dialogs for player management.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

interface ModerationActionsProps {
  playerId: Id<"users">;
  playerName: string;
  isBanned?: boolean;
  isSuspended?: boolean;
  onActionComplete?: () => void;
}

interface ActionDialogProps {
  playerId: Id<"users">;
  playerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

// =============================================================================
// Ban Dialog
// =============================================================================

function BanDialog({ playerId, playerName, open, onOpenChange, onComplete }: ActionDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const banPlayer = useConvexMutation(typedApi.admin.moderation.banPlayer);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the ban");
      return;
    }

    setIsSubmitting(true);
    try {
      await banPlayer({ playerId, reason: reason.trim() });
      toast.success(`${playerName} has been banned`);
      setReason("");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to ban player");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban Player</DialogTitle>
          <DialogDescription>
            Permanently ban <strong>{playerName}</strong> from the platform. This action can be
            reversed by an admin.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason for ban</Label>
            <Textarea
              id="ban-reason"
              placeholder="Describe why this player is being banned..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Banning..." : "Ban Player"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Unban Dialog
// =============================================================================

function UnbanDialog({ playerId, playerName, open, onOpenChange, onComplete }: ActionDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const unbanPlayer = useConvexMutation(typedApi.admin.moderation.unbanPlayer);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for unbanning");
      return;
    }

    setIsSubmitting(true);
    try {
      await unbanPlayer({ playerId });
      toast.success(`${playerName} has been unbanned`);
      setReason("");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unban player");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unban Player</DialogTitle>
          <DialogDescription>
            Remove the ban from <strong>{playerName}</strong>, allowing them to use the platform
            again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="unban-reason">Reason for unban</Label>
            <Textarea
              id="unban-reason"
              placeholder="Describe why this player is being unbanned..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Unbanning..." : "Unban Player"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Suspend Dialog
// =============================================================================

const SUSPENSION_DURATIONS = [
  { label: "1 Hour", value: 60 * 60 * 1000 },
  { label: "24 Hours", value: 24 * 60 * 60 * 1000 },
  { label: "3 Days", value: 3 * 24 * 60 * 60 * 1000 },
  { label: "7 Days", value: 7 * 24 * 60 * 60 * 1000 },
  { label: "14 Days", value: 14 * 24 * 60 * 60 * 1000 },
  { label: "30 Days", value: 30 * 24 * 60 * 60 * 1000 },
] as const;

function SuspendDialog({
  playerId,
  playerName,
  open,
  onOpenChange,
  onComplete,
}: ActionDialogProps) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const suspendPlayer = useConvexMutation(typedApi.admin.moderation.suspendPlayer);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the suspension");
      return;
    }
    if (!duration) {
      toast.error("Please select a suspension duration");
      return;
    }

    setIsSubmitting(true);
    try {
      const durationMs = Number.parseInt(duration, 10);
      const durationDays = durationMs / (24 * 60 * 60 * 1000);
      await suspendPlayer({
        playerId,
        reason: reason.trim(),
        durationDays,
      });
      toast.success(`${playerName} has been suspended`);
      setReason("");
      setDuration("");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suspend player");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Player</DialogTitle>
          <DialogDescription>
            Temporarily suspend <strong>{playerName}</strong> from playing. They will be
            automatically unsuspended after the duration expires.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="suspend-duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {SUSPENSION_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason for suspension</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Describe why this player is being suspended..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Suspending..." : "Suspend Player"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Unsuspend Dialog
// =============================================================================

function UnsuspendDialog({
  playerId,
  playerName,
  open,
  onOpenChange,
  onComplete,
}: ActionDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const unsuspendPlayer = useConvexMutation(typedApi.admin.moderation.unsuspendPlayer);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await unsuspendPlayer({ playerId });
      toast.success(`${playerName}'s suspension has been lifted`);
      setReason("");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unsuspend player");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Suspension</DialogTitle>
          <DialogDescription>
            Remove the suspension from <strong>{playerName}</strong> early.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="unsuspend-reason">Reason for lifting suspension</Label>
            <Textarea
              id="unsuspend-reason"
              placeholder="Describe why this suspension is being lifted early..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Removing..." : "Remove Suspension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Warn Dialog
// =============================================================================

function WarnDialog({ playerId, playerName, open, onOpenChange, onComplete }: ActionDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const warnPlayer = useConvexMutation(typedApi.admin.moderation.warnPlayer);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await warnPlayer({ playerId, reason: reason.trim() });
      toast.success(result.message || `Warning issued to ${playerName}`);
      setReason("");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to warn player");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Warning</DialogTitle>
          <DialogDescription>
            Issue an official warning to <strong>{playerName}</strong>. Warnings are recorded and
            visible to other moderators.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="warn-reason">Reason for warning</Label>
            <Textarea
              id="warn-reason"
              placeholder="Describe what the player did wrong..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Issuing..." : "Issue Warning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Add Note Dialog
// =============================================================================

function AddNoteDialog({
  playerId,
  playerName,
  open,
  onOpenChange,
  onComplete,
}: ActionDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addModerationNote = useConvexMutation(typedApi.admin.moderation.addModerationNote);

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast.error("Please provide a note");
      return;
    }

    setIsSubmitting(true);
    try {
      await addModerationNote({ playerId, note: note.trim() });
      toast.success(`Note added to ${playerName}'s record`);
      setNote("");
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Moderation Note</DialogTitle>
          <DialogDescription>
            Add a note to <strong>{playerName}</strong>&apos;s moderation history. Notes are visible
            to all moderators and recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mod-note">Note</Label>
            <Textarea
              id="mod-note"
              placeholder="Enter your moderation note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main ModerationActions Component
// =============================================================================

/**
 * Combined moderation actions with role-based access control
 */
export function ModerationActions({
  playerId,
  playerName,
  isBanned = false,
  isSuspended = false,
  onActionComplete,
}: ModerationActionsProps) {
  const [banOpen, setBanOpen] = useState(false);
  const [unbanOpen, setUnbanOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Add Note Button - Available to moderators+ */}
      <RoleGuard permission="player.view">
        <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
          Add Note
        </Button>
        <AddNoteDialog
          playerId={playerId}
          playerName={playerName}
          open={noteOpen}
          onOpenChange={setNoteOpen}
          onComplete={onActionComplete}
        />
      </RoleGuard>

      {/* Warn Button - Available to moderators+ */}
      <RoleGuard permission="player.warn">
        <Button
          variant="outline"
          size="sm"
          className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
          onClick={() => setWarnOpen(true)}
          disabled={isBanned}
        >
          Warn
        </Button>
        <WarnDialog
          playerId={playerId}
          playerName={playerName}
          open={warnOpen}
          onOpenChange={setWarnOpen}
          onComplete={onActionComplete}
        />
      </RoleGuard>

      {/* Suspend/Unsuspend Buttons */}
      <RoleGuard permission="player.suspend">
        {isSuspended ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setUnsuspendOpen(true)}>
              Unsuspend
            </Button>
            <UnsuspendDialog
              playerId={playerId}
              playerName={playerName}
              open={unsuspendOpen}
              onOpenChange={setUnsuspendOpen}
              onComplete={onActionComplete}
            />
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
              onClick={() => setSuspendOpen(true)}
              disabled={isBanned}
            >
              Suspend
            </Button>
            <SuspendDialog
              playerId={playerId}
              playerName={playerName}
              open={suspendOpen}
              onOpenChange={setSuspendOpen}
              onComplete={onActionComplete}
            />
          </>
        )}
      </RoleGuard>

      {/* Ban/Unban Buttons */}
      <RoleGuard permission="player.ban">
        {isBanned ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setUnbanOpen(true)}>
              Unban
            </Button>
            <UnbanDialog
              playerId={playerId}
              playerName={playerName}
              open={unbanOpen}
              onOpenChange={setUnbanOpen}
              onComplete={onActionComplete}
            />
          </>
        ) : (
          <>
            <Button variant="destructive" size="sm" onClick={() => setBanOpen(true)}>
              Ban
            </Button>
            <BanDialog
              playerId={playerId}
              playerName={playerName}
              open={banOpen}
              onOpenChange={setBanOpen}
              onComplete={onActionComplete}
            />
          </>
        )}
      </RoleGuard>
    </div>
  );
}
