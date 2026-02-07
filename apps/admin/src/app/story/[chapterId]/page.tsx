"use client";

/**
 * Chapter Detail/Editor Page
 *
 * Edit chapter info and manage stages within the chapter.
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Text } from "@tremor/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  PlusIcon,
  SaveIcon,
  SwordIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type Difficulty = "easy" | "medium" | "hard" | "boss";
type UnlockConditionType = "chapter_complete" | "player_level" | "none";

interface Stage {
  _id: string;
  chapterId: string;
  stageNumber: number;
  title: string;
  description: string;
  opponentName: string;
  difficulty: Difficulty;
  firstClearGold: number;
  repeatGold: number;
  firstClearGems?: number;
  status: "draft" | "published";
  cardRewardName?: string;
}

interface Chapter {
  _id: string;
  number: number;
  title: string;
  description: string;
  imageUrl?: string;
  status: "draft" | "published";
  unlockCondition?: {
    type: UnlockConditionType;
    requiredChapterId?: string;
    requiredLevel?: number;
  };
}

interface ChapterDataResult {
  chapter: Chapter;
}

interface StagesResult {
  stages: Stage[];
}

interface ChaptersResult {
  chapters: Chapter[];
}

// =============================================================================
// Constants
// =============================================================================

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: "Easy", color: "emerald" },
  medium: { label: "Medium", color: "amber" },
  hard: { label: "Hard", color: "red" },
  boss: { label: "Boss", color: "purple" },
};

// =============================================================================
// Create Stage Dialog
// =============================================================================

function CreateStageDialog({
  open,
  onOpenChange,
  chapterId,
  existingStages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  existingStages: Stage[];
}) {
  const [stageNumber, setStageNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentDeckArchetype, setOpponentDeckArchetype] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [firstClearGold, setFirstClearGold] = useState("100");
  const [repeatGold, setRepeatGold] = useState("25");
  const [firstClearGems, setFirstClearGems] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createStage = useConvexMutation(typedApi.admin.story.createStage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const args: {
        chapterId: Id<"storyChapters">;
        stageNumber: number;
        title: string;
        description: string;
        opponentName: string;
        difficulty: Difficulty;
        firstClearGold: number;
        repeatGold: number;
        opponentDeckArchetype?: string;
        firstClearGems?: number;
      } = {
        chapterId: chapterId as Id<"storyChapters">,
        stageNumber: Number.parseInt(stageNumber, 10),
        title,
        description,
        opponentName,
        difficulty,
        firstClearGold: Number.parseInt(firstClearGold, 10),
        repeatGold: Number.parseInt(repeatGold, 10),
      };

      if (opponentDeckArchetype) args.opponentDeckArchetype = opponentDeckArchetype;
      if (firstClearGems) args.firstClearGems = Number.parseInt(firstClearGems, 10);

      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect return type
      const result = (await createStage(args)) as unknown as { message: string };
      toast.success(result.message);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create stage");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStageNumber("");
    setTitle("");
    setDescription("");
    setOpponentName("");
    setOpponentDeckArchetype("");
    setDifficulty("easy");
    setFirstClearGold("100");
    setRepeatGold("25");
    setFirstClearGems("");
  };

  const suggestedNumber =
    existingStages.length > 0 ? Math.max(...existingStages.map((s) => s.stageNumber)) + 1 : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Stage</DialogTitle>
          <DialogDescription>Add a new stage to this chapter.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stageNumber">Stage Number</Label>
              <Input
                id="stageNumber"
                type="number"
                min="1"
                placeholder={suggestedNumber.toString()}
                value={stageNumber}
                onChange={(e) => setStageNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="First Challenge"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Stage description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opponentName">Opponent Name</Label>
              <Input
                id="opponentName"
                placeholder="Fire Mage"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="boss">Boss</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="archetype">Opponent Deck Archetype (optional)</Label>
            <Input
              id="archetype"
              placeholder="infernal_dragons"
              value={opponentDeckArchetype}
              onChange={(e) => setOpponentDeckArchetype(e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstClearGold">First Clear Gold</Label>
              <Input
                id="firstClearGold"
                type="number"
                min="0"
                value={firstClearGold}
                onChange={(e) => setFirstClearGold(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeatGold">Repeat Gold</Label>
              <Input
                id="repeatGold"
                type="number"
                min="0"
                value={repeatGold}
                onChange={(e) => setRepeatGold(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstClearGems">First Clear Gems</Label>
              <Input
                id="firstClearGems"
                type="number"
                min="0"
                placeholder="Optional"
                value={firstClearGems}
                onChange={(e) => setFirstClearGems(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Delete Chapter Dialog
// =============================================================================

function DeleteChapterDialog({
  open,
  onOpenChange,
  chapter,
  stageCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  stageCount: number;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const deleteChapter = useConvexMutation(typedApi.admin.story.deleteChapter);

  const handleDelete = async () => {
    if (!chapter) return;
    setIsDeleting(true);

    try {
      const result = (await deleteChapter({ chapterId: chapter._id as Id<"storyChapters"> })) as {
        message: string;
      };
      toast.success(result.message);
      router.push("/story");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete chapter");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Chapter</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete Chapter {chapter?.number}: &quot;{chapter?.title}&quot;?
            {stageCount > 0 && (
              <span className="block mt-2 text-amber-500">
                This will also delete {stageCount} stage{stageCount !== 1 ? "s" : ""}.
              </span>
            )}
            <span className="block mt-2 text-destructive">This action cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Chapter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ChapterDetailPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const { hasPermission } = useAdmin();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [unlockType, setUnlockType] = useState<UnlockConditionType>("none");
  const [requiredChapterId, setRequiredChapterId] = useState("");
  const [requiredLevel, setRequiredLevel] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [createStageDialogOpen, setCreateStageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Queries
  const chapterData = useConvexQuery(typedApi.admin.story.getChapter, {
    chapterId: chapterId as Id<"storyChapters">,
  }) as ChapterDataResult | undefined;
  const stagesResult = useConvexQuery(typedApi.admin.story.listStages, {
    chapterId: chapterId as Id<"storyChapters">,
    includeUnpublished: true,
  }) as StagesResult | undefined;
  const allChapters = useConvexQuery(typedApi.admin.story.listChapters, {
    includeUnpublished: true,
  }) as ChaptersResult | undefined;

  // Mutations
  const updateChapter = useConvexMutation(typedApi.admin.story.updateChapter);
  const publishChapter = useConvexMutation(typedApi.admin.story.publishChapter);
  const publishStage = useConvexMutation(typedApi.admin.story.publishStage);
  const reorderStages = useConvexMutation(typedApi.admin.story.reorderStages);

  const chapter = chapterData?.chapter as Chapter | undefined;
  const stages = (stagesResult?.stages || []) as Stage[];
  const otherChapters = ((allChapters?.chapters || []) as Chapter[]).filter(
    (c) => c._id !== chapterId
  );

  // Initialize form from chapter data
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setDescription(chapter.description);
      setImageUrl(chapter.imageUrl || "");
      setUnlockType(chapter.unlockCondition?.type || "none");
      setRequiredChapterId(chapter.unlockCondition?.requiredChapterId || "");
      setRequiredLevel(chapter.unlockCondition?.requiredLevel?.toString() || "");
      setHasChanges(false);
    }
  }, [chapter]);

  const handleFieldChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!chapter) return;
    setIsSaving(true);

    try {
      const args: {
        chapterId: Id<"storyChapters">;
        title?: string;
        description?: string;
        imageUrl?: string;
        clearUnlockCondition?: boolean;
        unlockConditionType?: UnlockConditionType;
        requiredChapterId?: Id<"storyChapters">;
        requiredLevel?: number;
      } = {
        chapterId: chapter._id as Id<"storyChapters">,
        title,
        description,
        imageUrl: imageUrl || undefined,
      };

      if (unlockType === "none") {
        args.clearUnlockCondition = true;
      } else {
        args.unlockConditionType = unlockType;
        if (unlockType === "chapter_complete" && requiredChapterId) {
          args.requiredChapterId = requiredChapterId as Id<"storyChapters">;
        }
        if (unlockType === "player_level" && requiredLevel) {
          args.requiredLevel = Number.parseInt(requiredLevel, 10);
        }
      }

      await updateChapter(args);
      toast.success("Chapter updated");
      setHasChanges(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update chapter");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!chapter) return;
    try {
      const result = (await publishChapter({
        chapterId: chapter._id as Id<"storyChapters">,
        publish: chapter.status === "draft",
      })) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update chapter");
    }
  };

  const handleToggleStagePublish = async (stage: Stage) => {
    try {
      const result = (await publishStage({
        stageId: stage._id as Id<"storyStages">,
        publish: stage.status === "draft",
      })) as { message: string };
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update stage");
    }
  };

  const handleMoveStageUp = async (stage: Stage) => {
    const currentIndex = stages.findIndex((s) => s._id === stage._id);
    if (currentIndex <= 0) return;

    const prevStage = stages[currentIndex - 1]!;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg types
      await (reorderStages as any)({
        stageId: stage._id as Id<"storyStages">,
        newStageNumber: prevStage.stageNumber,
      });
      toast.success("Stages reordered");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder");
    }
  };

  const handleMoveStageDown = async (stage: Stage) => {
    const currentIndex = stages.findIndex((s) => s._id === stage._id);
    if (currentIndex >= stages.length - 1) return;

    const nextStage = stages[currentIndex + 1]!;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: TypedAPI has incorrect arg types
      await (reorderStages as any)({
        stageId: stage._id as Id<"storyStages">,
        newStageNumber: nextStage.stageNumber,
      });
      toast.success("Stages reordered");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder");
    }
  };

  const isLoading = chapterData === undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!chapter) {
    return (
      <PageWrapper title="Chapter Not Found">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">This chapter does not exist.</p>
            <Button asChild>
              <Link href="/story">Back to Story</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`Chapter ${chapter.number}: ${chapter.title}`}
      description="Edit chapter details and manage stages"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/story">
              <ChevronLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <RoleGuard permission="config.edit">
            <Button variant="outline" onClick={handleTogglePublish}>
              {chapter.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </RoleGuard>
          <RoleGuard permission="config.edit">
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </RoleGuard>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chapter Info Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chapter Details</CardTitle>
              <CardDescription>Basic information about this chapter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chapter Number</Label>
                  <Input value={chapter.number} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center h-10">
                    <Badge variant={chapter.status === "published" ? "default" : "secondary"}>
                      {chapter.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleFieldChange(setTitle)(e.target.value)}
                  disabled={!hasPermission("config.edit")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => handleFieldChange(setDescription)(e.target.value)}
                  disabled={!hasPermission("config.edit")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => handleFieldChange(setImageUrl)(e.target.value)}
                  disabled={!hasPermission("config.edit")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unlock Condition</CardTitle>
              <CardDescription>When can players access this chapter?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Unlock Type</Label>
                <Select
                  value={unlockType}
                  onValueChange={(v) => {
                    setUnlockType(v as UnlockConditionType);
                    setHasChanges(true);
                  }}
                  disabled={!hasPermission("config.edit")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Always Available</SelectItem>
                    <SelectItem value="chapter_complete">Complete Previous Chapter</SelectItem>
                    <SelectItem value="player_level">Player Level Requirement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {unlockType === "chapter_complete" && (
                <div className="space-y-2">
                  <Label>Required Chapter</Label>
                  <Select
                    value={requiredChapterId}
                    onValueChange={(v) => {
                      setRequiredChapterId(v);
                      setHasChanges(true);
                    }}
                    disabled={!hasPermission("config.edit")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chapter..." />
                    </SelectTrigger>
                    <SelectContent>
                      {otherChapters.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          Chapter {c.number}: {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {unlockType === "player_level" && (
                <div className="space-y-2">
                  <Label htmlFor="requiredLevel">Required Level</Label>
                  <Input
                    id="requiredLevel"
                    type="number"
                    min="1"
                    value={requiredLevel}
                    onChange={(e) => {
                      setRequiredLevel(e.target.value);
                      setHasChanges(true);
                    }}
                    disabled={!hasPermission("config.edit")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Text className="text-muted-foreground">Total Stages</Text>
                <Text className="font-medium">{stages.length}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-muted-foreground">Published</Text>
                <Text className="font-medium text-emerald-500">
                  {stages.filter((s) => s.status === "published").length}
                </Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-muted-foreground">Drafts</Text>
                <Text className="font-medium text-amber-500">
                  {stages.filter((s) => s.status === "draft").length}
                </Text>
              </div>
            </CardContent>
          </Card>

          <RoleGuard permission="admin.manage">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete Chapter
                </Button>
              </CardContent>
            </Card>
          </RoleGuard>
        </div>
      </div>

      {/* Stages Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Stages</CardTitle>
            <CardDescription>Battles within this chapter</CardDescription>
          </div>
          <RoleGuard permission="config.edit">
            <Button onClick={() => setCreateStageDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
          </RoleGuard>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <SwordIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No stages yet. Add your first stage to this chapter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage._id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors ${
                    stage.status === "draft" ? "opacity-70 border-dashed" : ""
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => handleMoveStageUp(stage)}
                    >
                      <ArrowUpIcon className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === stages.length - 1}
                      onClick={() => handleMoveStageDown(stage)}
                    >
                      <ArrowDownIcon className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Stage number */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground font-bold">
                    {stage.stageNumber}
                  </div>

                  {/* Stage info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/story/${chapterId}/stage/${stage._id}`}
                      className="font-medium hover:underline text-primary"
                    >
                      {stage.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">vs. {stage.opponentName}</p>
                  </div>

                  {/* Difficulty */}
                  <Badge
                    variant="outline"
                    className={`min-w-[70px] justify-center border-${DIFFICULTY_CONFIG[stage.difficulty].color}-500 text-${DIFFICULTY_CONFIG[stage.difficulty].color}-500`}
                  >
                    {DIFFICULTY_CONFIG[stage.difficulty].label}
                  </Badge>

                  {/* Rewards */}
                  <div className="text-right text-sm">
                    <div>{stage.firstClearGold}g first</div>
                    <div className="text-muted-foreground">{stage.repeatGold}g repeat</div>
                  </div>

                  {/* Status */}
                  <Badge
                    variant={stage.status === "published" ? "default" : "secondary"}
                    className="min-w-[70px] justify-center"
                  >
                    {stage.status === "published" ? "Live" : "Draft"}
                  </Badge>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/story/${chapterId}/stage/${stage._id}`}>Edit</Link>
                    </Button>
                    <RoleGuard permission="config.edit">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStagePublish(stage)}
                      >
                        {stage.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                    </RoleGuard>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateStageDialog
        open={createStageDialogOpen}
        onOpenChange={setCreateStageDialogOpen}
        chapterId={chapterId}
        existingStages={stages}
      />

      <DeleteChapterDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        chapter={chapter}
        stageCount={stages.length}
      />
    </PageWrapper>
  );
}
