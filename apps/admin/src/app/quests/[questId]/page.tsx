"use client";

/**
 * Quest Editor Page
 *
 * Create/edit quest definitions.
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
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { QuestId } from "@/lib/convexTypes";
import { Badge, Card, Text, Title } from "@tremor/react";
import { ArrowLeftIcon, CopyIcon, Loader2Icon, SaveIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types & Constants
// =============================================================================

type QuestType = "daily" | "weekly" | "achievement";
type RequirementType =
  | "win_games"
  | "play_games"
  | "play_cards"
  | "deal_damage"
  | "win_with_archetype"
  | "collect_cards"
  | "spend_gold"
  | "complete_story";
type GameMode = "ranked" | "casual" | "story";

const QUEST_TYPES = [
  { value: "daily", label: "Daily", description: "Resets every 24 hours" },
  { value: "weekly", label: "Weekly", description: "Resets every 7 days" },
  { value: "achievement", label: "Achievement", description: "One-time completion" },
];

const REQUIREMENT_TYPES = [
  { value: "win_games", label: "Win Games" },
  { value: "play_games", label: "Play Games" },
  { value: "play_cards", label: "Play Cards" },
  { value: "deal_damage", label: "Deal Damage" },
  { value: "destroy_stereotypes", label: "Destroy Stereotypes" },
  { value: "win_ranked", label: "Win Ranked Games" },
  { value: "complete_story", label: "Complete Story Chapters" },
  { value: "collect_cards", label: "Collect Cards" },
  { value: "spend_gold", label: "Spend Gold" },
  { value: "earn_gold", label: "Earn Gold" },
];

const GAME_MODES = [
  { value: "ranked", label: "Ranked" },
  { value: "casual", label: "Casual" },
  { value: "story", label: "Story" },
];

// =============================================================================
// Component
// =============================================================================

export default function QuestEditorPage() {
  const params = useParams<{ questId: string }>();
  const router = useRouter();
  const questIdParam = params.questId;

  // Guard against empty or invalid questId
  const isNew = questIdParam === "new";
  const questDbId = questIdParam && questIdParam !== "new" ? (questIdParam as QuestId) : null;

  // Form state
  const [questId, setQuestId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questType, setQuestType] = useState<QuestType>("daily");
  const [requirementType, setRequirementType] = useState("");
  const [targetValue, setTargetValue] = useState("1");
  const [rewardGold, setRewardGold] = useState("100");
  const [rewardXp, setRewardXp] = useState("50");
  const [rewardGems, setRewardGems] = useState("");
  const [filterGameMode, setFilterGameMode] = useState<string>("none");
  const [filterArchetype, setFilterArchetype] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateQuestId, setDuplicateQuestId] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries and mutations
  const existingQuest = useConvexQuery(
    typedApi.admin.quests.getQuest,
    isNew || !questDbId ? "skip" : { questDbId }
  );

  const createQuest = useConvexMutation(typedApi.admin.quests.createQuest);
  const updateQuest = useConvexMutation(typedApi.admin.quests.updateQuest);
  const deleteQuest = useConvexMutation(typedApi.admin.quests.deleteQuest);
  const duplicateQuest = useConvexMutation(typedApi.admin.quests.duplicateQuest);

  // Populate form with existing data
  useEffect(() => {
    if (existingQuest && !isNew) {
      setQuestId(existingQuest.questId);
      setName(existingQuest.name);
      setDescription(existingQuest.description);
      setQuestType(existingQuest.questType as QuestType);
      setRequirementType(existingQuest.requirementType as RequirementType);
      setTargetValue(existingQuest.targetValue?.toString() ?? "0");
      setRewardGold(existingQuest.rewards.gold.toString());
      setRewardXp(existingQuest.rewards.xp.toString());
      setRewardGems(existingQuest.rewards.gems?.toString() ?? "");
      setFilterGameMode(existingQuest.filters?.gameMode ?? "none");
      setFilterArchetype(existingQuest.filters?.archetype ?? "");
      setIsActive(existingQuest.isActive);
    }
  }, [existingQuest, isNew]);

  const handleSave = async () => {
    if (!questId.trim()) {
      toast.error("Quest ID is required");
      return;
    }
    if (!name.trim()) {
      toast.error("Quest name is required");
      return;
    }
    if (!requirementType) {
      toast.error("Requirement type is required");
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const result = (await createQuest({
          questId: questId.trim(),
          name: name.trim(),
          description: description.trim(),
          questType,
          requirementType,
          targetValue: Number.parseInt(targetValue),
          rewardGold: Number.parseInt(rewardGold) || 0,
          rewardXp: Number.parseInt(rewardXp) || 0,
          rewardGems: rewardGems ? Number.parseInt(rewardGems) : undefined,
          filterGameMode: filterGameMode !== "none" ? (filterGameMode as GameMode) : undefined,
          filterArchetype: filterArchetype || undefined,
          isActive,
        })) as { message: string; questDbId: string };
        toast.success(result.message);
        router.push(`/quests/${result.questDbId}`);
      } else {
        if (!questDbId) {
          toast.error("Invalid quest ID");
          return;
        }
        const result = (await updateQuest({
          questDbId,
          name: name.trim(),
          description: description.trim(),
          requirementType,
          targetValue: Number.parseInt(targetValue),
          rewardGold: Number.parseInt(rewardGold) || 0,
          rewardXp: Number.parseInt(rewardXp) || 0,
          rewardGems: rewardGems ? Number.parseInt(rewardGems) : undefined,
          filterGameMode: filterGameMode !== "none" ? (filterGameMode as GameMode) : undefined,
          clearFilters: filterGameMode === "none" && !filterArchetype,
          isActive,
        })) as { message: string };
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quest");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!questDbId) {
      toast.error("Invalid quest ID");
      return;
    }
    setIsDeleting(true);
    try {
      const result = (await deleteQuest({ questDbId })) as {
        message: string;
      };
      toast.success(result.message);
      router.push("/quests");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete quest");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!questDbId) {
      toast.error("Invalid quest ID");
      return;
    }
    if (!duplicateQuestId.trim() || !duplicateName.trim()) {
      toast.error("Quest ID and name are required");
      return;
    }

    try {
      const result = (await duplicateQuest({
        questDbId,
        newQuestId: duplicateQuestId.trim(),
        newName: duplicateName.trim(),
      })) as { message: string; questDbId: string };
      toast.success(result.message);
      setDuplicateDialogOpen(false);
      router.push(`/quests/${result.questDbId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate quest");
    }
  };

  // Handle invalid quest ID parameter
  if (!isNew && !questDbId) {
    return (
      <PageWrapper title="Invalid Quest" description="Invalid quest ID">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Invalid Quest ID</Text>
            <Button asChild className="mt-4">
              <Link href="/quests">Back to Quests</Link>
            </Button>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  if (!isNew && existingQuest === undefined) {
    return (
      <PageWrapper title="Loading..." description="Loading quest data">
        <div className="flex justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageWrapper>
    );
  }

  if (!isNew && existingQuest === null) {
    return (
      <PageWrapper title="Not Found" description="Quest not found">
        <Card>
          <div className="text-center py-12">
            <Text className="text-lg font-semibold">Quest Not Found</Text>
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
      title={isNew ? "New Quest" : `Edit: ${existingQuest?.name}`}
      description={isNew ? "Create a new quest definition" : `Quest ID: ${existingQuest?.questId}`}
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
                      setDuplicateQuestId(`${questId}_copy`);
                      setDuplicateName(`${name} (Copy)`);
                    }}
                  >
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Duplicate Quest</AlertDialogTitle>
                    <AlertDialogDescription>
                      Create a copy of this quest with a new ID and name.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>New Quest ID</Label>
                      <Input
                        value={duplicateQuestId}
                        onChange={(e) => setDuplicateQuestId(e.target.value)}
                        placeholder="unique_quest_id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Name</Label>
                      <Input
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.target.value)}
                        placeholder="Quest Name"
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
                      <AlertDialogTitle>Delete Quest</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete "{existingQuest?.name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete Quest"}
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
                {isNew ? "Create Quest" : "Save Changes"}
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
                <Label>Quest ID *</Label>
                <Input
                  value={questId}
                  onChange={(e) => setQuestId(e.target.value)}
                  placeholder="daily_win_3"
                  disabled={!isNew}
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Win 3 Games"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Win 3 games in any mode"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Quest Type *</Label>
                <Select
                  value={questType}
                  onValueChange={(v) => setQuestType(v as QuestType)}
                  disabled={!isNew}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUEST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="3"
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Game Mode Filter</Label>
                <Select value={filterGameMode} onValueChange={setFilterGameMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any Game Mode</SelectItem>
                    {GAME_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Archetype Filter</Label>
                <Input
                  value={filterArchetype}
                  onChange={(e) => setFilterArchetype(e.target.value)}
                  placeholder="Any archetype"
                />
              </div>
            </div>
          </Card>

          {/* Rewards */}
          <Card>
            <Title>Rewards</Title>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Gold</Label>
                <Input
                  type="number"
                  value={rewardGold}
                  onChange={(e) => setRewardGold(e.target.value)}
                  placeholder="100"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>XP</Label>
                <Input
                  type="number"
                  value={rewardXp}
                  onChange={(e) => setRewardXp(e.target.value)}
                  placeholder="50"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Gems (optional)</Label>
                <Input
                  type="number"
                  value={rewardGems}
                  onChange={(e) => setRewardGems(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <Title>Status</Title>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <Text className="font-medium">Active</Text>
                <Text className="text-sm text-muted-foreground">
                  {isActive ? "Quest is available" : "Quest is hidden"}
                </Text>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </Card>

          <Card>
            <Title>Preview</Title>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <Text className="font-bold">{name || "Quest Name"}</Text>
                <Badge
                  color={
                    questType === "daily" ? "blue" : questType === "weekly" ? "violet" : "amber"
                  }
                  size="sm"
                >
                  {questType}
                </Badge>
              </div>
              <Text className="text-sm text-muted-foreground mb-3">
                {description || "No description"}
              </Text>
              <div className="text-sm">
                <Text className="font-medium">
                  {REQUIREMENT_TYPES.find((r) => r.value === requirementType)?.label ||
                    "Requirement"}
                  : {targetValue}
                </Text>
              </div>
              <div className="mt-3 pt-3 border-t flex gap-3 text-sm">
                {Number.parseInt(rewardGold) > 0 && (
                  <span className="text-amber-600">{rewardGold} Gold</span>
                )}
                {Number.parseInt(rewardXp) > 0 && <span>{rewardXp} XP</span>}
                {rewardGems && Number.parseInt(rewardGems) > 0 && (
                  <span className="text-violet-600">{rewardGems} Gems</span>
                )}
              </div>
            </div>
          </Card>

          {!isNew && (
            <Card>
              <Title>Metadata</Title>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <Text className="text-muted-foreground">Created</Text>
                  <Text>
                    {existingQuest?.createdAt
                      ? new Date(existingQuest.createdAt).toLocaleDateString()
                      : "-"}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-muted-foreground">Status</Text>
                  <Badge color={isActive ? "emerald" : "gray"} size="sm">
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
