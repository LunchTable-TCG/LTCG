"use client";

/**
 * Battle Pass Detail/Editor Page
 *
 * View and edit battle pass settings.
 */

import { PageWrapper } from "@/components/layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import {  useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { BattlePassId } from "@/lib/convexTypes";
import { Badge, Card, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CrownIcon,
  GemIcon,
  LayersIcon,
  Loader2Icon,
  PercentIcon,
  SaveIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
// Main Component
// =============================================================================

export default function BattlePassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const battlePassId = params.seasonId as string;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [xpPerTier, setXpPerTier] = useState("");
  const [premiumPrice, setPremiumPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries and mutations
  const battlePass = useConvexQuery(api.admin.battlePass.getBattlePass, {
    battlePassId: battlePassId as BattlePassId,
  });

  const updateBattlePass = useConvexMutation(api.admin.battlePass.updateBattlePassSeason);
  const deleteBattlePass = useConvexMutation(api.admin.battlePass.deleteBattlePass);

  // Populate form with existing data
  useEffect(() => {
    if (battlePass) {
      setName(battlePass.name);
      setDescription(battlePass.description ?? "");
      setXpPerTier(battlePass.xpPerTier?.toString() ?? "1000");
      setPremiumPrice(battlePass.premiumPrice?.toString() ?? "1000");
      if (battlePass.startDate) {
        setStartDate(format(new Date(battlePass.startDate), "yyyy-MM-dd'T'HH:mm"));
      }
      if (battlePass.endDate) {
        setEndDate(format(new Date(battlePass.endDate), "yyyy-MM-dd'T'HH:mm"));
      }
    }
  }, [battlePass]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSaving(true);
    try {
      const result = await updateBattlePass({
        battlePassId: battlePassId as BattlePassId,
        name: name.trim(),
        description: description.trim() || undefined,
        xpPerTier: Number.parseInt(xpPerTier, 10),
        premiumPrice: Number.parseInt(premiumPrice, 10),
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
      });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save battle pass");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteBattlePass({ battlePassId: battlePassId as BattlePassId });
      toast.success(result.message);
      router.push("/battle-pass");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete battle pass");
    } finally {
      setIsDeleting(false);
    }
  };

  if (battlePass === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading battle pass data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (battlePass === null) {
    return (
      <PageWrapper title="Not Found" description="Battle pass not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Battle Pass Not Found</Text>
            <Text className="text-muted-foreground">
              The battle pass you're looking for doesn't exist.
            </Text>
            <Button asChild className="mt-4">
              <Link href="/battle-pass">Back to Battle Pass</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  const statusConfig = STATUS_CONFIG[battlePass.status as BattlePassStatus];
  const isEditable = battlePass.status !== "ended";

  return (
    <PageWrapper
      title={battlePass.name}
      description={`Season ${battlePass.seasonNumber}: ${battlePass.seasonName}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/battle-pass">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/battle-pass/${battlePassId}/tiers`}>
              <LayersIcon className="mr-2 h-4 w-4" />
              Edit Tiers
            </Link>
          </Button>
          {battlePass.status === "upcoming" && (
            <RoleGuard permission="admin.manage">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Battle Pass</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete "{battlePass.name}"? This will
                      also delete all tier configurations. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Battle Pass"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </RoleGuard>
          )}
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
                <Label>Battle Pass Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Season 1 Battle Pass"
                  disabled={!isEditable}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Battle pass description..."
                  rows={3}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </Card>

          {/* Progression Settings */}
          <Card>
            <Title>Progression Settings</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>XP Per Tier</Label>
                <Input
                  type="number"
                  value={xpPerTier}
                  onChange={(e) => setXpPerTier(e.target.value)}
                  placeholder="1000"
                  min="100"
                  disabled={!isEditable}
                />
                <Text className="text-xs text-muted-foreground">
                  XP required to advance one tier
                </Text>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <GemIcon className="h-4 w-4 text-violet-500" />
                  Premium Price (Gems)
                </Label>
                <Input
                  type="number"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                  placeholder="1000"
                  min="0"
                  disabled={!isEditable}
                />
                <Text className="text-xs text-muted-foreground">Cost to unlock premium track</Text>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!isEditable || battlePass.status === "active"}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>
          </Card>

          {/* Tier Summary */}
          <Card>
            <div className="flex justify-between items-center">
              <Title>Tier Configuration</Title>
              <Button variant="outline" asChild>
                <Link href={`/battle-pass/${battlePassId}/tiers`}>
                  <LayersIcon className="mr-2 h-4 w-4" />
                  Edit Tiers
                </Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Text className="text-2xl font-bold">{battlePass.totalTiers}</Text>
                <Text className="text-sm text-muted-foreground">Total Tiers</Text>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Text className="text-2xl font-bold">{battlePass.tierCount}</Text>
                <Text className="text-sm text-muted-foreground">Defined Tiers</Text>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <Text className="text-2xl font-bold">
                  {battlePass.totalTiers - battlePass.tierCount}
                </Text>
                <Text className="text-sm text-muted-foreground">Missing Tiers</Text>
              </div>
            </div>
            {battlePass.tierCount < battlePass.totalTiers && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Text className="text-sm text-yellow-600">
                  Some tiers don't have rewards defined. Players won't receive rewards for those
                  tiers until configured.
                </Text>
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
                <Text className="text-muted-foreground">Season</Text>
                <Text className="font-medium">
                  S{battlePass.seasonNumber}: {battlePass.seasonName}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Created By</Text>
                <Text>{battlePass.creatorUsername}</Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Created</Text>
                <Text>{format(new Date(battlePass.createdAt), "MMM d, yyyy")}</Text>
              </div>
            </div>
          </Card>

          {/* Player Stats */}
          <Card>
            <Title className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Player Statistics
            </Title>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Total Players</Text>
                <Text className="text-xl font-bold">
                  {battlePass.stats.totalPlayers.toLocaleString()}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CrownIcon className="h-4 w-4 text-amber-500" />
                  <Text>Premium Players</Text>
                </div>
                <Text className="text-xl font-bold text-violet-600">
                  {battlePass.stats.premiumPlayers.toLocaleString()}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Free-to-Play</Text>
                <Text className="text-xl font-bold">
                  {battlePass.stats.freeToPlayPlayers.toLocaleString()}
                </Text>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PercentIcon className="h-4 w-4" />
                    <Text>Premium Conversion</Text>
                  </div>
                  <Text className="text-xl font-bold text-emerald-600">
                    {battlePass.stats.premiumConversionRate}%
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          {/* Progress Stats */}
          <Card>
            <Title className="flex items-center gap-2">
              <LayersIcon className="h-5 w-5" />
              Progress Statistics
            </Title>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Text className="text-muted-foreground">Average Tier</Text>
                <Text className="text-xl font-bold">
                  {battlePass.stats.averageTier} / {battlePass.totalTiers}
                </Text>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(battlePass.stats.averageTier / battlePass.totalTiers) * 100}%`,
                  }}
                />
              </div>
              <Text className="text-xs text-muted-foreground">
                {Math.round((battlePass.stats.averageTier / battlePass.totalTiers) * 100)}% average
                completion
              </Text>
            </div>
          </Card>

          {/* Dates */}
          <Card>
            <Title className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule
            </Title>
            <div className="mt-4 space-y-4">
              <div>
                <Text className="text-muted-foreground text-sm">Start</Text>
                <Text className="font-medium">
                  {battlePass.startDate
                    ? format(new Date(battlePass.startDate), "PPpp")
                    : "Not set"}
                </Text>
              </div>
              <div>
                <Text className="text-muted-foreground text-sm">End</Text>
                <Text className="font-medium">
                  {battlePass.endDate ? format(new Date(battlePass.endDate), "PPpp") : "Not set"}
                </Text>
              </div>
              {battlePass.status === "active" && battlePass.endDate && (
                <div className="pt-2 border-t">
                  <Text className="text-muted-foreground text-sm">Time Remaining</Text>
                  <Text className="font-bold text-lg">
                    {Math.max(
                      0,
                      Math.ceil((battlePass.endDate - Date.now()) / (24 * 60 * 60 * 1000))
                    )}{" "}
                    days
                  </Text>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
