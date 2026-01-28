"use client";

/**
 * Admin Management Page
 *
 * Super admin only - manage admin roles and permissions.
 */

import { DataTable } from "@/components/data";
import { PageWrapper } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/contexts/AdminContext";
import type { AdminRoleData, ColumnDef } from "@/types";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge, Card, Text, Title } from "@tremor/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type AdminRoleType = "superadmin" | "admin" | "moderator";

// =============================================================================
// Constants
// =============================================================================

const ROLE_LABELS: Record<AdminRoleType, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
};

const ROLE_COLORS: Record<AdminRoleType, string> = {
  superadmin: "red",
  admin: "blue",
  moderator: "amber",
};

const ROLE_DESCRIPTIONS: Record<AdminRoleType, string> = {
  superadmin: "Full access, can manage other admins",
  admin: "Most admin functions, cannot manage superadmins",
  moderator: "Player moderation only (ban/suspend/warn)",
};

// =============================================================================
// Components
// =============================================================================

function RoleBadge({ role }: { role: AdminRoleType }) {
  return (
    <Badge color={ROLE_COLORS[role]} size="sm">
      {ROLE_LABELS[role]}
    </Badge>
  );
}

function GrantRoleDialog() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AdminRoleType>("moderator");
  const [notes, setNotes] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grantRole = useMutation(api.admin.admin.grantAdminRole);

  const handleSubmit = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Backend doesn't support expiresAt or notes yet
      // const expiresAt = expiresInDays
      //   ? Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000
      //   : undefined;

      await grantRole({
        userId: userId as Id<"users">,
        role,
      });

      toast.success(`Granted ${ROLE_LABELS[role]} role`);
      setOpen(false);
      setUserId("");
      setRole("moderator");
      setNotes("");
      setExpiresInDays("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Grant Admin Role</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Admin Role</DialogTitle>
          <DialogDescription>
            Assign an admin role to a user. Only super admins can perform this action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>User ID</Label>
            <Input
              placeholder="Enter user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRoleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["superadmin", "admin", "moderator"] as AdminRoleType[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    <div>
                      <div>{ROLE_LABELS[r]}</div>
                      <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expires In (days, optional)</Label>
            <Input
              type="number"
              placeholder="Leave empty for no expiration"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Why is this role being granted?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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

function RevokeRoleDialog({ admin, onClose }: { admin: AdminRoleData; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const revokeRole = useMutation(api.admin.admin.revokeAdminRole);

  const handleRevoke = async () => {
    setIsSubmitting(true);
    try {
      await revokeRole({
        userId: admin.userId,
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
          Are you sure you want to revoke the {ROLE_LABELS[admin.role]} role from this user?
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <Text className="text-sm font-mono">{admin.userId}</Text>
          <div className="mt-1">
            <RoleBadge role={admin.role} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Textarea
            placeholder="Why is this role being revoked?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleRevoke} disabled={isSubmitting}>
          {isSubmitting ? "Revoking..." : "Revoke Role"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function AdminManagementPage() {
  const { role: myRole } = useAdmin();
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRoleData | null>(null);

  const admins = useQuery(api.admin.admin.listAdmins, {}) as AdminRoleData[] | undefined;

  const columns: ColumnDef<AdminRoleData>[] = [
    {
      id: "userId",
      header: "User ID",
      cell: (admin: AdminRoleData) => (
        <div className="font-mono text-sm">{String(admin.userId).slice(0, 16)}...</div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (admin: AdminRoleData) => <RoleBadge role={admin.role} />,
    },
    {
      id: "isActive",
      header: "Status",
      cell: (admin: AdminRoleData) => (
        <Badge color={admin.isActive ? "emerald" : "gray"} size="sm">
          {admin.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "grantedAt",
      header: "Granted",
      cell: (admin: AdminRoleData) => (
        <div className="text-sm text-muted-foreground">
          {new Date(admin.grantedAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: "expiresAt",
      header: "Expires",
      cell: (admin: AdminRoleData) => (
        <div className="text-sm text-muted-foreground">
          {admin.expiresAt ? new Date(admin.expiresAt).toLocaleDateString() : "Never"}
        </div>
      ),
    },
    {
      id: "_id",
      header: "Actions",
      cell: (admin: AdminRoleData) => (
        <div className="flex gap-2">
          {myRole === "superadmin" && admin.isActive && admin.role !== "superadmin" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setSelectedAdmin(admin)}>
                  Revoke
                </Button>
              </DialogTrigger>
              {selectedAdmin && (
                <RevokeRoleDialog admin={selectedAdmin} onClose={() => setSelectedAdmin(null)} />
              )}
            </Dialog>
          )}
        </div>
      ),
    },
  ];

  // Only superadmin can access this page
  if (myRole !== "superadmin") {
    return (
      <PageWrapper title="Admin Management" description="Manage admin roles and permissions">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Access Denied</Text>
            <Text className="text-muted-foreground">
              Only super admins can access admin management.
            </Text>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const activeAdmins = admins?.filter((a) => a.isActive) ?? [];
  const inactiveAdmins = admins?.filter((a) => !a.isActive) ?? [];

  return (
    <PageWrapper
      title="Admin Management"
      description="Manage admin roles and permissions"
      actions={<GrantRoleDialog />}
    >
      {/* Role Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {(["super_admin", "admin", "moderator", "support"] as AdminRoleType[]).map((role) => (
          <Card key={role}>
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</Text>
                <Text className="text-2xl font-bold">
                  {activeAdmins.filter((a) => a.role === role).length}
                </Text>
              </div>
              <RoleBadge role={role} />
            </div>
          </Card>
        ))}
      </div>

      {/* Role Descriptions */}
      <Card className="mb-6">
        <Title>Role Permissions</Title>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(["super_admin", "admin", "moderator", "support"] as AdminRoleType[]).map((role) => (
            <div key={role} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <RoleBadge role={role} />
              </div>
              <Text className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Admins */}
      <Card className="mb-6">
        <Title>Active Admins ({activeAdmins.length})</Title>
        <div className="mt-4">
          <DataTable
            data={activeAdmins}
            columns={columns}
            searchable
            searchColumns={["userId"]}
            searchPlaceholder="Search by user ID..."
            emptyMessage="No active admins"
            isLoading={admins === undefined}
            rowKey="_id"
          />
        </div>
      </Card>

      {/* Inactive Admins */}
      {inactiveAdmins.length > 0 && (
        <Card>
          <Title>Inactive Admins ({inactiveAdmins.length})</Title>
          <div className="mt-4">
            <DataTable
              data={inactiveAdmins}
              columns={columns}
              searchable
              searchColumns={["userId"]}
              searchPlaceholder="Search by user ID..."
              emptyMessage="No inactive admins"
              isLoading={admins === undefined}
              rowKey="_id"
            />
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
