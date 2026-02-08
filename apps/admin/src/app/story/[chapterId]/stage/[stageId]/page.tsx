"use client";

/**
 * Stage Editor Page
 *
 * Edit stage details including dialogue, opponent configuration, and rewards.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard, useAdmin } from "@/contexts/AdminContext";
import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Text } from "@tremor/react";
import {
  ChevronLeftIcon,
  MessageSquareIcon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type Difficulty = "easy" | "medium" | "hard" | "boss";

interface DialogueLine {
  speaker: string;
  text: string;
  imageUrl?: string;
}

interface SimpleDialogueLine {
  speaker: string;
  text: string;
}

interface Stage {
  _id: string;
  chapterId: string;
  stageNumber: number;
  title: string;
  description: string;
  opponentName: string;
  opponentDeckId?: string;
  opponentDeckArchetype?: string;
  difficulty: Difficulty;
  preMatchDialogue?: DialogueLine[];
  postMatchWinDialogue?: SimpleDialogueLine[];
  postMatchLoseDialogue?: SimpleDialogueLine[];
  firstClearGold: number;
  repeatGold: number;
  firstClearGems?: number;
  cardRewardId?: string;
  status: "draft" | "published";
  createdAt: number;
  updatedAt: number;
}

interface Chapter {
  _id: string;
  number: number;
  title: string;
}

interface CardDefinition {
  _id: string;
  name: string;
  rarity: string;
}

// =============================================================================
// Dialogue Editor Component
// =============================================================================

function DialogueEditor({
  title,
  description,
  dialogue,
  onChange,
  includeImageUrl,
  disabled,
}: {
  title: string;
  description: string;
  dialogue: DialogueLine[] | SimpleDialogueLine[];
  onChange: (dialogue: DialogueLine[] | SimpleDialogueLine[]) => void;
  includeImageUrl?: boolean;
  disabled?: boolean;
}) {
  const addLine = () => {
    const newLine = includeImageUrl
      ? { speaker: "", text: "", imageUrl: "" }
      : { speaker: "", text: "" };
    onChange([...dialogue, newLine]);
  };

  const updateLine = (index: number, field: "speaker" | "text" | "imageUrl", value: string) => {
    const updated = [...dialogue] as unknown as Array<Record<string, string>>;
    const line = updated[index];
    if (line) {
      line[field] = value;
      onChange(updated as unknown as DialogueLine[] | SimpleDialogueLine[]);
    }
  };

  const removeLine = (index: number) => {
    const updated = dialogue.filter((_, i) => i !== index);
    onChange(updated);
  };

  const moveLine = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= dialogue.length) return;

    const updated = [...dialogue];
    const currentLine = updated[index];
    const targetLine = updated[newIndex];
    if (!currentLine || !targetLine) return;
    updated[index] = targetLine;
    updated[newIndex] = currentLine;
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareIcon className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dialogue.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
            <MessageSquareIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No dialogue lines yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dialogue.map((line, index) => {
              const lineBaseKey = `${line.speaker}|${line.text}|${"imageUrl" in line ? (line.imageUrl ?? "") : ""}`;
              return (
                <div key={lineBaseKey} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground font-mono">Line {index + 1}</span>
                  {!disabled && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => moveLine(index, "up")}
                      >
                        <span className="sr-only">Move up</span>
                        <span className="text-xs">^</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === dialogue.length - 1}
                        onClick={() => moveLine(index, "down")}
                      >
                        <span className="sr-only">Move down</span>
                        <span className="text-xs">v</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeLine(index)}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Speaker name"
                      value={line.speaker}
                      onChange={(e) => updateLine(index, "speaker", e.target.value)}
                      disabled={disabled}
                      className="text-sm"
                    />
                    {includeImageUrl && (
                      <Input
                        placeholder="Portrait URL (optional)"
                        value={(line as DialogueLine).imageUrl || ""}
                        onChange={(e) => updateLine(index, "imageUrl", e.target.value)}
                        disabled={disabled}
                        className="text-sm"
                      />
                    )}
                  </div>
                  <Textarea
                    placeholder="Dialogue text..."
                    value={line.text}
                    onChange={(e) => updateLine(index, "text", e.target.value)}
                    disabled={disabled}
                    className="text-sm min-h-[60px]"
                  />
                </div>
              </div>
              );
            })}
          </div>
        )}

        {!disabled && (
          <Button type="button" variant="outline" className="w-full" onClick={addLine}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Dialogue Line
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Delete Stage Dialog
// =============================================================================

function DeleteStageDialog({
  open,
  onOpenChange,
  stage,
  chapterId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  chapterId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const deleteStage = useConvexMutation(typedApi.admin.story.deleteStage);

  const handleDelete = async () => {
    if (!stage) return;
    setIsDeleting(true);

    try {
      const result = (await deleteStage({ stageId: stage._id as Id<"storyStages"> })) as {
        message: string;
      };
      toast.success(result.message);
      router.push(`/story/${chapterId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete stage");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Stage</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete Stage {stage?.stageNumber}: &quot;{stage?.title}&quot;?
            <span className="block mt-2 text-destructive">This action cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function StageEditorPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;
  const stageId = params.stageId as string;
  const { hasPermission } = useAdmin();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentDeckArchetype, setOpponentDeckArchetype] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [firstClearGold, setFirstClearGold] = useState("");
  const [repeatGold, setRepeatGold] = useState("");
  const [firstClearGems, setFirstClearGems] = useState("");
  const [cardRewardId, setCardRewardId] = useState("");
  const [preMatchDialogue, setPreMatchDialogue] = useState<DialogueLine[]>([]);
  const [postMatchWinDialogue, setPostMatchWinDialogue] = useState<SimpleDialogueLine[]>([]);
  const [postMatchLoseDialogue, setPostMatchLoseDialogue] = useState<SimpleDialogueLine[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Queries
  const stageData = useConvexQuery(typedApi.admin.story.getStage, {
    stageId: stageId as Id<"storyStages">,
  }) as { stage: Stage; chapter: Chapter } | null | undefined;

  // Get card definitions for reward selector
  const cardsResult = useConvexQuery(typedApi.admin.cards.listCards, {
    includeInactive: false,
  }) as { cards: CardDefinition[] } | undefined;

  // Mutations
  const updateStage = useConvexMutation(typedApi.admin.story.updateStage);
  const publishStage = useConvexMutation(typedApi.admin.story.publishStage);

  const stage = stageData?.stage as Stage | undefined;
  const chapter = stageData?.chapter as Chapter | undefined;
  const cards = (cardsResult?.cards || []) as CardDefinition[];

  // Initialize form from stage data
  useEffect(() => {
    if (stage) {
      setTitle(stage.title);
      setDescription(stage.description);
      setOpponentName(stage.opponentName);
      setOpponentDeckArchetype(stage.opponentDeckArchetype || "");
      setDifficulty(stage.difficulty);
      setFirstClearGold(stage.firstClearGold.toString());
      setRepeatGold(stage.repeatGold.toString());
      setFirstClearGems(stage.firstClearGems?.toString() || "");
      setCardRewardId(stage.cardRewardId || "");
      setPreMatchDialogue(stage.preMatchDialogue || []);
      setPostMatchWinDialogue(stage.postMatchWinDialogue || []);
      setPostMatchLoseDialogue(stage.postMatchLoseDialogue || []);
      setHasChanges(false);
    }
  }, [stage]);

  const handleFieldChange =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value);
      setHasChanges(true);
    };

  const handleSave = async () => {
    if (!stage) return;
    setIsSaving(true);

    try {
      const args: {
        stageId: Id<"storyStages">;
        title?: string;
        description?: string;
        opponentName?: string;
        difficulty?: Difficulty;
        firstClearGold?: number;
        repeatGold?: number;
        opponentDeckArchetype?: string;
        clearOpponentDeckArchetype?: boolean;
        firstClearGems?: number;
        cardRewardId?: Id<"cardDefinitions">;
        clearCardRewardId?: boolean;
        preMatchDialogue?: DialogueLine[];
        postMatchWinDialogue?: SimpleDialogueLine[];
        postMatchLoseDialogue?: SimpleDialogueLine[];
      } = {
        stageId: stage._id as Id<"storyStages">,
        title,
        description,
        opponentName,
        difficulty,
        firstClearGold: Number.parseInt(firstClearGold, 10),
        repeatGold: Number.parseInt(repeatGold, 10),
      };

      // Optional fields
      if (opponentDeckArchetype) {
        args.opponentDeckArchetype = opponentDeckArchetype;
      } else {
        args.clearOpponentDeckArchetype = true;
      }

      if (firstClearGems) {
        args.firstClearGems = Number.parseInt(firstClearGems, 10);
      }

      if (cardRewardId) {
        args.cardRewardId = cardRewardId as Id<"cardDefinitions">;
      } else {
        args.clearCardRewardId = true;
      }

      // Dialogue arrays
      if (preMatchDialogue.length > 0) {
        args.preMatchDialogue = preMatchDialogue;
      }
      if (postMatchWinDialogue.length > 0) {
        args.postMatchWinDialogue = postMatchWinDialogue;
      }
      if (postMatchLoseDialogue.length > 0) {
        args.postMatchLoseDialogue = postMatchLoseDialogue;
      }

      await updateStage(args);
      toast.success("Stage updated");
      setHasChanges(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update stage");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!stage) return;
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

  const isLoading = stageData === undefined;
  const canEdit = hasPermission("config.edit");

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

  if (!stage || !chapter) {
    return (
      <PageWrapper title="Stage Not Found">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">This stage does not exist.</p>
            <Button asChild>
              <Link href={`/story/${chapterId}`}>Back to Chapter</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`Stage ${stage.stageNumber}: ${stage.title}`}
      description={`Chapter ${chapter.number}: ${chapter.title}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/story/${chapterId}`}>
              <ChevronLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <RoleGuard permission="config.edit">
            <Button variant="outline" onClick={handleTogglePublish}>
              {stage.status === "published" ? "Unpublish" : "Publish"}
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
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="dialogue">Dialogue</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stage Information</CardTitle>
                  <CardDescription>Basic details about this stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stage Number</Label>
                      <Input value={stage.stageNumber} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center h-10">
                        <Badge variant={stage.status === "published" ? "default" : "secondary"}>
                          {stage.status === "published" ? "Published" : "Draft"}
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
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => handleFieldChange(setDescription)(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Opponent Configuration</CardTitle>
                  <CardDescription>Set up the AI opponent for this stage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opponentName">Opponent Name</Label>
                      <Input
                        id="opponentName"
                        value={opponentName}
                        onChange={(e) => handleFieldChange(setOpponentName)(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select
                        value={difficulty}
                        onValueChange={(v) => handleFieldChange(setDifficulty)(v as Difficulty)}
                        disabled={!canEdit}
                      >
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
                    <Label htmlFor="archetype">Deck Archetype</Label>
                    <Input
                      id="archetype"
                      placeholder="infernal_dragons, abyssal_horrors, etc."
                      value={opponentDeckArchetype}
                      onChange={(e) => handleFieldChange(setOpponentDeckArchetype)(e.target.value)}
                      disabled={!canEdit}
                    />
                    <p className="text-xs text-muted-foreground">
                      The AI will generate a deck based on this archetype.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rewards</CardTitle>
                  <CardDescription>Gold and gems awarded to players.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstClearGold">First Clear Gold</Label>
                    <Input
                      id="firstClearGold"
                      type="number"
                      min="0"
                      value={firstClearGold}
                      onChange={(e) => handleFieldChange(setFirstClearGold)(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repeatGold">Repeat Gold</Label>
                    <Input
                      id="repeatGold"
                      type="number"
                      min="0"
                      value={repeatGold}
                      onChange={(e) => handleFieldChange(setRepeatGold)(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstClearGems">First Clear Gems (optional)</Label>
                    <Input
                      id="firstClearGems"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={firstClearGems}
                      onChange={(e) => handleFieldChange(setFirstClearGems)(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Card Reward (optional)</Label>
                    <Select
                      value={cardRewardId}
                      onValueChange={(v) =>
                        handleFieldChange(setCardRewardId)(v === "none" ? "" : v)
                      }
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No card reward" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No card reward</SelectItem>
                        {cards.map((card) => (
                          <SelectItem key={card._id} value={card._id}>
                            {card.name} ({card.rarity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Guaranteed card on first clear.</p>
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
                      Delete Stage
                    </Button>
                  </CardContent>
                </Card>
              </RoleGuard>
            </div>
          </div>
        </TabsContent>

        {/* Dialogue Tab */}
        <TabsContent value="dialogue" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <DialogueEditor
              title="Pre-Match Dialogue"
              description="Dialogue shown before the battle starts."
              dialogue={preMatchDialogue}
              onChange={(d) => {
                setPreMatchDialogue(d as DialogueLine[]);
                setHasChanges(true);
              }}
              includeImageUrl
              disabled={!canEdit}
            />

            <div className="space-y-6">
              <DialogueEditor
                title="Victory Dialogue"
                description="Dialogue shown when the player wins."
                dialogue={postMatchWinDialogue}
                onChange={(d) => {
                  setPostMatchWinDialogue(d as SimpleDialogueLine[]);
                  setHasChanges(true);
                }}
                disabled={!canEdit}
              />

              <DialogueEditor
                title="Defeat Dialogue"
                description="Dialogue shown when the player loses."
                dialogue={postMatchLoseDialogue}
                onChange={(d) => {
                  setPostMatchLoseDialogue(d as SimpleDialogueLine[]);
                  setHasChanges(true);
                }}
                disabled={!canEdit}
              />
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Stage Preview</CardTitle>
              <CardDescription>How this stage will appear to players.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Stage Header */}
                <div className="text-center space-y-2 p-6 bg-gradient-to-b from-primary/10 to-transparent rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Chapter {chapter.number} - Stage {stage.stageNumber}
                  </div>
                  <h2 className="text-2xl font-bold">{title || "Untitled Stage"}</h2>
                  <p className="text-muted-foreground">{description || "No description"}</p>
                </div>

                {/* Opponent Info */}
                <div className="flex items-center justify-center gap-6 p-6 border rounded-lg">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-3xl">?</span>
                    </div>
                    <div className="font-semibold">{opponentName || "Opponent"}</div>
                    <Badge variant="outline" className="mt-1">
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Rewards Preview */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-500">{firstClearGold || 0}</div>
                    <div className="text-sm text-muted-foreground">First Clear Gold</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-500/70">{repeatGold || 0}</div>
                    <div className="text-sm text-muted-foreground">Repeat Gold</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">
                      {firstClearGems || "-"}
                    </div>
                    <div className="text-sm text-muted-foreground">First Clear Gems</div>
                  </div>
                </div>

                {/* Dialogue Preview */}
                {preMatchDialogue.length > 0 && (
                  <div className="space-y-2">
                    <Text className="font-medium">Pre-Match Dialogue Preview</Text>
                    <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                      {preMatchDialogue.slice(0, 3).map((line) => (
                        <div key={`${line.speaker}|${line.text}`} className="flex gap-3">
                          <div className="font-medium text-primary min-w-[80px]">
                            {line.speaker}:
                          </div>
                          <div className="text-muted-foreground">{line.text}</div>
                        </div>
                      ))}
                      {preMatchDialogue.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          + {preMatchDialogue.length - 3} more lines...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteStageDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        stage={stage}
        chapterId={chapterId}
      />
    </PageWrapper>
  );
}
