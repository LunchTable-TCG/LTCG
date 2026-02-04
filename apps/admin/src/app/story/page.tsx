"use client";

/**
 * Story Content Management Page
 *
 * List and manage story chapters with their stages.
 */

import { PageWrapper } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/contexts/AdminContext";
import { api, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import type { Id } from "@convex/_generated/dataModel";
import { Card, Text, Title } from "@tremor/react";
import { ArrowDownIcon, ArrowUpIcon, BookOpenIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

type ChapterStatus = "draft" | "published";
type UnlockConditionType = "chapter_complete" | "player_level" | "none";

interface Chapter {
  _id: string;
  number?: number;
  title: string;
  description?: string;
  imageUrl?: string;
  status: ChapterStatus;
  stageCount: number;
  publishedStageCount: number;
  unlockCondition?: {
    type: UnlockConditionType;
    requiredChapterId?: string;
    requiredLevel?: number;
  };
  createdAt?: number;
  updatedAt?: number;
}

// =============================================================================
// Create Chapter Dialog
// =============================================================================

function CreateChapterDialog({
  open,
  onOpenChange,
  chapters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapters: Chapter[];
}) {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [unlockType, setUnlockType] = useState<UnlockConditionType>("none");
  const [requiredChapterId, setRequiredChapterId] = useState("");
  const [requiredLevel, setRequiredLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createChapter = useConvexMutation(api.admin.story.createChapter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const args: {
        number: number;
        title: string;
        description: string;
        imageUrl?: string;
        unlockConditionType?: UnlockConditionType;
        requiredChapterId?: Id<"storyChapters">;
        requiredLevel?: number;
      } = {
        number: Number.parseInt(number, 10),
        title,
        description,
      };

      if (imageUrl) args.imageUrl = imageUrl;
      if (unlockType !== "none") {
        args.unlockConditionType = unlockType;
        if (unlockType === "chapter_complete" && requiredChapterId) {
          args.requiredChapterId = requiredChapterId as Id<"storyChapters">;
        }
        if (unlockType === "player_level" && requiredLevel) {
          args.requiredLevel = Number.parseInt(requiredLevel, 10);
        }
      }

      const result = (await createChapter(args)) as { message: string };
      toast.success(result.message);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create chapter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNumber("");
    setTitle("");
    setDescription("");
    setImageUrl("");
    setUnlockType("none");
    setRequiredChapterId("");
    setRequiredLevel("");
  };

  // Suggest next chapter number
  const suggestedNumber =
    chapters.length > 0 ? Math.max(...chapters.map((c) => c.number ?? 0)) + 1 : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Chapter</DialogTitle>
          <DialogDescription>Add a new chapter to the story campaign.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">Chapter Number</Label>
              <Input
                id="number"
                type="number"
                min="1"
                placeholder={suggestedNumber.toString()}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="The Beginning"
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
              placeholder="A brief description of this chapter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Unlock Condition</Label>
            <Select
              value={unlockType}
              onValueChange={(v) => setUnlockType(v as UnlockConditionType)}
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
              <Select value={requiredChapterId} onValueChange={setRequiredChapterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chapter..." />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter._id} value={chapter._id}>
                      Chapter {chapter.number}: {chapter.title}
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
                placeholder="5"
                value={requiredLevel}
                onChange={(e) => setRequiredLevel(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Chapter"}
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

export default function StoryPage() {
  const [showUnpublished, setShowUnpublished] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const chaptersResult = useConvexQuery(api.admin.story.listChapters, {
    includeUnpublished: showUnpublished,
  });

  const stats = useConvexQuery(api.admin.story.getChapterStats, {});

  const publishChapter = useConvexMutation(api.admin.story.publishChapter);
  const reorderChapters = useConvexMutation(api.admin.story.reorderChapters);

  const handleTogglePublish = async (chapter: Chapter) => {
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

  const handleMoveUp = async (chapter: Chapter) => {
    const chapters = chaptersResult?.chapters || [];
    const currentIndex = chapters.findIndex((c) => c._id === chapter._id);
    if (currentIndex <= 0) return;

    const prevChapter = chapters[currentIndex - 1];
    try {
      await reorderChapters({
        chapterId: chapter._id as Id<"storyChapters">,
        newNumber: prevChapter?.number ?? 1,
      });
      toast.success("Chapters reordered");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder");
    }
  };

  const handleMoveDown = async (chapter: Chapter) => {
    const chapters = chaptersResult?.chapters || [];
    const currentIndex = chapters.findIndex((c) => c._id === chapter._id);
    if (currentIndex >= chapters.length - 1) return;

    const nextChapter = chapters[currentIndex + 1];
    try {
      await reorderChapters({
        chapterId: chapter._id as Id<"storyChapters">,
        newNumber: nextChapter?.number ?? 1,
      });
      toast.success("Chapters reordered");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reorder");
    }
  };

  const isLoading = chaptersResult === undefined;
  const chapters = (chaptersResult?.chapters || []) as Chapter[];

  return (
    <PageWrapper
      title="Story Content"
      description="Manage campaign chapters and stages"
      actions={
        <RoleGuard permission="config.edit">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Chapter
          </Button>
        </RoleGuard>
      }
    >
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold">{stats?.totalChapters ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Chapters</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-emerald-500">
              {stats?.publishedChapters ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Published</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-amber-500">
              {stats?.draftChapters ?? "..."}
            </Text>
            <Text className="text-sm text-muted-foreground">Drafts</Text>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <Text className="text-2xl font-bold text-blue-500">{stats?.totalStages ?? "..."}</Text>
            <Text className="text-sm text-muted-foreground">Total Stages</Text>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-4">
          <Switch checked={showUnpublished} onCheckedChange={setShowUnpublished} />
          <Text className="text-sm">Show Drafts</Text>
        </div>
      </Card>

      {/* Chapter List */}
      <Card>
        <Title className="mb-4">Chapters ({chaptersResult?.totalCount ?? 0})</Title>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <BookOpenIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No chapters yet. Create your first chapter to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((chapter, index) => (
              <div
                key={chapter._id}
                className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors ${
                  chapter.status === "draft" ? "opacity-70 border-dashed" : ""
                }`}
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(chapter)}
                  >
                    <ArrowUpIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === chapters.length - 1}
                    onClick={() => handleMoveDown(chapter)}
                  >
                    <ArrowDownIcon className="h-3 w-3" />
                  </Button>
                </div>

                {/* Chapter number */}
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
                  {chapter.number}
                </div>

                {/* Chapter info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/story/${chapter._id}`}
                    className="font-medium hover:underline text-primary"
                  >
                    {chapter.title}
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {chapter.description}
                  </p>
                </div>

                {/* Stage count */}
                <div className="text-center px-4">
                  <Text className="font-medium">
                    {chapter.publishedStageCount}/{chapter.stageCount}
                  </Text>
                  <Text className="text-xs text-muted-foreground">Stages</Text>
                </div>

                {/* Status badge */}
                <Badge
                  variant={chapter.status === "published" ? "default" : "secondary"}
                  className="min-w-[80px] justify-center"
                >
                  {chapter.status === "published" ? "Published" : "Draft"}
                </Badge>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/story/${chapter._id}`}>Edit</Link>
                  </Button>
                  <RoleGuard permission="config.edit">
                    <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(chapter)}>
                      {chapter.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                  </RoleGuard>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CreateChapterDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        chapters={chapters}
      />
    </PageWrapper>
  );
}
