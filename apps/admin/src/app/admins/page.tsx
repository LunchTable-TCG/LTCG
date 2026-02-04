"use client";

/**
 * Admin Role Management Page
 *
 * Full role management with hierarchy, expiration tracking, and actions.
 * Uses the new temporal role system from convex/admin/roles.ts.
 */

import { DataTable } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminContext";
import { typedApi, useMutation, useQuery } from "@/lib/convexHelpers";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types";
import type { Id } from "@convex/_generated/dataModel";
import { Badge, Card, Text, Title } from "@tremor/react";
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Clock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type AdminRoleType = "superadmin" | "admin" | "moderator";

interface AdminListItem {
  userId: Id<"users">;
  username?: string;
  email?: string;
  role: string;
  grantedBy: {
    userId: Id<"users">;
    username?: string;
    email?: string;
  };
  grantedAt: number;
  expiresAt?: number;
  grantNote?: string;
  isTemporary: boolean;
  isExpired: boolean;
  timeRemaining?: number;
}

interface ExpiringRole {
  userId: Id<"users">;
  username?: string;
  email?: string;
  role: string;
  expiresAt?: number;
  timeRemaining: number;
  grantNote?: string;
  grantedBy: {
    userId: Id<"users">;
    username?: string;
  };
}

// =============================================================================
// Constants
// =============================================================================

const ROLE_LABELS: Record<AdminRoleType, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
};

const ROLE_COLORS: Record<AdminRoleType, "red" | "blue" | "amber"> = {
  superadmin: "red",
  admin: "blue",
  moderator: "amber",
};

const ROLE_DESCRIPTIONS: Record<AdminRoleType, string> = {
  superadmin: "Full access, can manage other admins and superadmins",
  admin: "Most admin functions, can manage moderators",
  moderator: "Player moderation only (ban/suspend/warn)",
};

const ROLE_HIERARCHY: AdminRoleType[] = ["moderator", "admin", "superadmin"];

// =============================================================================
// Player Option Type (for user search)
// =============================================================================

interface PlayerOption {
  playerId: Id<"users">;
  name: string;
  type: "human" | "ai";
  eloRating: number;
  rank: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expired";

  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

function getRoleIcon(role: AdminRoleType) {
  switch (role) {
    case "superadmin":
      return <ShieldAlert className="h-4 w-4" />;
    case "admin":
      return <ShieldCheck className="h-4 w-4" />;
    case "moderator":
      return <Shield className="h-4 w-4" />;
  }
}

// =============================================================================
// Components
// =============================================================================

function RoleBadge({ role }: { role: string }) {
  const roleType = role as AdminRoleType;
  return (
    <Badge color={ROLE_COLORS[roleType] || "gray"} size="sm">
      <span className="flex items-center gap-1">
        {getRoleIcon(roleType)}
        {ROLE_LABELS[roleType] || role}
      </span>
    </Badge>
  );
}

function ExpirationBadge({ admin }: { admin: AdminListItem }) {
  if (!admin.isTemporary) {
    return (
      <Badge color="emerald" size="sm">
        Permanent
      </Badge>
    );
  }

  if (admin.isExpired) {
    return (
      <Badge color="red" size="sm">
        Expired
      </Badge>
    );
  }

  const daysRemaining = admin.timeRemaining
    ? Math.floor(admin.timeRemaining / (24 * 60 * 60 * 1000))
    : 0;

  if (daysRemaining <= 3) {
    return (
      <Badge color="red" size="sm">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTimeRemaining(admin.timeRemaining || 0)}
        </span>
      </Badge>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <Badge color="amber" size="sm">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatTimeRemaining(admin.timeRemaining || 0)}
        </span>
      </Badge>
    );
  }

  return (
    <Badge color="blue" size="sm">
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatTimeRemaining(admin.timeRemaining || 0)}
      </span>
    </Badge>
  );
}

function ExpiringRoleActions({ role }: { role: ExpiringRole }) {
  const [isExtending, setIsExtending] = useState(false);
  const [isMakingPermanent, setIsMakingPermanent] = useState(false);

  // Use type assertion to avoid TS2589 deep type instantiation
  const extendRoleMutation = typedApi.admin.roles.extendRole;
  const extendRole = useMutation(extendRoleMutation);
  const makeRolePermanentMutation = typedApi.admin.roles.makeRolePermanent;
  const makeRolePermanent = useMutation(makeRolePermanentMutation);

  const handleQuickExtend = async () => {
    setIsExtending(true);
    try {
      // Quick extend by 30 days
      const newExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await extendRole({
        targetUserId: role.userId,
        newExpiresAt,
      });
      toast.success(`Extended ${role.username || "user"}'s role by 30 days`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extend role");
    } finally {
      setIsExtending(false);
    }
  };

  const handleMakePermanent = async () => {
    setIsMakingPermanent(true);
    try {
      await makeRolePermanent({
        targetUserId: role.userId,
      });
      toast.success(`Made ${role.username || "user"}'s role permanent`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to make role permanent");
    } finally {
      setIsMakingPermanent(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleQuickExtend}
        disabled={isExtending}
        className="h-7 text-xs"
      >
        {isExtending ? "..." : "+30 days"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleMakePermanent}
        disabled={isMakingPermanent}
        className="h-7 text-xs"
      >
        {isMakingPermanent ? "..." : "Permanent"}
      </Button>
    </div>
  );
}

function ExpiringRolesAlert({ expiringRoles }: { expiringRoles: ExpiringRole[] }) {
  if (expiringRoles.length === 0) return null;

  // Sort by time remaining (soonest first)
  const sortedRoles = [...expiringRoles].sort((a, b) => a.timeRemaining - b.timeRemaining);

  return (
    <Alert className="mb-6 border-amber-500 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-500">
        Roles Expiring Soon ({expiringRoles.length})
      </AlertTitle>
      <AlertDescription>
        <div className="mt-3 space-y-3">
          {sortedRoles.map((role) => {
            const daysRemaining = Math.floor(role.timeRemaining / (24 * 60 * 60 * 1000));
            const isUrgent = daysRemaining <= 3;

            return (
              <div
                key={String(role.userId)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md",
                  isUrgent ? "bg-red-500/10" : "bg-amber-500/5"
                )}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {role.username || role.email || String(role.userId).slice(0, 12)}
                    </span>
                    <RoleBadge role={role.role} />
                  </div>
                  <span className={cn("text-xs", isUrgent ? "text-red-600" : "text-amber-600")}>
                    Expires in {formatTimeRemaining(role.timeRemaining)}
                    {role.expiresAt && ` (${new Date(role.expiresAt).toLocaleDateString()})`}
                  </span>
                  {role.grantNote && (
                    <span className="text-xs text-muted-foreground">Note: {role.grantNote}</span>
                  )}
                </div>
                <ExpiringRoleActions role={role} />
              </div>
            );
          })}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function UserSearchCombobox({
  selectedUserId,
  onSelectUser,
}: {
  selectedUserId: Id<"users"> | null;
  onSelectUser: (userId: Id<"users"> | null, displayName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch player list for search
  const players = useQuery(typedApi.admin.admins.listPlayers, { limit: 200 }) as
    | PlayerOption[]
    | undefined;

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (!searchQuery.trim()) return players.slice(0, 20); // Show first 20 by default

    const query = searchQuery.toLowerCase();
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(query) || String(p.playerId).toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  // Get selected player name
  const selectedPlayer = players?.find((p) => p.playerId === selectedUserId);
  const displayValue = selectedPlayer
    ? selectedPlayer.name
    : selectedUserId
      ? `User: ${String(selectedUserId).slice(0, 12)}...`
      : "Select a user...";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by username or ID..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {players === undefined ? "Loading users..." : "No users found."}
            </CommandEmpty>
            <CommandGroup heading="Users">
              {filteredPlayers.map((player) => (
                <CommandItem
                  key={String(player.playerId)}
                  value={String(player.playerId)}
                  onSelect={() => {
                    onSelectUser(player.playerId, player.name);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserId === player.playerId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {String(player.playerId).slice(0, 16)}... |{" "}
                      {player.type === "human" ? "Human" : "AI"} | ELO: {player.eloRating}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function GrantRoleDialog() {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);
  const [role, setRole] = useState<AdminRoleType>("moderator");
  const [grantNote, setGrantNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grantRole = useMutation(typedApi.admin.roles.grantRole);

  const handleSelectUser = (userId: Id<"users"> | null, displayName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(displayName);
  };

  const handleSubmit = async () => {
    const targetUserId = useManualInput ? manualUserId.trim() : selectedUserId;

    if (!targetUserId) {
      toast.error("Please select or enter a user");
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = expiresInDays
        ? Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000
        : undefined;

      await grantRole({
        targetUserId: targetUserId as Id<"users">,
        role,
        expiresAt,
        grantNote: grantNote || undefined,
      });

      toast.success(`Granted ${ROLE_LABELS[role]} role to ${selectedUserName || "user"}`);
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId(null);
    setSelectedUserName("");
    setManualUserId("");
    setUseManualInput(false);
    setRole("moderator");
    setGrantNote("");
    setExpiresInDays("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Grant Admin Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Grant Admin Role</DialogTitle>
          <DialogDescription>
            Assign an admin role to a user. You can only grant roles below your own level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>User</Label>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setUseManualInput(!useManualInput)}
              >
                {useManualInput ? "Search users" : "Enter ID manually"}
              </Button>
            </div>
            {useManualInput ? (
              <Input
                placeholder="Enter user ID (e.g., k97f...)"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
              />
            ) : (
              <UserSearchCombobox selectedUserId={selectedUserId} onSelectUser={handleSelectUser} />
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRoleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_HIERARCHY.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(r)}
                      <div>
                        <div>{ROLE_LABELS[r]}</div>
                        <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label>Expires In (days)</Label>
            <Input
              type="number"
              placeholder="Leave empty for permanent role"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min="1"
            />
            {expiresInDays && Number(expiresInDays) > 0 && (
              <p className="text-xs text-muted-foreground">
                Role will expire on:{" "}
                {new Date(
                  Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
              </p>
            )}
            {!expiresInDays && (
              <p className="text-xs text-muted-foreground">
                Temporary roles are useful for trial periods or contractor access.
              </p>
            )}
          </div>

          {/* Grant Note */}
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              placeholder="Why is this role being granted?"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Granting..." : "Grant Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RevokeRoleDialog({
  admin,
  onClose,
}: {
  admin: AdminListItem;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const revokeRole = useMutation(typedApi.admin.roles.revokeRole);

  const handleRevoke = async () => {
    setIsSubmitting(true);
    try {
      await revokeRole({
        targetUserId: admin.userId,
      });
      toast.success("Admin role revoked");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Revoke Admin Role</DialogTitle>
        <DialogDescription>
          Are you sure you want to revoke the{" "}
          {ROLE_LABELS[admin.role as AdminRoleType] || admin.role} role from this user?
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <Text className="font-medium">{admin.username || admin.email || "Unknown User"}</Text>
          <Text className="text-sm font-mono text-muted-foreground">
            {String(admin.userId).slice(0, 20)}...
          </Text>
          <div className="mt-2 flex gap-2">
            <RoleBadge role={admin.role} />
            <ExpirationBadge admin={admin} />
          </div>
        </div>

        {admin.grantNote && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <Text className="text-xs text-muted-foreground">Grant Note:</Text>
            <Text className="text-sm">{admin.grantNote}</Text>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleRevoke} disabled={isSubmitting}>
          <UserMinus className="h-4 w-4 mr-2" />
          {isSubmitting ? "Revoking..." : "Revoke Role"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ExtendRoleDialog({
  admin,
  onClose,
}: {
  admin: AdminListItem;
  onClose: () => void;
}) {
  const [extendDays, setExtendDays] = useState("30");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extendRole = useMutation(typedApi.admin.roles.extendRole);

  const handleExtend = async () => {
    if (!extendDays || Number(extendDays) <= 0) {
      toast.error("Please enter a valid number of days");
      return;
    }

    setIsSubmitting(true);
    try {
      const newExpiresAt = Date.now() + Number(extendDays) * 24 * 60 * 60 * 1000;
      await extendRole({
        targetUserId: admin.userId,
        newExpiresAt,
      });
      toast.success(`Extended role by ${extendDays} days`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extend role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Extend Role Expiration</DialogTitle>
        <DialogDescription>
          Extend the {ROLE_LABELS[admin.role as AdminRoleType] || admin.role} role for this user.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <Text className="font-medium">{admin.username || admin.email || "Unknown User"}</Text>
          <div className="mt-2 flex gap-2">
            <RoleBadge role={admin.role} />
            <ExpirationBadge admin={admin} />
          </div>
          {admin.expiresAt && (
            <Text className="text-xs text-muted-foreground mt-2">
              Current expiration: {new Date(admin.expiresAt).toLocaleString()}
            </Text>
          )}
        </div>

        <div className="space-y-2">
          <Label>Extend By (days)</Label>
          <Input
            type="number"
            value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)}
            min="1"
          />
          {extendDays && Number(extendDays) > 0 && (
            <Text className="text-xs text-muted-foreground">
              New expiration:{" "}
              {new Date(Date.now() + Number(extendDays) * 24 * 60 * 60 * 1000).toLocaleString()}
            </Text>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleExtend} disabled={isSubmitting}>
          <Clock className="h-4 w-4 mr-2" />
          {isSubmitting ? "Extending..." : "Extend Role"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function MakePermanentDialog({
  admin,
  onClose,
}: {
  admin: AdminListItem;
  onClose: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const makeRolePermanent = useMutation(typedApi.admin.roles.makeRolePermanent);

  const handleMakePermanent = async () => {
    setIsSubmitting(true);
    try {
      await makeRolePermanent({
        targetUserId: admin.userId,
      });
      toast.success("Role is now permanent");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to make role permanent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Make Role Permanent</DialogTitle>
        <DialogDescription>
          Remove the expiration from this role, making it permanent.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <Text className="font-medium">{admin.username || admin.email || "Unknown User"}</Text>
          <div className="mt-2 flex gap-2">
            <RoleBadge role={admin.role} />
            <ExpirationBadge admin={admin} />
          </div>
          {admin.expiresAt && (
            <Text className="text-xs text-muted-foreground mt-2">
              Current expiration: {new Date(admin.expiresAt).toLocaleString()}
            </Text>
          )}
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Confirmation Required</AlertTitle>
          <AlertDescription>
            This action will remove the expiration date. The user will have this role indefinitely
            until manually revoked.
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleMakePermanent} disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Make Permanent"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AdminActions({ admin, myRole }: { admin: AdminListItem; myRole: string | null }) {
  const [actionDialog, setActionDialog] = useState<"revoke" | "extend" | "permanent" | null>(null);

  // Check if current user can manage this admin
  const myRoleIndex = myRole ? ROLE_HIERARCHY.indexOf(myRole as AdminRoleType) : -1;
  const targetRoleIndex = ROLE_HIERARCHY.indexOf(admin.role as AdminRoleType);
  const canManage = myRoleIndex > targetRoleIndex;

  if (!canManage) return null;

  return (
    <div className="flex gap-2">
      {admin.isTemporary && !admin.isExpired && (
        <>
          <Dialog
            open={actionDialog === "extend"}
            onOpenChange={(open) => setActionDialog(open ? "extend" : null)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Extend
              </Button>
            </DialogTrigger>
            <ExtendRoleDialog admin={admin} onClose={() => setActionDialog(null)} />
          </Dialog>

          <Dialog
            open={actionDialog === "permanent"}
            onOpenChange={(open) => setActionDialog(open ? "permanent" : null)}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Make Permanent
              </Button>
            </DialogTrigger>
            <MakePermanentDialog admin={admin} onClose={() => setActionDialog(null)} />
          </Dialog>
        </>
      )}

      <Dialog
        open={actionDialog === "revoke"}
        onOpenChange={(open) => setActionDialog(open ? "revoke" : null)}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Revoke
          </Button>
        </DialogTrigger>
        <RevokeRoleDialog admin={admin} onClose={() => setActionDialog(null)} />
      </Dialog>
    </div>
  );
}

function RoleHierarchyCard() {
  return (
    <Card className="mb-6">
      <Title>Role Hierarchy</Title>
      <Text className="text-muted-foreground mt-1">
        Higher roles can manage lower roles. Each role inherits permissions from roles below it.
      </Text>
      <div className="mt-4 flex flex-col gap-2">
        {[...ROLE_HIERARCHY].reverse().map((role, index) => (
          <div
            key={role}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
            style={{ marginLeft: index * 16 }}
          >
            <div className="flex items-center gap-2">
              {getRoleIcon(role)}
              <Badge color={ROLE_COLORS[role]} size="sm">
                {ROLE_LABELS[role]}
              </Badge>
            </div>
            <Text className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CleanupExpiredButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cleanupExpiredRoles = useMutation(typedApi.admin.roles.cleanupExpiredRoles);

  const handleCleanup = async () => {
    setIsSubmitting(true);
    try {
      const result = (await cleanupExpiredRoles({})) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cleanup expired roles");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCleanup} disabled={isSubmitting}>
      {isSubmitting ? "Cleaning..." : "Cleanup Expired Roles"}
    </Button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AdminManagementPage() {
  const { role: myRole, adminRole } = useAdmin();

  // Fetch all admins using the new API
  const admins = useQuery(typedApi.admin.roles.listAdminsByRole, {}) as AdminListItem[] | undefined;

  // Fetch expiring roles (only for admins and superadmins)
  const expiringRoles = useQuery(
    typedApi.admin.roles.getExpiringRoles,
    adminRole?.isFullAdmin ? { withinDays: 7 } : "skip"
  ) as ExpiringRole[] | undefined;

  const columns: ColumnDef<AdminListItem>[] = [
    {
      id: "user",
      header: "User",
      cell: (admin: AdminListItem) => (
        <div>
          <div className="font-medium">{admin.username || admin.email || "Unknown User"}</div>
          <div className="text-xs font-mono text-muted-foreground">
            {String(admin.userId).slice(0, 16)}...
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (admin: AdminListItem) => <RoleBadge role={admin.role} />,
    },
    {
      id: "status",
      header: "Status",
      cell: (admin: AdminListItem) => <ExpirationBadge admin={admin} />,
    },
    {
      id: "grantedAt",
      header: "Granted",
      cell: (admin: AdminListItem) => (
        <div className="text-sm">
          <div>{new Date(admin.grantedAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            by {admin.grantedBy.username || admin.grantedBy.email || "Unknown"}
          </div>
        </div>
      ),
    },
    {
      id: "expiresAt",
      header: "Expires",
      cell: (admin: AdminListItem) => (
        <div className="text-sm text-muted-foreground">
          {admin.expiresAt ? new Date(admin.expiresAt).toLocaleDateString() : "Never"}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (admin: AdminListItem) => <AdminActions admin={admin} myRole={myRole} />,
    },
  ];

  // Only moderator+ can access this page
  if (!myRole || !["moderator", "admin", "superadmin"].includes(myRole)) {
    return (
      <PageWrapper title="Admin Management" description="Manage admin roles and permissions">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Access Denied</Text>
            <Text className="text-muted-foreground">
              You do not have permission to access admin management.
            </Text>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const activeAdmins = admins?.filter((a) => !a.isExpired) ?? [];

  // Count by role
  const roleCounts = {
    superadmin: activeAdmins.filter((a) => a.role === "superadmin").length,
    admin: activeAdmins.filter((a) => a.role === "admin").length,
    moderator: activeAdmins.filter((a) => a.role === "moderator").length,
  };

  // Count temporary vs permanent
  const temporaryCount = activeAdmins.filter((a) => a.isTemporary).length;
  const permanentCount = activeAdmins.filter((a) => !a.isTemporary).length;

  return (
    <PageWrapper
      title="Admin Management"
      description="Manage admin roles and permissions"
      actions={
        <div className="flex gap-2">
          {myRole === "superadmin" && <CleanupExpiredButton />}
          {adminRole?.isFullAdmin && <GrantRoleDialog />}
        </div>
      }
    >
      {/* Expiring Roles Warning */}
      {expiringRoles && <ExpiringRolesAlert expiringRoles={expiringRoles} />}

      {/* Role Overview Stats */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        {(["superadmin", "admin", "moderator"] as AdminRoleType[]).map((role) => (
          <Card key={role}>
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</Text>
                <Text className="text-2xl font-bold">{roleCounts[role]}</Text>
              </div>
              <div className="p-2 rounded-full bg-muted">{getRoleIcon(role)}</div>
            </div>
          </Card>
        ))}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-muted-foreground">Temporary</Text>
              <Text className="text-2xl font-bold">{temporaryCount}</Text>
            </div>
            <div className="p-2 rounded-full bg-muted">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-muted-foreground">Permanent</Text>
              <Text className="text-2xl font-bold">{permanentCount}</Text>
            </div>
            <div className="p-2 rounded-full bg-muted">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Role Hierarchy */}
      <RoleHierarchyCard />

      {/* Active Admins Table */}
      <Card>
        <Title>Active Admins ({activeAdmins.length})</Title>
        <div className="mt-4">
          <DataTable
            data={activeAdmins}
            columns={columns}
            searchable
            searchColumns={["userId"] as (keyof AdminListItem)[]}
            searchPlaceholder="Search by user ID..."
            emptyMessage="No active admins"
            isLoading={admins === undefined}
            rowKey="userId"
          />
        </div>
      </Card>
    </PageWrapper>
  );
}
