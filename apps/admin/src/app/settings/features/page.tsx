"use client";

/**
 * Feature Flags Management Page
 *
 * Create, edit, and manage feature flags for gradual rollout,
 * A/B testing, and feature targeting.
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { typedApi, useMutation, useQuery } from "@/lib/convexHelpers";
import type { FeatureFlagId } from "@/lib/convexTypes";
import {
  AlertTriangleIcon,
  BeakerIcon,
  CoinsIcon,
  FlagIcon,
  GamepadIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type Category = "gameplay" | "economy" | "social" | "experimental";

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; icon: React.ReactNode }> = {
  gameplay: {
    label: "Gameplay",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: <GamepadIcon className="h-4 w-4" />,
  },
  economy: {
    label: "Economy",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: <CoinsIcon className="h-4 w-4" />,
  },
  social: {
    label: "Social",
    color: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    icon: <UsersIcon className="h-4 w-4" />,
  },
  experimental: {
    label: "Experimental",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: <BeakerIcon className="h-4 w-4" />,
  },
};

const ROLE_OPTIONS = ["user", "moderator", "admin", "superadmin"];

interface FeatureFlag {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
  targetUserIds?: string[];
  targetRoles?: string[];
  category: Category;
  createdAt: number;
  updatedAt: number;
  updatedByUsername: string;
}

// =============================================================================
// Create Feature Flag Dialog
// =============================================================================

function CreateFeatureFlagDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("gameplay");
  const [enabled, setEnabled] = useState(false);
  const [rolloutPercentage, setRolloutPercentage] = useState<number | undefined>(undefined);
  const [useRollout, setUseRollout] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFlag = useMutation(typedApi.admin.features.createFeatureFlag);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createFlag({
        name: name.trim(),
        displayName: displayName.trim(),
        description: description.trim(),
        category,
        enabled,
        rolloutPercentage: useRollout ? rolloutPercentage : undefined,
        targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
      });

      toast.success(`Created feature flag "${name}"`);
      setOpen(false);
      resetForm();
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create feature flag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDisplayName("");
    setDescription("");
    setCategory("gameplay");
    setEnabled(false);
    setRolloutPercentage(undefined);
    setUseRollout(false);
    setTargetRoles([]);
  };

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="mr-2 h-4 w-4" />
        New Flag
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Feature Flag</DialogTitle>
          <DialogDescription>
            Create a new feature flag for gradual rollout or targeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="marketplace_enabled"
              />
              <p className="text-xs text-muted-foreground">Will be normalized to snake_case</p>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Name *</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Marketplace Feature"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enables the player-to-player marketplace..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">Turn on the feature flag globally</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gradual Rollout</Label>
                <p className="text-xs text-muted-foreground">Roll out to a percentage of users</p>
              </div>
              <Switch checked={useRollout} onCheckedChange={setUseRollout} />
            </div>

            {useRollout && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <div className="flex items-center justify-between">
                  <Label>Rollout Percentage</Label>
                  <span className="text-sm font-medium">{rolloutPercentage ?? 0}%</span>
                </div>
                <Slider
                  value={[rolloutPercentage ?? 0]}
                  onValueChange={([v]) => setRolloutPercentage(v)}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Target Roles (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <Badge
                  key={role}
                  variant={targetRoles.includes(role) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              If selected, only users with these roles will have access
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Flag"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Edit Feature Flag Dialog
// =============================================================================

function EditFeatureFlagDialog({
  flag,
  open,
  onOpenChange,
}: {
  flag: FeatureFlag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [displayName, setDisplayName] = useState(flag.displayName);
  const [description, setDescription] = useState(flag.description);
  const [category, setCategory] = useState<Category>(flag.category);
  const [enabled, setEnabled] = useState(flag.enabled);
  const [rolloutPercentage, setRolloutPercentage] = useState<number | undefined>(
    flag.rolloutPercentage
  );
  const [useRollout, setUseRollout] = useState(flag.rolloutPercentage !== undefined);
  const [targetRoles, setTargetRoles] = useState<string[]>(flag.targetRoles || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFlag = useMutation(typedApi.admin.features.updateFeatureFlag);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg types
      await (updateFlag as any)({
        featureFlagId: flag._id as FeatureFlagId,
        displayName: displayName.trim(),
        description: description.trim(),
        category,
        enabled,
        rolloutPercentage: useRollout ? rolloutPercentage : undefined,
        clearRolloutPercentage: !useRollout && flag.rolloutPercentage !== undefined,
        targetRoles: targetRoles.length > 0 ? targetRoles : undefined,
        clearTargetRoles: targetRoles.length === 0 && (flag.targetRoles?.length ?? 0) > 0,
      });

      toast.success(`Updated feature flag "${flag.name}"`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update feature flag");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Feature Flag</DialogTitle>
          <DialogDescription>
            Update settings for <code className="bg-muted px-1 rounded">{flag.name}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={flag.name} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Display Name *</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Marketplace Feature"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enables the player-to-player marketplace..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enabled</Label>
              <p className="text-xs text-muted-foreground">Turn on the feature flag globally</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Gradual Rollout</Label>
                <p className="text-xs text-muted-foreground">Roll out to a percentage of users</p>
              </div>
              <Switch checked={useRollout} onCheckedChange={setUseRollout} />
            </div>

            {useRollout && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <div className="flex items-center justify-between">
                  <Label>Rollout Percentage</Label>
                  <span className="text-sm font-medium">{rolloutPercentage ?? 0}%</span>
                </div>
                <Slider
                  value={[rolloutPercentage ?? 0]}
                  onValueChange={([v]) => setRolloutPercentage(v)}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Target Roles (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <Badge
                  key={role}
                  variant={targetRoles.includes(role) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              If selected, only users with these roles will have access
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Delete Confirmation Dialog
// =============================================================================

function DeleteFeatureFlagDialog({
  flag,
  open,
  onOpenChange,
}: {
  flag: FeatureFlag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteFlag = useMutation(typedApi.admin.features.deleteFeatureFlag);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteFlag({ featureFlagId: flag._id as FeatureFlagId });
      toast.success(`Deleted feature flag "${flag.name}"`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete feature flag");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="h-5 w-5" />
            Delete Feature Flag
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete the feature flag{" "}
            <code className="bg-muted px-1 rounded">{flag.name}</code>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Flag"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Feature Flag Card
// =============================================================================

function FeatureFlagCard({ flag }: { flag: FeatureFlag }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { hasPermission } = useAdmin();

  const toggleFlag = useMutation(typedApi.admin.features.toggleFeatureFlag);

  const handleToggle = async () => {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg/return types
      const result = (await (toggleFlag as any)({ featureFlagId: flag._id as FeatureFlagId })) as {
        message: string;
      };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle feature flag");
    }
  };

  const categoryConfig = CATEGORY_CONFIG[flag.category];
  const hasTargeting =
    (flag.targetUserIds && flag.targetUserIds.length > 0) ||
    (flag.targetRoles && flag.targetRoles.length > 0) ||
    (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{flag.displayName}</CardTitle>
                <Badge variant="outline" className={categoryConfig.color}>
                  {categoryConfig.icon}
                  <span className="ml-1">{categoryConfig.label}</span>
                </Badge>
              </div>
              <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                {flag.name}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <RoleGuard permission="admin.manage">
                <Switch checked={flag.enabled} onCheckedChange={handleToggle} />
              </RoleGuard>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-3">{flag.description}</CardDescription>

          {/* Targeting Info */}
          {hasTargeting && (
            <div className="flex flex-wrap gap-2 mb-3">
              {flag.rolloutPercentage !== undefined && (
                <Badge variant="secondary">{flag.rolloutPercentage}% rollout</Badge>
              )}
              {flag.targetRoles && flag.targetRoles.length > 0 && (
                <Badge variant="secondary">Roles: {flag.targetRoles.join(", ")}</Badge>
              )}
              {flag.targetUserIds && flag.targetUserIds.length > 0 && (
                <Badge variant="secondary">{flag.targetUserIds.length} targeted users</Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Updated {new Date(flag.updatedAt).toLocaleDateString()} by {flag.updatedByUsername}
            </p>
            <div className="flex gap-2">
              <RoleGuard permission="admin.manage">
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </RoleGuard>
              {hasPermission("admin.manage") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EditFeatureFlagDialog flag={flag} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteFeatureFlagDialog flag={flag} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function FeatureFlagsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const flagsResult = useQuery(typedApi.admin.features.listFeatureFlags, {
    category: categoryFilter === "all" ? undefined : categoryFilter,
  }) as { flags: FeatureFlag[] } | undefined;

  // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
  const statsResult = useQuery(typedApi.admin.features.getFeatureFlagStats, {}) as
    | {
        totalFlags: number;
        enabledFlags: number;
        disabledFlags: number;
        gradualRolloutFlags: number;
        byCategory: Record<string, number>;
      }
    | undefined;

  const isLoading = flagsResult === undefined;

  // Group flags by category
  const groupedFlags: Record<string, FeatureFlag[]> = {};
  if (flagsResult?.flags) {
    for (const flag of flagsResult.flags) {
      if (!groupedFlags[flag.category]) {
        groupedFlags[flag.category] = [];
      }
      groupedFlags[flag.category]?.push(flag as FeatureFlag);
    }
  }

  const categoryOrder: Category[] = ["gameplay", "economy", "social", "experimental"];

  return (
    <PageWrapper
      title="Feature Flags"
      description="Manage feature rollout and A/B testing"
      actions={
        <RoleGuard permission="admin.manage">
          <CreateFeatureFlagDialog />
        </RoleGuard>
      }
    >
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{statsResult?.totalFlags ?? "..."}</p>
              <p className="text-sm text-muted-foreground">Total Flags</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-500">
                {statsResult?.enabledFlags ?? "..."}
              </p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-500">
                {statsResult?.disabledFlags ?? "..."}
              </p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">
                {statsResult?.gradualRolloutFlags ?? "..."}
              </p>
              <p className="text-sm text-muted-foreground">Gradual Rollout</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-500">
                {Object.keys(statsResult?.byCategory ?? {}).length ?? "..."}
              </p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <FlagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by category:</span>
          <div className="flex gap-2">
            <Badge
              variant={categoryFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Badge>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Badge
                key={key}
                variant={categoryFilter === key ? "default" : "outline"}
                className={`cursor-pointer ${categoryFilter === key ? "" : config.color}`}
                onClick={() => setCategoryFilter(key)}
              >
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Flags List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : flagsResult?.flags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No feature flags found</p>
            <p className="text-sm mt-1">Create a new flag to get started</p>
          </CardContent>
        </Card>
      ) : categoryFilter !== "all" ? (
        // Show flat list when filtering
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flagsResult?.flags.map((flag) => (
            <FeatureFlagCard key={flag._id} flag={flag as FeatureFlag} />
          ))}
        </div>
      ) : (
        // Show grouped by category
        <div className="space-y-8">
          {categoryOrder.map((cat) => {
            const flags = groupedFlags[cat];
            if (!flags || flags.length === 0) return null;

            const config = CATEGORY_CONFIG[cat];
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className={config.color}>
                    {config.icon}
                    <span className="ml-1">{config.label}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({flags.length} flag{flags.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {flags.map((flag) => (
                    <FeatureFlagCard key={flag._id} flag={flag} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
