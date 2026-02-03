"use client";

/**
 * Achievement Editor Page
 *
 * Create/edit achievement definitions.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { Badge, Card, Text, Title } from "@tremor/react";
import { ArrowLeftIcon, CopyIcon, Loader2Icon, SaveIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type AchievementCategory =
  | "wins"
  | "games_played"
  | "collection"
  | "social"
  | "story"
  | "ranked"
  | "special";
type Rarity = "common" | "rare" | "epic" | "legendary";

const CATEGORIES = [
  { value: "wins", label: "Wins" },
  { value: "games_played", label: "Games Played" },
  { value: "collection", label: "Collection" },
  { value: "social", label: "Social" },
  { value: "story", label: "Story" },
  { value: "ranked", label: "Ranked" },
  { value: "special", label: "Special" },
];

const RARITIES = [
  { value: "common", label: "Common", color: "gray" },
  { value: "rare", label: "Rare", color: "blue" },
  { value: "epic", label: "Epic", color: "violet" },
  { value: "legendary", label: "Legendary", color: "amber" },
];

const REQUIREMENT_TYPES = [
  { value: "total_wins", label: "Total Wins" },
  { value: "total_games", label: "Total Games" },
  { value: "cards_collected", label: "Cards Collected" },
  { value: "friends_added", label: "Friends Added" },
  { value: "story_chapters", label: "Story Chapters Completed" },
  { value: "ranked_wins", label: "Ranked Wins" },
  { value: "legendary_cards", label: "Legendary Cards Owned" },
  { value: "consecutive_wins", label: "Consecutive Wins" },
  { value: "damage_dealt", label: "Total Damage Dealt" },
  { value: "perfect_wins", label: "Perfect Wins (Full LP)" },
];

const ICONS = ["🏆", "⭐", "🎮", "⚔️", "🛡️", "🎯", "🔥", "💎", "👑", "🌟", "🎪", "🏅"];

// =============================================================================
// Component
// =============================================================================

export default function AchievementEditorPage() {
  const params = useParams();
  const router = useRouter();
  const achievementDbId = params.achievementId as string;
  const isNew = achievementDbId === "new";

  // Form state
  const [achievementId, setAchievementId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AchievementCategory>("wins");
  const [rarity, setRarity] = useState<Rarity>("common");
  const [icon, setIcon] = useState("🏆");
  const [requirementType, setRequirementType] = useState("");
  const [targetValue, setTargetValue] = useState("1");
  const [rewardGold, setRewardGold] = useState("");
  const [rewardXp, setRewardXp] = useState("");
  const [rewardGems, setRewardGems] = useState("");
  const [rewardBadge, setRewardBadge] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateAchievementId, setDuplicateAchievementId] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries and mutations
  const existingAchievement = useConvexQuery(
    apiAny.admin.achievements.getAchievement,
    isNew ? "skip" : { achievementDbId: achievementDbId as any }
  );

  const createAchievement = useConvexMutation(apiAny.admin.achievements.createAchievement);
  const updateAchievement = useConvexMutation(apiAny.admin.achievements.updateAchievement);
  const deleteAchievement = useConvexMutation(apiAny.admin.achievements.deleteAchievement);
  const duplicateAchievement = useConvexMutation(apiAny.admin.achievements.duplicateAchievement);

  // Populate form with existing data
  useEffect(() => {
    if (existingAchievement && !isNew) {
      setAchievementId(existingAchievement.achievementId);
      setName(existingAchievement.name);
      setDescription(existingAchievement.description);
      setCategory(existingAchievement.category);
      setRarity(existingAchievement.rarity);
      setIcon(existingAchievement.icon);
      setRequirementType(existingAchievement.requirementType);
      setTargetValue(existingAchievement.targetValue.toString());
      setRewardGold(existingAchievement.rewards?.gold?.toString() ?? "");
      setRewardXp(existingAchievement.rewards?.xp?.toString() ?? "");
      setRewardGems(existingAchievement.rewards?.gems?.toString() ?? "");
      setRewardBadge(existingAchievement.rewards?.badge ?? "");
      setIsSecret(existingAchievement.isSecret);
      setIsActive(existingAchievement.isActive);
    }
  }, [existingAchievement, isNew]);

  const handleSave = async () => {
    if (!achievementId.trim()) {
      toast.error("Achievement ID is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Achievement name is required");
      return;
    }
    if (!requirementType) {
      toast.error("Requirement type is required");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const result = await createAchievement({
          achievementId: achievementId.trim(),
          name: name.trim(),
          description: description.trim(),
          category,
          rarity,
          icon,
          requirementType,
          targetValue: Number.parseInt(targetValue),
          rewardGold: rewardGold ? Number.parseInt(rewardGold) : undefined,
          rewardXp: rewardXp ? Number.parseInt(rewardXp) : undefined,
          rewardGems: rewardGems ? Number.parseInt(rewardGems) : undefined,
          rewardBadge: rewardBadge || undefined,
          isSecret,
          isActive,
        });
        toast.success(result.message);
        router.push(`/quests/achievement/${result.achievementDbId}`);
      } else {
        const result = await updateAchievement({
          achievementDbId: achievementDbId as any,
          name: name.trim(),
          description: description.trim(),
          category,
          rarity,
          icon,
          requirementType,
          targetValue: Number.parseInt(targetValue),
          rewardGold: rewardGold ? Number.parseInt(rewardGold) : undefined,
          rewardXp: rewardXp ? Number.parseInt(rewardXp) : undefined,
          rewardGems: rewardGems ? Number.parseInt(rewardGems) : undefined,
          rewardBadge: rewardBadge || undefined,
          clearRewards: !rewardGold && !rewardXp && !rewardGems && !rewardBadge,
          isSecret,
          isActive,
        });
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save achievement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAchievement({ achievementDbId: achievementDbId as any });
      toast.success(result.message);
      router.push("/quests");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete achievement");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateAchievementId.trim() || !duplicateName.trim()) {
      toast.error("Achievement ID and name are required");
      return;
    }

    try {
      const result = await duplicateAchievement({
        achievementDbId: achievementDbId as any,
        newAchievementId: duplicateAchievementId.trim(),
        newName: duplicateName.trim(),
      });
      toast.success(result.message);
      setDuplicateDialogOpen(false);
      router.push(`/quests/achievement/${result.achievementDbId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate achievement");
    }
  };

  const rarityConfig = RARITIES.find((r) => r.value === rarity);

  if (!isNew && existingAchievement === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading achievement data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (!isNew && existingAchievement === null) {
    return (
      <PageWrapper title="Not Found" description="Achievement not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Achievement Not Found</Text>
            <Button asChild className="mt-4">
              <Link href="/quests">Back to Quests</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isNew ? "New Achievement" : `Edit: ${existingAchievement?.name}`}
      description={
        isNew ? "Create a new achievement" : `Achievement ID: ${existingAchievement?.achievementId}`
      }
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/quests">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          {!isNew && (
            <>
              <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDuplicateAchievementId(`${achievementId}_copy`);
                      setDuplicateName(`${name} (Copy)`);
                    }}
                  >
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Duplicate Achievement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Create a copy with a new ID and name.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>New Achievement ID</Label>
                      <Input
                        value={duplicateAchievementId}
                        onChange={(e) => setDuplicateAchievementId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Name</Label>
                      <Input
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.target.value)}
                      />
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDuplicate}>Create Copy</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      <AlertDialogTitle>Delete Achievement</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete "{existingAchievement?.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </RoleGuard>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                {isNew ? "Create" : "Save"}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <Title>Basic Information</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Achievement ID *</Label>
                <Input
                  value={achievementId}
                  onChange={(e) => setAchievementId(e.target.value)}
                  placeholder="first_win"
                  disabled={!isNew}
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Victory"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Win your first game"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as AchievementCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rarity *</Label>
                <Select value={rarity} onValueChange={(v) => setRarity(v as Rarity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RARITIES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex gap-1 flex-wrap">
                  {ICONS.map((i) => (
                    <Button
                      key={i}
                      type="button"
                      variant={icon === i ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-10 text-lg"
                      onClick={() => setIcon(i)}
                    >
                      {i}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Requirements */}
          <Card>
            <Title>Requirements</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Requirement Type *</Label>
                <Select value={requirementType} onValueChange={setRequirementType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_TYPES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Value *</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>
          </Card>

          {/* Rewards */}
          <Card>
            <Title>Rewards (Optional)</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Gold</Label>
                <Input
                  type="number"
                  value={rewardGold}
                  onChange={(e) => setRewardGold(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>XP</Label>
                <Input
                  type="number"
                  value={rewardXp}
                  onChange={(e) => setRewardXp(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Gems</Label>
                <Input
                  type="number"
                  value={rewardGems}
                  onChange={(e) => setRewardGems(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Badge Name</Label>
                <Input
                  value={rewardBadge}
                  onChange={(e) => setRewardBadge(e.target.value)}
                  placeholder="champion"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <Title>Options</Title>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="font-medium">Active</Text>
                  <Text className="text-sm text-muted-foreground">
                    {isActive ? "Available to unlock" : "Hidden"}
                  </Text>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Text className="font-medium">Secret</Text>
                  <Text className="text-sm text-muted-foreground">
                    {isSecret ? "Hidden until unlocked" : "Visible to all"}
                  </Text>
                </div>
                <Switch checked={isSecret} onCheckedChange={setIsSecret} />
              </div>
            </div>
          </Card>

          <Card>
            <Title>Preview</Title>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
              <div className="text-4xl mb-2">{icon}</div>
              <Text className="font-bold">{name || "Achievement Name"}</Text>
              <div className="mt-1">
                <Badge color={rarityConfig?.color as any} size="sm">
                  {rarity}
                </Badge>
              </div>
              <Text className="text-sm text-muted-foreground mt-2">
                {description || "No description"}
              </Text>
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                {REQUIREMENT_TYPES.find((r) => r.value === requirementType)?.label || "Requirement"}
                : {targetValue}
              </div>
              {isSecret && <div className="mt-2 text-sm text-amber-600">🔒 Secret Achievement</div>}
            </div>
          </Card>

          {!isNew && existingAchievement?.unlockCount !== undefined && (
            <Card>
              <Title>Statistics</Title>
              <div className="mt-4 text-center">
                <Text className="text-3xl font-bold text-emerald-500">
                  {existingAchievement.unlockCount}
                </Text>
                <Text className="text-sm text-muted-foreground">Players Unlocked</Text>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
